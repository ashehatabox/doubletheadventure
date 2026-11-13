// Prints cost and profit for every print product, for Canadian (amazon.ca) and US (amazon.com) buyers,
// and fails if any order would make less than pricing.minProfit. Run: node scripts/price-check.js
const pr = require('../data/pricing');
const shop = require('../data/shop');
let bad = 0;
console.log('product'.padEnd(20), 'books', ' price', ' CA cost', 'CA profit', ' US cost', 'US profit', ' Amazon');
for (const p of shop.products.filter((x) => x.physical && Number.isInteger(x.priceCents))) {
  const price = p.priceCents / 100;
  const n = p.books || 1;
  const row = [p.id.padEnd(20), String(n).padStart(5), price.toFixed(2).padStart(6)];
  for (const market of ['ca', 'us']) {
    const opts = { signed: !!p.signed, market };
    const profit = pr.profit(price, n, opts);
    if (profit < pr.minProfit) bad++;
    row.push(pr.cost(n, opts).toFixed(2).padStart(8), (profit.toFixed(2) + (profit < pr.minProfit ? '!' : '')).padStart(9));
  }
  row.push((n * pr.retail).toFixed(2).padStart(7));
  console.log(row.join(' '));
}
if (bad) { console.log(`\n${bad} price(s) below the minimum profit (marked !).`); process.exit(1); }
console.log('\nAll print products clear the minimum profit in both countries.');
