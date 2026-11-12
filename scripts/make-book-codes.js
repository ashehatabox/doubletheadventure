// Makes book codes to print inside paperbacks or send with orders (they unlock the online reader).
//   READER_CODE_SECRET=... node scripts/make-book-codes.js the-snug 1 200 > snug-codes.csv
//   READER_CODE_SECRET=... node scripts/make-book-codes.js FAMILY 1 50     (every book: Kickstarter, schools)
// Use the SAME READER_CODE_SECRET as the live site, or the codes won't work there. Serials never repeat:
// keep a note of the last serial you printed for each book and start after it next time.
const reader = require('../lib/reader');

const [who, from, to] = process.argv.slice(2);
if (!who || !process.env.READER_CODE_SECRET) {
  console.error('Usage: READER_CODE_SECRET=... node scripts/make-book-codes.js <book-slug|FAMILY> [first] [last]');
  process.exit(1);
}
const prefix = who === 'FAMILY' ? 'FAMILY' : reader.settings.codePrefix[who];
if (!prefix) { console.error('Unknown book: ' + who); process.exit(1); }
const a = parseInt(from || '1', 10), b = parseInt(to || String(a + 99), 10);
console.log('serial,code');
for (let n = a; n <= b; n++) {
  const serial = String(n).padStart(4, '0');
  console.log(`${serial},${reader.makeCode(prefix, serial)}`);
}
