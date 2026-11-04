// Own-shop checkout with Stripe Checkout (hosted page). Switched off until STRIPE_SECRET_KEY is set AND SHOP_OPEN=1.
// Orders are fulfilled from the webhook (never from the success page), the webhook signature is checked, and each order is stored once.
const catalog = require('../data/shop');
const { insert } = require('./supabase');
const mailer = require('./mailer');

let client = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new (require('stripe'))(process.env.STRIPE_SECRET_KEY);
  return client;
}

const priced = () => catalog.products.filter((p) => Number.isInteger(p.priceCents) && p.priceCents > 0);
const open = () => process.env.SHOP_OPEN === '1' && !!stripe() && priced().length > 0;
const find = (id) => priced().find((p) => p.id === id);
const SITE = () => (process.env.SITE_URL || 'https://doubleadventure.ca').replace(/\/$/, '');

async function createSession({ productId, quantity, lang }) {
  const p = find(productId);
  if (!p || !open()) return null;
  const qty = Math.min(10, Math.max(1, parseInt(quantity, 10) || 1));
  const prefix = lang === 'fr' ? '/fr' : '';
  const rates = String(process.env.STRIPE_SHIPPING_RATES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const params = {
    mode: 'payment',
    line_items: [{ quantity: qty, price_data: { currency: catalog.currency, unit_amount: p.priceCents, product_data: { name: p.title[lang] || p.title.en } } }],
    allow_promotion_codes: true,
    success_url: `${SITE()}${prefix}/shop/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE()}${prefix}/shop`,
    locale: lang === 'fr' ? 'fr-CA' : 'en',
    metadata: { product: p.id, quantity: String(qty), lang }
  };
  if (p.physical) {
    params.shipping_address_collection = { allowed_countries: catalog.allowedCountries };
    if (rates.length) params.shipping_options = rates.map((r) => ({ shipping_rate: r }));
  }
  if (p.dedication) {
    params.custom_fields = [{ key: 'dedication', label: { type: 'custom', custom: lang === 'fr' ? 'Dédicace (prénom ou message)' : 'Dedication (name or message)' }, type: 'text', optional: true }];
  }
  if (process.env.STRIPE_AUTOMATIC_TAX === '1') params.automatic_tax = { enabled: true };
  const session = await stripe().checkout.sessions.create(params);
  return session.url;
}

// Called for each verified Stripe event. Safe to receive twice: the order is stored once (unique session id).
async function handleEvent(event) {
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return;
  const session = await stripe().checkout.sessions.retrieve(event.data.object.id, { expand: ['line_items'] });
  if (session.payment_status === 'unpaid') return;
  const items = (session.line_items?.data || []).map((l) => `${l.quantity} × ${l.description}`).join('; ');
  const email = session.customer_details?.email || '';
  const stored = await insert('orders', { stripe_session_id: session.id, email, amount_total: session.amount_total, currency: session.currency, summary: items });
  if (!stored.ok) return; // already stored: this event was handled before
  const addr = session.collected_information?.shipping_details || session.shipping_details || {};
  const a = addr.address || {};
  const ded = (session.custom_fields || []).find((f) => f.key === 'dedication')?.text?.value || '';
  const text = [
    `New paid order ${session.id}`, `Items: ${items}`, `Total: ${(session.amount_total / 100).toFixed(2)} ${String(session.currency).toUpperCase()}`,
    `Customer: ${session.customer_details?.name || ''} <${email}>`,
    addr.name ? `Ship to: ${addr.name}, ${[a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ')}` : 'No shipping (digital or pickup).',
    ded ? `Dedication: ${ded}` : ''
  ].filter(Boolean).join('\n');
  try { await mailer.notify({ subject: `New order: ${items}`, text }); } catch (err) { console.error('Order email failed:', err.message); }
}

function verify(rawBody, signature) {
  return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { open, priced, find, createSession, handleEvent, verify, stripe };
