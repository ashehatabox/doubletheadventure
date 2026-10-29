// Long articles for parents, written in Markdown: content/articles/<lang>/<slug>.md
// The same slug in content/articles/fr/ is the French version; without one, French readers get the English text.
//
// Each file starts with a small header:
// ---
// title: Why every story starts from one value
// description: One or two sentences for Google and the article list (about 150 characters).
// date: 2026-11-02
// updated: 2026-11-10            (optional)
// topic: philosophy              (philosophy, values, cultures, reading, feelings)
// books: the-snug, eight-times-up (optional: book slugs shown as "books for this article")
// image: /images/books/the-snug/cover.jpg (optional: picture for sharing; default is the first book's cover)
// draft: true                    (optional: hidden on the live site unless SHOW_DRAFTS=1)
// ---
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');

const ROOT = path.join(__dirname, '..', 'content', 'articles');
const TOPICS = ['philosophy', 'values', 'cultures', 'reading', 'feelings'];
const showDrafts = () => process.env.SHOW_DRAFTS === '1';

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parse(file, lang) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('Missing header in ' + file);
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  const toc = [];
  const md = new Marked();
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        if (depth === 1) return ''; // the page shows the title already
        const id = slugify(text);
        if (depth === 2) toc.push({ id, text: text.replace(/<[^>]+>/g, '') });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const ext = /^https?:\/\//.test(href);
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${ext ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`;
      }
    }
  });
  const html = md.parse(m[2]);
  const words = m[2].split(/\s+/).filter(Boolean).length;
  const slug = path.basename(file, '.md');
  return {
    slug,
    lang,
    title: meta.title || slug,
    description: meta.description || '',
    date: meta.date || '',
    updated: meta.updated || '',
    topic: TOPICS.includes(meta.topic) ? meta.topic : 'values',
    books: (meta.books || '').split(',').map((s) => s.trim()).filter(Boolean),
    image: meta.image || '',
    draft: meta.draft === 'true',
    minutes: Math.max(1, Math.round(words / 200)),
    words,
    toc,
    html
  };
}

const store = { en: {}, fr: {} };
for (const lang of Object.keys(store)) {
  const dir = path.join(ROOT, lang);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const a = parse(path.join(dir, f), lang);
    store[lang][a.slug] = a;
  }
}

const visible = (a) => a && (!a.draft || showDrafts());

// The article in this language, or the English one (marked as a fallback).
function get(slug, lang) {
  const own = store[lang] && store[lang][slug];
  if (visible(own)) return { ...own, isFallback: false };
  const en = store.en[slug];
  return visible(en) ? { ...en, isFallback: lang !== 'en' } : null;
}

// All articles for a language, newest first (English ones fill the gaps).
function list(lang) {
  return Object.keys(store.en)
    .concat(Object.keys(store[lang] || {}))
    .filter((s, i, all) => all.indexOf(s) === i)
    .map((s) => get(s, lang))
    .filter(Boolean)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// Slugs that are live (for the sitemap).
const published = () => Object.values(store.en).filter((a) => !a.draft).map((a) => a.slug);

module.exports = { get, list, published, TOPICS };
