// How set prices are worked out. Every print order is fulfilled with KDP author copies shipped straight to the buyer.
// Change a number here, run `node scripts/price-check.js`, then update priceCents in data/shop.js if the margin moved.
// Each Amazon marketplace only ships author copies inside its own country: Canadian buyers -> amazon.ca (CAD),
// US buyers -> amazon.com (USD). Sale prices are in Canadian dollars and must make a profit in both.
module.exports = {
  usdToCad: 1.4,         // USD->CAD with a buffer for card conversion fees (mid-market was about 1.36-1.41 in 2026)
  // Author-copy costs seen in the real carts on Nov 12 2026 (The Pebbles Inside / Las piedras de Tavi). Other quantities are interpolated.
  markets: {
    ca: { currency: 'CAD', print: 5.26, shipping: { 1: 4.98, 5: 8.94, 10: 13.89, 20: 23.79 }, ships: 'about 10 days, then 3-4 days delivery' },
    us: { currency: 'USD', print: 4.2, shipping: { 1: 6.99, 5: 14.99, 10: 20.99, 20: 36.99 }, ships: '3 to 4 weeks' }
  },
  remailSigned: 15.0,    // CAD, ESTIMATE: signed copy comes to us first, then Canada Post to the buyer
  stripePct: 0.029, stripeFixed: 0.3,
  retail: 11.99,         // Amazon paperback list price, CAD (one price for every book)
  minProfit: 1.5,        // owner's rule: match or beat Amazon on sets; never sell below this profit per order, in either country

  ship(n, market = 'ca') {
    const table = this.markets[market].shipping;
    const pts = Object.keys(table).map(Number).sort((a, b) => a - b);
    let lo = pts[0], hi = pts[1];
    for (let i = 0; i < pts.length - 1; i++) { if (n >= pts[i]) { lo = pts[i]; hi = pts[i + 1]; } }
    return table[lo] + (table[hi] - table[lo]) * (n - lo) / (hi - lo);
  },
  // Cost in CAD of one order of n books shipped straight to the buyer (signed adds the re-mail step). Sales tax not included.
  cost(n, { signed = false, market = 'ca' } = {}) {
    const m = this.markets[market];
    const amount = n * m.print + this.ship(n, market);
    return (m.currency === 'USD' ? amount * this.usdToCad : amount) + (signed ? this.remailSigned : 0);
  },
  // What is left after cost and the Stripe fee.
  profit(price, n, opts) {
    return price - this.cost(n, opts) - (price * this.stripePct + this.stripeFixed);
  }
};
