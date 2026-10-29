// Prints the next article the engine should write, with everything known about its book.
// Usage: node scripts/engine-next.js            → next "todo" item (skips books without a brief)
//        node scripts/engine-next.js --done <id> <article-slug>   → mark an item written
const fs = require('fs');
const path = require('path');
const catalog = require('../data/books');

const FILE = path.join(__dirname, '..', 'content', 'engine', 'queue.json');
const BRIEFS = path.join(__dirname, '..', 'content', 'engine', 'books');
const q = JSON.parse(fs.readFileSync(FILE, 'utf8'));

if (process.argv[2] === '--done') {
  const item = q.items.find((i) => i.id === process.argv[3]);
  if (!item) { console.error('No such item'); process.exit(1); }
  Object.assign(item, { status: 'done', article: process.argv[4] || '', date: new Date().toISOString().slice(0, 10) });
  fs.writeFileSync(FILE, JSON.stringify(q, null, 1) + '\n');
  console.log('Marked done:', item.id);
  process.exit(0);
}

const hasBrief = (slug) => fs.existsSync(path.join(BRIEFS, slug + '.md'));
const next = q.items.find((i) => i.status === 'todo' && hasBrief(i.book));
if (!next) { console.log(JSON.stringify({ next: null, message: 'Nothing left to write (or no book briefs).' })); process.exit(0); }
const b = catalog.get(next.book);
console.log(JSON.stringify({
  next,
  remaining: q.items.filter((i) => i.status === 'todo').length,
  brief: 'content/engine/books/' + next.book + '.md',
  book: { n: b.n, slug: b.slug, title: b.title.en, subtitle: b.subtitle && b.subtitle.en, value: b.value, moments: b.moments, status: b.status, hero: b.hero && b.hero.en, culture: b.culture, cultureIdea: b.cultureIdea && b.cultureIdea.en, refrain: b.refrain && b.refrain.en, themeLine: b.themeLine && b.themeLine.en, page: '/books/' + b.slug },
  writtenForThisBook: q.items.filter((i) => i.book === next.book && i.status === 'done').map((i) => '/parents/articles/' + i.article)
}, null, 1));
