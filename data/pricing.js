// How set prices are worked out. Every print order is fulfilled with KDP author copies shipped straight to the buyer.
// Change a number here, run `node scripts/price-check.js`, then update priceCents in data/shop.js if the margin moved.
// All amounts in Canadian dollars.
module.exports = {
  printCost: 6.0,        // KDP author-copy print cost per paperback (owner's figure, Nov 2026)
  shipBase: 6.0,         // ESTIMATE: author-copy shipping per order. KDP gives no formula; confirm at an author-copy checkout.
  shipPerBook: 1.5,      // ESTIMATE: extra shipping per book in the same order
  remailSigned: 15.0,    // ESTIMATE: signed copy comes to us first, then Canada Post to the buyer (padded envelope + postage)
  stripePct: 0.029, stripeFixed: 0.3,
  retail: 11.99,         // Amazon paperback list price (one price for every book)
  minProfit: 4.0,        // never sell a print product for less than this profit per order

  // Cost of one order of n books shipped straight to the buyer (signed adds the re-mail step).
  cost(n, { signed = false } = {}) {
    return n * this.printCost + this.shipBase + n * this.shipPerBook + (signed ? this.remailSigned : 0);
  },
  // What is left after cost and the Stripe fee.
  profit(price, n, opts) {
    return price - this.cost(n, opts) - (price * this.stripePct + this.stripeFixed);
  }
};
