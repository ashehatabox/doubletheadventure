// "Buy on Amazon" links: the right store for the visitor, with the Associates tag if one is set.

const STORES = {
  ca: { host: 'www.amazon.ca', label: 'Amazon.ca', tag: () => process.env.AMAZON_TAG_CA },
  com: { host: 'www.amazon.com', label: 'Amazon.com', tag: () => process.env.AMAZON_TAG_COM },
  uk: { host: 'www.amazon.co.uk', label: 'Amazon.co.uk', tag: () => process.env.AMAZON_TAG_UK },
  fr: { host: 'www.amazon.fr', label: 'Amazon.fr', tag: () => process.env.AMAZON_TAG_FR },
  de: { host: 'www.amazon.de', label: 'Amazon.de', tag: () => process.env.AMAZON_TAG_DE },
  es: { host: 'www.amazon.es', label: 'Amazon.es', tag: () => process.env.AMAZON_TAG_ES },
  it: { host: 'www.amazon.it', label: 'Amazon.it', tag: () => process.env.AMAZON_TAG_IT }
};

// Region from the browser's language, e.g. "fr-CA" → ca, "en-US" → com. Canada first.
function storeFor(acceptLanguage, lang) {
  const first = String(acceptLanguage || '').split(',')[0].trim().toLowerCase();
  const region = (first.split('-')[1] || '').slice(0, 2);
  const byRegion = { ca: 'ca', us: 'com', gb: 'uk', fr: 'fr', be: 'fr', ch: 'de', de: 'de', at: 'de', es: 'es', mx: 'com', it: 'it', au: 'com', nz: 'com' };
  if (byRegion[region]) return byRegion[region];
  return 'ca';
}

function link(book, title, store) {
  const s = STORES[store] || STORES.ca;
  let href = book.amazon && book.amazon[store];
  if (!href) href = `https://${s.host}/s?k=${encodeURIComponent(title + ' Amr Mohamed')}&i=stripbooks`;
  const tag = s.tag();
  if (tag) href += (href.includes('?') ? '&' : '?') + 'tag=' + encodeURIComponent(tag);
  return href;
}

function tagged(href, store) {
  const s = STORES[store];
  const tag = s && s.tag();
  return tag ? href + (href.includes('?') ? '&' : '?') + 'tag=' + encodeURIComponent(tag) : href;
}

// Kindle link in the visitor's store, or null when the book has no Kindle edition.
function kindleLink(book, store) {
  const href = book.kindle && (book.kindle[store] || book.kindle.ca);
  return href ? tagged(href, STORES[store] ? store : 'ca') : null;
}

// Each edition's name in its own language, for "Also on Amazon in".
const NATIVE = { en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', it: 'Italiano', sv: 'Svenska' };

// Other language editions that are live on Amazon, each with its own Paperback/Kindle links.
// They open in the visitor's store, unless the edition is only sold on one store (host, e.g. 'se').
function editions(book, store) {
  const key = STORES[store] ? store : 'ca';
  return (book.editions || []).map((e) => {
    const host = e.host ? 'www.amazon.' + e.host : STORES[key].host;
    const make = (asin) => (asin ? (e.host ? `https://${host}/dp/${asin}` : tagged(`https://${host}/dp/${asin}`, key)) : null);
    return { lang: e.lang, language: NATIVE[e.lang] || e.lang, title: e.title, paperback: make(e.paperback), kindle: make(e.kindle), main: make(e.paperback || e.kindle) };
  });
}

function links(book, title, mainStore) {
  return Object.keys(STORES).map((key) => ({ key, label: STORES[key].label, href: link(book, title, key), main: key === mainStore }));
}

module.exports = { storeFor, link, links, kindleLink, editions, STORES, NATIVE };
