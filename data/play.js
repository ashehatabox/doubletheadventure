// What the Play area can offer, read from the files on disk at start-up.
// Coloring pages: public/images/play/<slug>/pNN.png (black line art on white, see scripts/prepare-lineart.py).
// Jigsaw and memory cards use the book covers in public/images/books/<slug>/cover.jpg.
// KDP Select: keep at most 5 coloring pages per book and never any story text.
const fs = require('fs');
const path = require('path');
const catalog = require('./books');

const PLAY = path.join(__dirname, '..', 'public', 'images', 'play');
const BOOKS = path.join(__dirname, '..', 'public', 'images', 'books');
const MAX_PAGES = 5;

function coloringPages(slug) {
  const dir = path.join(PLAY, slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^p\d+\.png$/.test(f))
    .sort()
    .slice(0, MAX_PAGES)
    .map((f) => `/images/play/${slug}/${f}`);
}

const hasCover = (slug) => fs.existsSync(path.join(BOOKS, slug, 'cover.jpg'));

const books = catalog.books.map((b) => ({ slug: b.slug, pages: coloringPages(b.slug), cover: hasCover(b.slug) }));

module.exports = {
  coloring: books.filter((b) => b.pages.length).map((b) => b.slug),
  jigsaw: books.filter((b) => b.cover).map((b) => b.slug),
  pages: (slug) => (books.find((b) => b.slug === slug) || { pages: [] }).pages,
  hasCover,
  JIGSAW_SIZES: [6, 12, 24],
  MEMORY_SIZES: [3, 6, 8]
};
