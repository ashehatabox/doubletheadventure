// Tests the switched-off shop, a switched-on shop page (fake key, one priced product), the unsubscribe flow and the webhook guard.
// Run: node scripts/test-shop.js
process.env.PORT = '3991';
process.env.SHOP_OPEN = '1';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.UNSUB_SECRET = 'test-secret';
process.env.DATA_DIR = require('os').tmpdir() + '/dta-test-' + Date.now();
delete process.env.SUPABASE_URL;
const shopData = require('../data/shop');
const realPrices = shopData.products.map((p) => p.priceCents);
shopData.products.forEach((p) => { p.priceCents = null; }); // start from a shop with nothing priced
const http = require('http');
const req = (method, path, body, headers = {}) => new Promise((res) => {
  const r = http.request({ port: 3991, path, method, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers } }, (x) => { let b = ''; x.on('data', (c) => (b += c)); x.on('end', () => res({ status: x.statusCode, body: b, loc: x.headers.location })); });
  if (body) r.write(body); r.end();
});
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
require('../app.js');
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  let r = await req('GET', '/shop');
  ok(r.status === 200 && /early 2027/.test(r.body) && !/\/shop\/checkout/.test(r.body), 'shop with no priced product stays on the sign-up page');
  shopData.products[0].priceCents = 4500;
  r = await req('GET', '/shop');
  ok(/The shop/.test(r.body) && /\/shop\/checkout/.test(r.body) && /45\.00/.test(r.body) && !/early 2027/.test(r.body), 'shop shows the priced product with a Buy button');
  shopData.products.forEach((p, i) => { p.priceCents = realPrices[i]; });
  r = await req('GET', '/shop');
  ok(/Classroom set: 5 books/.test(r.body) && /74\.99/.test(r.body) && /279\.99/.test(r.body), 'real prices show, classroom sets included');
  r = await req('GET', '/fr/shop');
  ok(/Acheter/.test(r.body), 'French shop page');
  r = await req('POST', '/shop/checkout', 'product=nope&lang=en');
  ok(r.status === 303 && r.loc === '/shop', 'unknown product goes back to the shop');
  r = await req('POST', '/stripe/webhook', '{}', { 'content-type': 'application/json' });
  ok(r.status === 404, 'webhook is closed without a webhook secret');
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  r = await req('POST', '/stripe/webhook', '{}', { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' });
  ok(r.status === 400, 'webhook rejects a bad signature');
  const w = require('../lib/welcome');
  const link = w.unsubLink('a@b.co');
  ok(/unsubscribe\?e=a%40b\.co&t=[0-9a-f]{32}$/.test(link), 'unsubscribe link is signed');
  const path = link.replace('https://doubleadventure.ca', '');
  r = await req('GET', path);
  ok(r.status === 200 && /Unsubscribe/.test(r.body) && /a@b\.co/.test(r.body), 'unsubscribe page asks to confirm');
  r = await req('GET', path.replace(/t=.{4}/, 't=0000'));
  ok(/not valid/.test(r.body), 'tampered unsubscribe link is refused');
  const tok = path.split('t=')[1];
  r = await req('POST', '/unsubscribe', `e=a%40b.co&t=${tok}&lang=en`);
  ok(r.status === 303 && /done=1/.test(r.loc), 'unsubscribe saves and confirms');
  r = await req('POST', '/api/subscribe', 'email=kid%40example.com&consent=1&lang=en&book=the-snug&list=subscribers&back=/');
  ok(r.status === 303, 'sign-up still works (welcome email skipped without a mail account)');
  console.log(bad ? `\n${bad} failed` : '\nShop tests passed.');
  process.exit(bad ? 1 : 0);
})();
