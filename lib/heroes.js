// Hero guides ("Heroes Encyclopedia"): one JSON file per book in data/heroes/<book-slug>.json.
// Every fact names its sources by id; check() makes sure each id exists, so a page can never show a fact without a source.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'heroes');
const IMG = path.join(__dirname, '..', 'public', 'images', 'heroes');
const KINDS = ['wow', 'ha', 'uhoh', 'hidden', 'rescue'];

function load() {
  if (!fs.existsSync(DIR)) return {};
  const out = {};
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.json'))) {
    const g = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    out[g.book] = g;
  }
  return out;
}

const guides = load();

// Image path for a guide picture, or '' when the file isn't there yet (the page then shows a coloured placeholder).
function image(book, file) {
  if (!file) return '';
  return fs.existsSync(path.join(IMG, book, file)) ? `/images/heroes/${book}/${file}` : '';
}

// Problems in one guide, as plain sentences. Used by scripts/check-heroes.js.
function check(g) {
  const errors = [];
  const ids = new Set(Object.keys(g.sources || {}));
  const need = (where, src, optional) => {
    if (!src || !src.length) { if (!optional) errors.push(`${where}: no source`); return; }
    src.forEach((s) => { if (!ids.has(s)) errors.push(`${where}: unknown source "${s}"`); });
  };
  (g.place && g.place.facts || []).forEach((f, i) => {
    if (!KINDS.includes(f.kind)) errors.push(`place.facts[${i}]: unknown kind "${f.kind}"`);
    need(`place.facts[${i}]`, f.src);
  });
  (g.cast || []).forEach((c) => {
    (c.card || []).forEach((r, i) => need(`${c.id}.card[${i}] ${r.label.en}`, r.src, r.plain === true));
    (c.life || []).forEach((r, i) => need(`${c.id}.life[${i}]`, r.src));
    (c.facts || []).forEach((f, i) => {
      if (!KINDS.includes(f.kind)) errors.push(`${c.id}.facts[${i}]: unknown kind "${f.kind}"`);
      need(`${c.id}.facts[${i}]`, f.src);
    });
    if (!c.lineup || !c.lineup.grams) errors.push(`${c.id}: lineup.grams missing`);
    if (c.photo) {
      // Real photo of the animal (free Pexels photo, credited on the card).
      if (!c.photo.file || !c.photo.pexels) errors.push(`${c.id}.photo: needs file and pexels id`);
      if (!c.photo.caption || !c.photo.caption.en) errors.push(`${c.id}.photo: caption.en missing`);
      if (c.photo.file && g.book && !fs.existsSync(path.join(IMG, g.book, c.photo.file))) errors.push(`${c.id}.photo: ${c.photo.file} not found`);
    }
  });
  (g.faq || []).forEach((f, i) => need(`faq[${i}]`, f.src, true));
  return errors;
}

function get(book) { return guides[book] || null; }
function list() { return Object.values(guides); }
function published() { return list().filter((g) => !g.draft).map((g) => g.book); }

module.exports = { get, list, published, image, check, KINDS };
