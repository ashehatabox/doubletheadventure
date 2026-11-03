// Crawls every page in the sitemap and checks links, images, headings, titles and basic accessibility.
// Usage: node scripts/audit-site.js   (starts its own server on port 3990)
process.env.PORT = '3990';
const http = require('http');
const get = (p) => new Promise((res) => http.get({ port: 3990, path: p, headers: { 'accept-language': 'en' } }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', () => res({ status: 0, body: '' })));
const app = require('../app.js');
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  const sm = (await get('/sitemap.xml')).body;
  const paths = [...sm.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  const seen = new Map();
  const problems = [];
  const bad = (p, m) => problems.push(p + ': ' + m);
  const titles = {};
  for (const p of paths) {
    const r = await get(p);
    if (r.status !== 200) { bad(p, 'status ' + r.status); continue; }
    const h = r.body;
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
    if (!title) bad(p, 'no title'); else (titles[title] = titles[title] || []).push(p);
    if (!/<meta name="description" content="[^"]{30,}/.test(h)) bad(p, 'description missing or short');
    if (!/<html[^>]* lang="/.test(h)) bad(p, 'no html lang');
    if ((h.match(/<h1[\s>]/g) || []).length !== 1) bad(p, 'h1 count ' + (h.match(/<h1[\s>]/g) || []).length);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt=/.test(m[0])) bad(p, 'img without alt: ' + m[0].slice(0, 80));
      if (!/\bwidth=/.test(m[0]) && !/\bstyle=|class=/.test(m[0])) bad(p, 'img without size: ' + m[0].slice(0, 80));
    }
    for (const m of h.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const inner = m[2].replace(/<[^>]*>/g, '').trim();
      if (!inner && !/aria-label=|<img[^>]*alt="[^"]+"/.test(m[0])) bad(p, 'empty ' + m[1] + ': ' + m[0].slice(0, 90));
    }
    for (const m of h.matchAll(/<input\b[^>]*>/g)) {
      if (/type="(hidden|submit|checkbox)"/.test(m[0])) continue;
      const id = (m[0].match(/id="([^"]+)"/) || [])[1];
      if (!/aria-label=/.test(m[0]) && !(id && new RegExp('for="' + id + '"').test(h))) bad(p, 'input without label: ' + m[0].slice(0, 80));
    }
    for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
      const link = m[1];
      if (/\.(png|jpg|jpeg|svg|css|js|ico|xml|txt|webp)$/.test(link)) continue;
      if (!seen.has(link)) seen.set(link, p);
    }
  }
  for (const [link, from] of seen) {
    const r = await get(link);
    if (r.status >= 400 || r.status === 0) bad(from, `broken link ${link} (${r.status})`);
  }
  for (const [t, ps] of Object.entries(titles)) if (ps.length > 1 && !ps.every((x) => /^\/(fr\/)?(play\/(color|jigsaw))/.test(x))) bad(ps.join(', '), 'same title: ' + t);
  console.log(`Audited ${paths.length} pages, ${seen.size} links.`);
  const groups = {};
  problems.forEach((x) => { const k = x.replace(/^[^:]*: /, '').replace(/src="[^"]*"/, 'src=…').slice(0, 100); (groups[k] = groups[k] || []).push(x.split(': ')[0]); });
  Object.entries(groups).forEach(([k, v]) => console.log(`${v.length}x ${k}  e.g. ${[...new Set(v)].slice(0, 3).join(', ')}`));
  console.log(problems.length ? '' : 'No problems found.');
  process.exit(problems.length ? 1 : 0);
  console.log(problems.length ? problems.slice(0, 60).join('\n') + (problems.length > 60 ? `\n... and ${problems.length - 60} more` : '') : 'No problems found.');
  process.exit(problems.length ? 1 : 0);
})();
