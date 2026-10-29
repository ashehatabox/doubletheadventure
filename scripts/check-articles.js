// Checks every article in content/articles before it ships. Run: node scripts/check-articles.js
// Fails (exit 1) on a broken header, unknown topic or book, a bad date, a too-short article or a dead site link.
const fs = require('fs');
const path = require('path');
const catalog = require('../data/books');

const ROOT = path.join(__dirname, '..', 'content', 'articles');
const TOPICS = ['philosophy', 'values', 'cultures', 'animals', 'nature', 'feelings', 'activities', 'reading', 'classroom'];
const PAGES = ['/', '/books', '/books/coming', '/books/review-team', '/shop', '/play', '/play/memory', '/parents', '/parents/articles', '/educators', '/educators/teachers', '/educators/early-years', '/educators/libraries', '/educators/newcomers', '/partners', '/about', '/contact', '/faq', '/values-map'];
const MIN_WORDS = 800;

let errors = 0;
const bad = (file, msg) => { errors++; console.log(`FAIL ${file}: ${msg}`); };
const slugs = {};
for (const lang of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, lang);
  if (!fs.statSync(dir).isDirectory()) continue;
  slugs[lang] = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
}
// Only published articles can be linked to (a draft is a 404 on the live site).
const allSlugs = new Set(Object.entries(slugs).flatMap(([lang, list]) =>
  list.filter((s) => !/^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(ROOT, lang, s + '.md'), 'utf8').split(/\r?\n---/)[0]))));

for (const [lang, list] of Object.entries(slugs)) {
  for (const slug of list) {
    const file = `${lang}/${slug}.md`;
    const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) { bad(file, 'missing --- header'); continue; }
    const meta = {};
    m[1].split(/\r?\n/).forEach((l) => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) bad(file, 'file name must be lowercase words joined by hyphens');
    if (!meta.title) bad(file, 'no title');
    if (!meta.description || meta.description.length < 60 || meta.description.length > 200) bad(file, 'description should be 60–200 characters');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date || '')) bad(file, 'date must be YYYY-MM-DD');
    if (!TOPICS.includes(meta.topic)) bad(file, `topic must be one of ${TOPICS.join(', ')}`);
    (meta.books || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((b) => { if (!catalog.get(b)) bad(file, `unknown book "${b}"`); });
    if (lang === 'fr' && !slugs.en.includes(slug)) bad(file, 'French article has no English twin with the same file name');
    if (lang === 'fr' && slugs.en.includes(slug)) {
      const en = fs.readFileSync(path.join(ROOT, 'en', slug + '.md'), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      const get = (txt, k) => ((txt.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1] || '').trim();
      ['topic', 'books', 'date'].forEach((k) => { if (get(en, k) !== (meta[k] || '')) bad(file, `${k} must match the English article`); });
      const faq = (t) => (t.match(/^### /gm) || []).length;
      const enBody = fs.readFileSync(path.join(ROOT, 'en', slug + '.md'), 'utf8');
      if (faq(enBody) !== faq(m[2])) bad(file, 'number of ### headings differs from the English article');
    }
    const body = m[2];
    if (/^# /m.test(body)) bad(file, 'no "# " title in the text (the page shows the title)');
    const words = body.split(/\s+/).filter(Boolean).length;
    if (words < MIN_WORDS) bad(file, `only ${words} words (at least ${MIN_WORDS})`);
    // Site links must go somewhere real.
    for (const [, href] of body.matchAll(/\]\((\/[^)\s#?]*)[^)]*\)/g)) {
      const p = href.replace(/^\/fr(?=\/|$)/, '') || '/';
      const ok = PAGES.includes(p) || (p.startsWith('/books/') && catalog.get(p.slice(7))) ||
        (p.startsWith('/parents/articles/') && allSlugs.has(p.slice(18))) || /^\/play\/(color|jigsaw)\/[a-z0-9-]+$/.test(p);
      if (!ok) bad(file, `dead site link ${href}`);
    }
  }
}
console.log(errors ? `\n${errors} problem(s) in articles.` : `Articles OK (${Object.values(slugs).flat().length} files).`);
process.exit(errors ? 1 : 0);
