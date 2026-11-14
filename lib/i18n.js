// Text and links per language. English lives at /, French at /fr/.
const fs = require('fs');
const path = require('path');
const catalog = require('../data/books');

const locales = { en: require('../locales/en'), fr: require('../locales/fr') };
const LANGS = Object.keys(locales);

function lookup(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Builds the helpers every view gets for one language.
function helpers(lang) {
  // Live counts from the book data fill {total}, {out}, {finished}, {planned} and {languages} in any text,
  // so no page ever hard-codes how many books there are.
  const counts = { ...catalog.counts(), videos: require('./readalouds').slugs().filter((sl) => catalog.get(sl)).length };
  const fill = (v) => {
    if (typeof v === 'string') return v.replace(/\{(total|out|finished|planned|languages|videos)\}/g, (m, k) => counts[k]);
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  const t = (key) => {
    const v = lookup(locales[lang], key);
    return fill(v === undefined ? lookup(locales.en, key) : v);
  };
  // t() with extra {name} values: tf('x.y', { n: 3 }).
  const tf = (key, vars = {}) => String(t(key)).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  // A path in this language: url('/books') → '/fr/books' in French.
  const url = (p = '/') => (lang === 'en' ? p : '/' + lang + (p === '/' ? '/' : p));
  // Picks this language's version of a { en, fr } field, falling back to English.
  const pick = (field) => (field ? field[lang] || field.en || '' : '');
  // True when a { en, fr } field has no text in this language (the view marks it lang="en").
  const isFallback = (field) => Boolean(field && !field[lang] && field.en && lang !== 'en');
  const bookTitle = (b) => pick(b.title);
  const valueLabel = (b) => pick(catalog.values[b.value]);
  const momentLabel = (m) => pick(catalog.moments[m]);
  const cultureLabel = (b) => (b.culture ? pick(catalog.cultures[b.culture]) : '');
  const langName = (code) => pick(catalog.languageNames[code]);
  return { lang, t, tf, counts, url, pick, isFallback, bookTitle, valueLabel, momentLabel, cultureLabel, langName };
}

// Cover and spread files found on disk at start-up.
const IMG = path.join(__dirname, '..', 'public', 'images', 'books');
function bookImage(slug, kind) {
  const file = path.join(IMG, slug, kind + '.jpg');
  return fs.existsSync(file) ? `/images/books/${slug}/${kind}.jpg` : '';
}

// Small cover (360 px) if there is one, for srcset on list pages.
function coverSmall(slug) {
  return fs.existsSync(path.join(IMG, slug, 'cover-sm.jpg')) ? `/images/books/${slug}/cover-sm.jpg` : '';
}

module.exports = { helpers, LANGS, bookImage, coverSmall };
