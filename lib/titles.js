// Rows for the library title list, the store sell sheet, the rights catalogue and the per-book rights sheets.
// Everything comes from data/books.js (one record per book, editions per format and language).
// A missing fact is returned as null; views show it as a pending placeholder, never a guess.
const catalog = require('../data/books');
const site = require('../data/site');
const readalouds = require('./readalouds');

const STATUS = { live: 'out', soon: 'finished', coming: 'planned' };

function editionsOf(b) {
  return (b.editions || []).map((e) => ({ ...e }));
}

// One row per book, in series order.
function rows(h) {
  const videos = readalouds.slugs();
  return catalog.books.map((b) => {
    const eds = editionsOf(b);
    const pick = (fmt, lang = 'en') => eds.find((e) => e.format === fmt && e.lang === lang) || null;
    return {
      n: b.n,
      slug: b.slug,
      title: h.bookTitle(b),
      subtitle: h.pick(b.subtitle),
      value: h.valueLabel(b),
      culture: h.cultureLabel(b),
      cultureIdea: h.pick(b.cultureIdea),
      pitch: h.pick(b.blurb) || null,
      status: STATUS[b.status] || 'planned',
      languages: b.languages || ['en'],
      liveLanguages: [...new Set(eds.filter((e) => e.status === 'live').map((e) => e.lang))],
      editions: eds,
      paperback: pick('paperback'),
      kindle: pick('kindle'),
      hasVideo: videos.includes(b.slug),
      ages: site.ages,
      grade: 'PreK–2',
      bisac: b.bisac || null,
      pubDate: b.pubDate || null
    };
  });
}

// The title list as CSV (Excel and library systems open it). Pending facts stay empty cells, never invented.
function csv(h) {
  const head = ['Number', 'Title', 'Subtitle', 'Value', 'Culture', 'Language', 'Format', 'Status', 'ISBN', 'ASIN', 'Pages', 'Trim', 'Price', 'BISAC', 'Ages', 'Grade', 'Publication date', 'Publisher'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [head.join(',')];
  rows(h).forEach((r) => {
    r.editions.forEach((e) => {
      lines.push([r.n, r.title, r.subtitle, r.value, r.culture, e.lang, e.format, e.status === 'live' ? 'On sale' : e.status === 'draft' ? 'Ready, not yet published' : 'Planned', e.isbn ? "'" + e.isbn : '', e.asin || '', e.pages || '', e.trim || '', 'On Amazon, price varies by country', r.bisac || '', r.ages, r.grade, r.pubDate || '', 'A² Publishing'].map(esc).join(','));
    });
  });
  return '﻿' + lines.join('\r\n') + '\r\n';
}

module.exports = { rows, csv };
