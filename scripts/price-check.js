// Prints cost, Stripe fee and profit for every print product, and fails if any is below pricing.minProfit.
// Run: node scripts/price-check.js
const pr = require('../data/pricing');
const shop = require('../data/shop');
let bad = 0;
console.log('product'.padEnd(20), 'books', 'price', ' cost', 'profit', ' vs Amazon retail');
for (const p of shop.products.filter((x) => x.physical && Number.isInteger(x.priceCents))) {
  const price = p.priceCents / 100;
  const n = p.books || 1;
  const cost = pr.cost(n, { signed: !!p.signed });
  const profit = pr.profit(price, n, { signed: !!p.signed });
  const retail = n * pr.retail;
  if (profit < pr.minProfit) bad++;
  console.log(p.id.padEnd(20), String(n).padStart(5), price.toFixed(2).padStart(6), cost.toFixed(2).padStart(6), profit.toFixed(2).padStart(6), (retail.toFixed(2) + ' + shipping').padStart(17), profit < pr.minProfit ? '  <-- below minimum' : '');
}
if (bad) { console.log(`\n${bad} product(s) below the minimum profit.`); process.exit(1); }
console.log('\nAll print products clear the minimum profit.');
