const data = require('../data/readalouds');
const LANG_ORDER = ['en', 'fr', 'es', 'de', 'it'];
const LABELS = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', it: 'Italiano' };

// All read-aloud videos for a book, the visitor's language first.
function forBook(slug, lang) {
  const entry = data[slug];
  if (!entry) return [];
  return LANG_ORDER.filter((l) => entry[l] && (entry[l].youtube || entry[l].file))
    .map((l) => ({ lang: l, label: LABELS[l], minutes: entry[l].minutes || null,
      youtube: /^[\w-]{11}$/.test(entry[l].youtube || '') ? entry[l].youtube : null,
      file: /^\/video\/[\w.-]+\.mp4$/.test(entry[l].file || '') ? entry[l].file : null }))
    .filter((v) => v.youtube || v.file)
    .sort((a, b) => (a.lang === lang ? -1 : b.lang === lang ? 1 : 0));
}
const slugs = () => Object.keys(data).filter((s) => forBook(s, 'en').length);
module.exports = { forBook, slugs };
