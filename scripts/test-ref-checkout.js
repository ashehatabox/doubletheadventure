// Checks that a referral code reaches Stripe Checkout metadata (Stripe is replaced by a stub; nothing is sent).
process.env.SHOP_OPEN = '1';
process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
const shop = require('../lib/shop');
const data = require('../data/shop');
let sent = null;
shop._setStripe({ checkout: { sessions: { create: async (p) => { sent = p; return { url: 'https://checkout.stripe.com/test' }; } } } });
(async () => {
  const product = data.products.find((p) => Number.isInteger(p.priceCents));
  const url = await shop.createSession({ productId: product.id, quantity: 1, lang: 'en', ref: 'ot_296' });
  const ok = url && sent && sent.metadata && sent.metadata.ref === 'ot_296';
  console.log(`${ok ? 'ok  ' : 'FAIL'} ref code in Stripe checkout metadata (${sent && sent.metadata && sent.metadata.ref})`);
  process.exit(ok ? 0 : 1);
})();
