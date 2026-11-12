// Checks every hero guide: each fact has a source, and every source id exists.
//   node scripts/check-heroes.js
const heroes = require('../lib/heroes');
let bad = 0;
for (const g of heroes.list()) {
  const errors = heroes.check(g);
  if (errors.length) { bad += errors.length; console.error(`✗ ${g.book}\n  ` + errors.join('\n  ')); }
  else console.log(`✓ ${g.book} (${g.cast.length} characters, ${Object.keys(g.sources).length} sources)`);
}
process.exit(bad ? 1 : 0);
