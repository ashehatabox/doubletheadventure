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
  ['/', 200, 'on the road to 100'],
  ['/fr/', 200, 'en route vers 100'],
  ['/fr/', 200, 'Dans chaque livre'],
  ['/books', 200, 'All the books'],
  ['/books?moment=left-out', 200, 'The Snug'],
  ['/fr/books', 200, 'Tous les livres'],
  ['/books/coming', 200, 'Knot by Knot'],
  ['/books/review-team', 200, 'Join the review team'],
  ['/shop', 200, 'early 2027'],
  ['/play', 200, 'No ads, ever'],
  ['/values-map', 200, 'Kaitiakitanga'],
  ['/fr/values-map', 200, 'La carte des valeurs'],
  ['/parents/articles', 200, 'Articles for parents'],
  ['/heroes', 200, 'Heroes Encyclopedia'],
  ['/heroes/the-circle-of-paws', 200, 'Pampa Galeras'],
  ['/books/the-circle-of-paws', 200, 'Meet the real heroes'],
  ['/heroes/tumble-and-the-honey-glow', 200, 'Piatra Craiului'],
  ['/heroes/knot-by-knot', 200, 'Wadi Darbat'],
  ['/heroes/the-beetle-who-knew-the-stars', 200, 'Qubbet el-Hawa'],
  ['/heroes/the-old-path-song', 200, 'Kakum National Park'],
  ['/heroes/the-littlest-guardian', 200, 'Mason Bay'],
  ['/heroes/eight-times-up', 200, 'Kamikochi'],
  ['/heroes/the-view-from-down-low', 200, 'Tswalu'],
  ['/heroes/the-snug', 200, 'Casentino'],
  ['/heroes/the-pebbles-inside', 200, 'Brenne'],
  ['/heroes/the-light-that-grows', 200, 'Guadarrama'],
  ['/heroes/the-spring-that-wanted-to-stay', 200, 'Hohe Tauern'],
  ['/heroes/pip-the-brave-parrot', 200, 'Karasabai'],
  ['/heroes/finn-and-coral', 200, 'Bonaire'],
  ['/heroes/the-honest-little-raccoon', 200, 'Central Park'],
  ['/heroes/the-desert-buzz', 200, 'Saguaro'],
  ['/heroes/rainy-day-shiny-things', 200, 'Point Pelee'],
  ['/heroes/the-fox-mistake', 200, 'Great Smoky'],
  ['/heroes/friendship-bridge', 200, 'Algonquin'],
  ['/heroes/becoming-a-tree', 200, 'Shenandoah'],
  ['/heroes/secret-hero', 200, 'Rouge'],
  ['/fr/heroes', 200, 'Encyclopédie des héros'],
  ['/fr/parents/articles', 200, 'Articles pour les parents'],
  ['/parents/articles/why-every-story-starts-from-one-value', 404, ''],
  ['/sw.js', 200, 'play-v4'],
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
  ['/stories', 200, 'Read it online'],
  ['/fr/stories', 200, 'heure du conte'],
  ['/start', 200, 'What does your child need right now'],
  ['/start/big-feelings', 200, 'Start with this one'],
  ['/fr/start/left-out', 200, 'Commencez par celui-ci'],
  ['/start/sorry-x', 404, ''],
  ['/search', 200, 'Search our books'],
  ['/search?q=kindness', 200, 'Secret Hero'],
  ['/search?q=zzzzqq', 200, 'Nothing found'],
  ['/fr/search?q=patience', 200, 'Patience'],
  ['/values', 200, 'Values our stories teach'],
  ['/values/kindness', 200, 'Secret Hero'],
  ['/fr/values/patience', 200, 'Autres valeurs'],
  ['/values/giving', 200, 'The Circle of Paws'],
  ['/values/selfcare', 200, 'Tumble and the Honey Glow'],
  ['/values/not-a-value', 404, ''],
  ['/educators/guides', 200, 'Free read-aloud guides'],
  ['/educators/guides/secret-hero', 200, 'Before reading'],
  ['/fr/educators/guides/secret-hero', 200, 'Avant la lecture'],
  ['/educators/guides/knot-by-knot', 200, 'Before reading'],
  ['/books/tumble-and-the-honey-glow', 200, 'Warm, slow, honey-glow'],
  ['/educators/early-years', 200, 'How Does Learning Happen?'],
  ['/educators/libraries', 200, 'Series one-sheet'],
  ['/educators/classroom', 200, 'A year of values'],
  ['/fr/educators/classroom', 200, 'Une année de valeurs'],
  ['/educators/classroom/cards', 200, 'Scan to listen'],
  ['/educators/classroom/posters?book=the-snug', 200, 'Scoop, loop, snug!'],
  ['/educators/libraries/one-sheet', 200, 'Class sets'],
  ['/educators/newcomers', 200, 'Multilingual sets'],
  ['/fr/educators/early-years', 200, 'Comment apprend-on ?'],
  ['/partners', 200, 'Rights and licensing'],
  ['/partners/press', 200, 'No form needed'],
  ['/partners/press/fact-sheet', 200, 'Kingston, Ontario'],
  ['/fr/partners/press', 200, 'Sans formulaire'],
  ['/partners/stores/sell-sheet', 200, '[ISBN – pending]'],
  ['/fr/partners/stores', 200, 'Nom de la librairie'],
  ['/road-to-100', 200, '100 values. 100 cultures.'],
  ['/fr/road-to-100', 200, '100 valeurs. 100 cultures.'],
  ['/languages', 200, 'Ask for your language'],
  ['/fr/languages', 200, 'Demandez votre langue'],
  ['/educators/libraries', 200, 'Title list'],
  ['/fr/educators/libraries', 200, 'Liste des titres'],
  ['/educators/libraries/titles', 200, '9798140945923'],
  ['/educators/libraries/titles.csv', 200, 'Number,Title'],
  ['/partners/rights/catalogue', 200, 'Rights catalogue'],
  ['/books/the-snug/rights', 200, 'Rights sheet'],
  ['/fr/books/the-snug/rights', 200, 'Fiche de droits'],
  ['/partners/stores', 200, 'Store or business name'],
  ['/partners/sponsors', 200, 'Gift a school'],
  ['/partners/rights', 200, 'Animation and TV'],
  ['/fr/partners/rights', 200, 'Catalogue des droits'],
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
  // One source of truth: no page may say "Twenty" or a stale count.
  for (const u of ['/books', '/partners/rights', '/fr/books', '/fr/partners/rights']) {
    const body = await (await fetch(base + u)).text();
    const good = !/Twenty|Vingt /.test(body) && body.includes(String(catalog.books.length));
    if (!good) failed++;
    console.log(`${good ? 'ok  ' : 'FAIL'} counts from book data on ${u}`);
  }

  // Referral codes, end to end: ?ref= sets the cookie; the cookie and the form field both reach the saved rows.
  const landing = await fetch(base + '/books?ref=OT_296', { redirect: 'manual' });
  const cookie = (landing.headers.get('set-cookie') || '').split(';')[0];
  const cookieOk = cookie === 'a2ref=ot_296';
  if (!cookieOk) failed++;
  console.log(`${cookieOk ? 'ok  ' : 'FAIL'} ?ref= sets cookie (${cookie})`);
  await fetch(base + '/api/subscribe', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', cookie }, body: new URLSearchParams({ email: 'ref@example.com', consent: '1', lang: 'en', back: '/', form: 'signup' }) });
  await post('/api/enquire', { kind: 'stores', email: 'store@example.com', message: 'Terms please', organisation: 'Shop', ref: 'ot_301', back: '/partners/stores', form: 'enquiry' });
  const langRes = await post('/api/enquire', { kind: 'language', email: 'fam@example.com', language: 'Arabic', country: 'Canada', who: 'Parent', back: '/languages', form: 'language' }, true);
  const subRows = fs.readFileSync(path.join(process.env.DATA_DIR, 'subscribers.jsonl'), 'utf8');
  const enqRows = fs.readFileSync(path.join(process.env.DATA_DIR, 'enquiries.jsonl'), 'utf8');
  const refOk = /"email":"ref@example.com"[^\n]*"ref":"ot_296"/.test(subRows) && /"store@example.com"[^\n]*"ref":"ot_301"/.test(enqRows) && langRes.status === 200 && /"kind":"language"[^\n]*"language":"Arabic"/.test(enqRows);
  if (!refOk) failed++;
  console.log(`${refOk ? 'ok  ' : 'FAIL'} ref code saved on sign-ups and enquiries; language request saved`);

  const saved = fs.readdirSync(process.env.DATA_DIR);
  const savedOk = saved.includes('subscribers.jsonl') && saved.includes('waitlist.jsonl') && saved.includes('enquiries.jsonl');
  if (!savedOk) failed++;
  console.log(`${savedOk ? 'ok  ' : 'FAIL'} rows saved: ${saved.join(', ')}`);

  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}, 400);
