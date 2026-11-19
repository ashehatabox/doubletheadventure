#!/usr/bin/env node
// Puts a book's French text into the reviewer area (/review).
//   node scripts/add-review-book.js <slug> <translations.json> [--lang fr]
// Reads the translations file from the Kids books project (any of its shapes), matches each line to a reader
// page (content/reader/<slug>/manifest.json) by its English text, and writes content/review/<slug>.json:
//   { slug, lang, pages: { p03: { en: "...", text: ["French line", ...] }, ... }, unplaced: [...] }
// A line with no English is placed by reading order (lengths), and the output says so: check it on /review.
const fs = require('fs');
const path = require('path');

const [slug, file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const langArg = process.argv.indexOf('--lang');
const LANG = langArg > 0 ? process.argv[langArg + 1] : 'fr';
if (!slug || !file) {
  console.error('Usage: node scripts/add-review-book.js <slug> <translations.json> [--lang fr]');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'reader', slug, 'manifest.json'), 'utf8'));
const enPages = (manifest.languages.en || {}).text || {};
const order = manifest.spreads.flat().filter((p) => /^p\d{2}$/.test(p));
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Keys that are covers, credits and brand lines, not story pages.
const SKIP = /^(foreword|preface|title|subtitle|tagline|tagline_cover|brand|brand_pub|brand_name|brand_tagline|publisher|publisher_brand|publisher_paragraph|authors|author|illustrat|credits|print_cover|kindle_cover|cover|covers|back_cover|blurb|website|corrections|kindle_ebook|print_book|spine|p0?2_authors|p0?2_credits)/i;

// ---------- Every shape of translations file -> [{ key, en, fr }] in reading order ----------
function flatten(obj, prefix, out) {
  if (obj == null) return out;
  if (typeof obj === 'string') { out.push([prefix, obj]); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => flatten(v, prefix + '.' + i, out)); return out; }
  if (typeof obj === 'object') Object.keys(obj).forEach((k) => flatten(obj[k], prefix ? prefix + '.' + k : k, out));
  return out;
}
function pairsFromDicts(en, fr) {
  const fl = flatten(fr, '', []);
  const enMap = new Map(flatten(en || {}, '', []));
  return fl.map(([k, v]) => ({ key: k, en: enMap.get(k) || '', fr: v }));
}
function pairs() {
  if (Array.isArray(data.strings)) return data.strings.map((s) => ({ key: s.id || s.key, en: s.en || '', fr: s[LANG] || '' }));
  if (data.en && data[LANG]) {
    const keys = data.keys_order || Object.keys(data[LANG]);
    return keys.map((k) => ({ key: k, en: typeof data.en[k] === 'string' ? data.en[k] : '', fr: typeof data[LANG][k] === 'string' ? data[LANG][k] : '' }));
  }
  if (data.languages && data.languages[LANG]) {
    const en = data.languages.en || data.english || null;
    return pairsFromDicts(en, data.languages[LANG]);
  }
  throw new Error('Unknown translations shape');
}

const all = pairs().filter((p) => p.fr && p.fr.trim());
const story = all.filter((p) => !SKIP.test(p.key.split('.').pop()) && !SKIP.test(p.key.split('.')[0]) && !/^(Publishing|Double the Adventure\.*|Pr\u00e9face\s*:.*)$/i.test(p.fr.trim()));

// ---------- Matching ----------
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2);
function score(en, pageText) {
  const a = words(en);
  if (!a.length) return 0;
  const b = new Set(words(pageText));
  return a.filter((w) => b.has(w)).length / a.length;
}

const placed = []; // { idx, page, how }
let cursor = 0; // pages are in reading order: never match backwards by more than one page
story.forEach((p, idx) => {
  if (!p.en) return;
  let best = null;
  order.forEach((pg, i) => {
    const s = score(p.en, enPages[pg] || '');
    const penalty = i < cursor - 1 ? 0.25 : 0;
    if (s - penalty > 0.5 && (!best || s - penalty > best.s)) best = { pg, i, s: s - penalty };
  });
  if (best) { placed.push({ idx, page: best.pg, how: 'english' }); cursor = best.i; }
});

// Lines without English: a key that names a page (p2_note, p02...) goes there.
const textPages = order.filter((pg) => (enPages[pg] || '').trim());
story.forEach((p, idx) => {
  if (placed.some((x) => x.idx === idx) || p.en && words(p.en).length > 3 && !/^p0?\d/.test(p.key)) return;
  const m = String(p.key).match(/^p0?(\d{1,2})(?:[_.].*)?$/);
  const pg = m && 'p' + String(m[1]).padStart(2, '0');
  if (pg && order.includes(pg) && p.en) placed.push({ idx, page: pg, how: 'key' });
});

// A book with no English per line (Book 2): line up the French lines with the English pages in reading order,
// each page getting one or more consecutive lines, choosing the split whose lengths and quote marks fit best.
const left = story.map((p, i) => i).filter((i) => !placed.some((x) => x.idx === i));
if (left.length && placed.length === 0) {
  const pages = textPages;
  const fr = left.map((i) => story[i].fr);
  const quotes = (t) => (t.match(/[«“"]/g) || []).length > 0;
  const n = fr.length, m = pages.length;
  const cost = (a, b, j) => { // French lines a..b-1 on page j
    const f = fr.slice(a, b).join(' ');
    const e = enPages[pages[j]] || '';
    const r = Math.abs(Math.log((f.length + 10) / (1.12 * e.length + 10)));
    return r + (quotes(f) !== quotes(e) ? 0.6 : 0) + 0.15 * (b - a - 1);
  };
  const INF = 1e9;
  const D = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(INF));
  const B = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(-1));
  D[0][0] = 0;
  for (let j = 1; j <= m; j++) for (let b = 0; b <= n; b++) {
    if (D[j - 1][b] + 1.2 < D[j][b]) { D[j][b] = D[j - 1][b] + 1.2; B[j][b] = b; } // page left without French
    for (let a = Math.max(0, b - 3); a < b; a++) {
      const c = D[j - 1][a] + cost(a, b, j - 1);
      if (c < D[j][b]) { D[j][b] = c; B[j][b] = a; }
    }
  }
  let b = n;
  for (let j = m; j > 0; j--) {
    const a = B[j][b];
    for (let k = a; k < b; k++) placed.push({ idx: left[k], page: pages[j - 1], how: 'order' });
    b = a;
  }
}

// ---------- Write ----------
const titleLine = all.find((p) => /(^|\.)title$/.test(p.key));
const out = { slug, lang: LANG, title: titleLine ? titleLine.fr.trim() : (data.title && data.title[LANG]) || '', source: path.basename(file), pages: {}, unplaced: [] };
placed.sort((a, b) => a.idx - b.idx).forEach((x) => {
  const pg = (out.pages[x.page] = out.pages[x.page] || { en: enPages[x.page] || '', text: [], placedBy: x.how });
  pg.text.push(story[x.idx].fr.trim());
  if (x.how === 'order') pg.placedBy = 'order';
});
story.forEach((p, i) => { if (!placed.some((x) => x.idx === i)) out.unplaced.push(p.fr); });
const ordered = {};
order.forEach((pg) => { if (out.pages[pg]) ordered[pg] = out.pages[pg]; });
out.pages = ordered;

fs.mkdirSync(path.join(ROOT, 'content', 'review'), { recursive: true });
const dest = path.join(ROOT, 'content', 'review', `${slug}.json`);
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
const byOrder = Object.values(ordered).filter((p) => p.placedBy === 'order').length;
const empty = textPages.filter((pg) => !ordered[pg]);
console.log(`${slug}: ${Object.keys(ordered).length} pages, ${story.length} lines` +
  (byOrder ? `, ${byOrder} pages placed by reading order` : '') +
  (empty.length ? `, English pages with no French: ${empty.join(' ')}` : '') +
  (out.unplaced.length ? `, ${out.unplaced.length} lines not placed` : ''));
