// Prints the next article the engine should write, with everything known about its book.
// Usage: node scripts/engine-next.js            → next "todo" item (skips books without a brief)
//        node scripts/engine-next.js --fr   → next English article that still needs a French version
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

// French run: the oldest published English article that has no French twin yet.
if (process.argv[2] === '--fr') {
  const dir = (l) => path.join(__dirname, '..', 'content', 'articles', l);
  const en = fs.readdirSync(dir('en')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  const frDir = fs.existsSync(dir('fr')) ? fs.readdirSync(dir('fr')).map((f) => f.slice(0, -3)) : [];
  const isDraft = (slug) => /^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(dir('en'), slug + '.md'), 'utf8').split(/\r?\n---/)[0]);
  const date = (slug) => (fs.readFileSync(path.join(dir('en'), slug + '.md'), 'utf8').match(/^date:\s*(\S+)/m) || [])[1] || '';
  const todo = en.filter((s) => !isDraft(s) && !frDir.includes(s)).sort((a, b) => date(a).localeCompare(date(b)));
  console.log(JSON.stringify({ next: todo[0] ? { slug: todo[0], english: 'content/articles/en/' + todo[0] + '.md', write_to: 'content/articles/fr/' + todo[0] + '.md' } : null, remaining: todo.length }, null, 1));
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
