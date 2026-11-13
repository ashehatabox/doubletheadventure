// How set prices are worked out. Every print order is fulfilled with KDP author copies shipped straight to the buyer.
// Change a number here, run `node scripts/price-check.js`, then update priceCents in data/shop.js if the margin moved.
// Print and shipping are paid in US dollars (amazon.com author copies); sale prices are in Canadian dollars.
module.exports = {
  usdToCad: 1.4,         // USD->CAD with a buffer for card conversion fees (mid-market was about 1.36-1.41 in 2026)
  printCostUsd: 4.2,     // KDP author-copy print cost per paperback, USD (seen in the author-copy cart, Nov 12 2026)
  // Author-copy delivery seen in the cart (Nov 12 2026, USD, "ships in 3 to 4 weeks"). Other quantities are interpolated.
  shippingUsd: { 1: 6.99, 5: 14.99, 10: 20.99, 20: 36.99 },
  remailSigned: 15.0,    // CAD, ESTIMATE: signed copy comes to us first, then Canada Post to the buyer
  stripePct: 0.029, stripeFixed: 0.3,
  retail: 11.99,         // Amazon paperback list price, CAD (one price for every book)
  minProfit: 1.5,        // owner's rule: match or beat Amazon on sets; never sell below this profit per order

  ship(n) {
    const pts = Object.keys(this.shippingUsd).map(Number).sort((a, b) => a - b);
    let lo = pts[0], hi = pts[1];
    for (let i = 0; i < pts.length - 1; i++) { if (n >= pts[i]) { lo = pts[i]; hi = pts[i + 1]; } }
    const a = this.shippingUsd[lo], b = this.shippingUsd[hi];
    return a + (b - a) * (n - lo) / (hi - lo);
  },
  // Cost in CAD of one order of n books shipped straight to the buyer (signed adds the re-mail step). Sales tax not included.
  cost(n, { signed = false } = {}) {
    const usd = n * this.printCostUsd + this.ship(n);
    return usd * this.usdToCad + (signed ? this.remailSigned : 0);
  },
  // What is left after cost and the Stripe fee.
  profit(price, n, opts) {
    return price - this.cost(n, opts) - (price * this.stripePct + this.stripeFixed);
  }
};
