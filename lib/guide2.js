// Guide 2.0: the full teaching guide for a book, written by hand in content/guides/<slug>.json (en + fr, family letter in 5 languages).
// Books without a file keep the short guide built by lib/guides.js.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'content', 'guides');
const cache = {};

function load(slug) {
  if (slug in cache) return cache[slug];
  const f = path.join(DIR, slug + '.json');
  let d = null;
  if (/^[a-z0-9-]+$/.test(slug) && fs.existsSync(f)) {
    try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { d = null; }
  }
  return (cache[slug] = d);
}

// The guide in the page language, falling back to English (fallback: true tells the page to mark it lang="en").
function get(slug, lang) {
  const d = load(slug);
  if (!d || !d.en) return null;
  const own = d[lang];
  return { ...(own || d.en), fallback: !own, frames: d.frames || [], letter: d.letter || {} };
}

module.exports = { get };
