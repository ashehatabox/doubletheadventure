// Builds content/engine/queue.json: every book × every angle, in the order the daily article engine writes them.
// Run once (node scripts/make-article-queue.js). It keeps the status of items already in the queue.
const fs = require('fs');
const path = require('path');
const catalog = require('../data/books');

const FILE = path.join(__dirname, '..', 'content', 'engine', 'queue.json');
// Angles in writing order: the ones parents search for most come first.
const ANGLES = [
  { key: 'value', topic: 'values' },          // the value at the heart of the book, with tips to share it
  { key: 'animals', topic: 'animals' },       // the real animals behind the heroes
  { key: 'origin', topic: 'cultures' },       // where the value comes from (tradition, saying, philosophy)
  { key: 'moment', topic: 'feelings' },       // when your child is going through what the hero goes through
  { key: 'environment', topic: 'nature' },    // the place the story happens: habitat, season, caring for it
  { key: 'classroom', topic: 'classroom' },   // a circle-time and classroom guide for teachers
  { key: 'activities', topic: 'activities' }, // crafts, games and play at home, linked to /play
  { key: 'reading', topic: 'reading' }        // reading it together: questions page by page (no story text)
];
// Books on Amazon first (they can sell today), then the ones coming soon, then the newest.
const order = ['live', 'soon', 'coming'];
const books = catalog.books.slice().sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.n - b.n);

const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { items: [] };
const done = Object.fromEntries(old.items.map((i) => [i.id, i]));

const items = [];
ANGLES.forEach((angle) => {
  books.forEach((b) => {
    const id = `${b.slug}--${angle.key}`;
    items.push(done[id] || { id, book: b.slug, angle: angle.key, topic: angle.topic, status: 'todo', article: '', date: '' });
  });
});
fs.writeFileSync(FILE, JSON.stringify({ note: 'Daily article engine queue. See content/engine/README.md.', items }, null, 1) + '\n');
console.log(items.length, 'items,', items.filter((i) => i.status === 'done').length, 'done');
