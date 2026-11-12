// How set prices are worked out. Every print order is fulfilled with KDP author copies shipped straight to the buyer.
// Change a number here, run `node scripts/price-check.js`, then update priceCents in data/shop.js if the margin moved.
// Print and shipping are paid in US dollars (amazon.com author copies); sale prices are in Canadian dollars.
module.exports = {
  usdToCad: 1.4,         // USD->CAD with a buffer for card conversion fees (mid-market was about 1.36-1.41 in 2026)
  printCostUsd: 6.0,     // KDP author-copy print cost per paperback, USD (owner's figure, Nov 2026)
  shipBaseUsd: 6.0,      // ESTIMATE, USD: author-copy shipping per order. KDP gives no formula; confirm at an author-copy checkout.
  shipPerBookUsd: 1.5,   // ESTIMATE, USD: extra shipping per book in the same order
  remailSigned: 15.0,    // CAD, ESTIMATE: signed copy comes to us first, then Canada Post to the buyer (padded envelope + postage)
  stripePct: 0.029, stripeFixed: 0.3,
  retail: 11.99,         // Amazon paperback list price, CAD (one price for every book)
  minProfit: 4.0,        // never sell a print product for less than this profit per order

  // Cost in CAD of one order of n books shipped straight to the buyer (signed adds the re-mail step).
  cost(n, { signed = false } = {}) {
    const usd = n * this.printCostUsd + this.shipBaseUsd + n * this.shipPerBookUsd;
    return usd * this.usdToCad + (signed ? this.remailSigned : 0);
  },
  // What is left after cost and the Stripe fee.
  profit(price, n, opts) {
    return price - this.cost(n, opts) - (price * this.stripePct + this.stripeFixed);
  }
};
