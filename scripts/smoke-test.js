// Starts the site on a spare port and checks every page and form.
//   npm run check
// Forms are tested without Supabase (rows go to a temporary folder), so nothing reaches the live tables.

const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.PORT || '3998';
process.env.SUPABASE_URL = '';
process.env.STORE_EMAIL = '';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a2-test-'));
require('../app');

const catalog = require('../data/books');
const base = `http://localhost:${process.env.PORT}`;

const checks = [
  ['/', 200, 'Who&#39;s reading today?'],
  ['/fr/', 200, 'Qui lit aujourd&#39;hui ?'],
  ['/books', 200, 'All the books'],
  ['/books?moment=left-out', 200, 'The Snug'],
  ['/fr/books', 200, 'Tous les livres'],
  ['/books/coming', 200, 'Knot by Knot'],
  ['/books/review-team', 200, 'Join the review team'],
  ['/shop', 200, 'early 2027'],
  ['/play', 200, 'No ads, ever'],
  ['/fr/play', 200, 'Jouer avec les héros'],
  ['/play/color/pip-the-brave-parrot', 200, '/js/play/color.js'],
  ['/play/color/pip-the-brave-parrot?p=3', 200, 'p05.png'],
  ['/play/color/the-snug-not-a-book', 404, ''],
  ['/play/jigsaw/the-snug?pieces=12', 200, '/js/play/jigsaw.js'],
  ['/fr/play/memory', 200, 'Jeu de mémoire'],
  ['/js/play/common.js', 200, 'window.Play'],
  ['/parents', 200, 'dialogic reading'],
  ['/educators', 200, 'Educator corner'],
  ['/educators/teachers', 200, 'SEL pack per book'],
  ['/educators/early-years', 200, 'How Does Learning Happen?'],
  ['/educators/libraries', 200, 'One-sheet per book'],
  ['/educators/newcomers', 200, 'Multilingual sets'],
  ['/fr/educators/early-years', 200, 'Comment apprend-on ?'],
  ['/partners', 200, 'Rights and licensing'],
  ['/partners/press', 200, 'Request a review copy'],
  ['/partners/stores', 200, 'wholesale'],
  ['/partners/sponsors', 200, 'Gift a school'],
  ['/partners/rights', 200, 'Animation and audio'],
  ['/about', 200, 'Our story'],
  ['/contact', 200, 'Contact us'],
  ['/faq', 200, 'FAQPage'],
  ['/policies/privacy', 200, 'PIPEDA'],
  ['/policies/terms', 200, 'Terms'],
  ['/policies/shipping', 200, 'Shipping and returns'],
  ['/fr/policies/privacy', 200, 'LPRPDE'],
  ['/sitemap.xml', 200, '/fr/books/the-snug'],
  ['/robots.txt', 200, 'Sitemap:'],
  ['/healthz', 200, 'ok'],
  ['/books/nope', 404, 'wandered off'],
  ['/nope', 404, 'wandered off'],
  ['/fr/nope', 404, 'égarée']
].concat(catalog.books.map((b) => ['/books/' + b.slug, 200, b.title.en.replace('&', '&amp;')]));

setTimeout(async () => {
  let failed = 0;
  for (const [url, status, text] of checks) {
    const res = await fetch(base + url);
    const body = await res.text();
    const good = res.status === status && body.includes(text);
    if (!good) failed++;
    console.log(`${good ? 'ok  ' : 'FAIL'} ${res.status} ${url}`);
  }

  const post = (url, data, json) =>
    fetch(base + url, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: json ? 'application/json' : 'text/html' },
      body: new URLSearchParams(data)
    });
  const formChecks = [
    ['subscribe (json)', await post('/api/subscribe', { email: 'test@example.com', consent: '1', lang: 'en', back: '/', form: 'signup' }, true), 200],
    ['subscribe without consent', await post('/api/subscribe', { email: 'test@example.com', back: '/', form: 'signup' }, true), 400],
    ['subscribe bad email', await post('/api/subscribe', { email: 'nope', consent: '1', back: '/', form: 'signup' }, true), 400],
    ['waitlist', await post('/api/subscribe', { email: 'test@example.com', consent: '1', list: 'waitlist', book: 'knot-by-knot', back: '/books/knot-by-knot', form: 'notify-form' }), 303],
    ['enquiry', await post('/api/enquire', { kind: 'quote', email: 'teacher@example.com', message: 'A class set please', back: '/educators/teachers', form: 'enquiry' }), 303],
    ['enquiry without message', await post('/api/enquire', { kind: 'quote', email: 'teacher@example.com', back: '/', form: 'enquiry' }, true), 400]
  ];
  for (const [name, res, status] of formChecks) {
    const good = res.status === status;
    if (!good) failed++;
    console.log(`${good ? 'ok  ' : 'FAIL'} ${res.status} POST ${name}${res.headers.get('location') ? ' → ' + res.headers.get('location') : ''}`);
  }
  const saved = fs.readdirSync(process.env.DATA_DIR);
  const savedOk = saved.includes('subscribers.jsonl') && saved.includes('waitlist.jsonl') && saved.includes('enquiries.jsonl');
  if (!savedOk) failed++;
  console.log(`${savedOk ? 'ok  ' : 'FAIL'} rows saved: ${saved.join(', ')}`);

  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}, 400);
