// A² Publishing / Double the Adventure website — Express app.
// On GoDaddy (cPanel "Setup Node.js App") set the startup file to app.js.

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const compression = require('compression');

const site = require('./data/site');
const catalog = require('./data/books');
const play = require('./data/play');
const mapPoints = require('./data/map-points.json');
const geo = require('./lib/geo');
const articles = require('./lib/articles');
const heroes = require('./lib/heroes');
const guides = require('./lib/guides');
const shareImage = require('./lib/share');
const search = require('./lib/search');
const shop = require('./lib/shop');
const shopData = require('./data/shop');
const welcome = require('./lib/welcome');
const readalouds = require('./lib/readalouds');
const guide2 = require('./lib/guide2');
const reader = require('./lib/reader');
const { helpers, bookImage, coverSmall, LANGS } = require('./lib/i18n');
const amazon = require('./lib/amazon');
const { insert } = require('./lib/supabase');
const { notify } = require('./lib/mailer');

const SITE_URL = (process.env.SITE_URL || 'https://doubleadventure.ca').replace(/\/$/, '');
const EDUCATOR_PAGES = ['teachers', 'early-years', 'libraries', 'newcomers'];
const PARTNER_PAGES = ['press', 'stores', 'sponsors', 'rights'];
const POLICY_PAGES = ['privacy', 'terms', 'shipping'];

const app = express();
app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.use(compression());

// The series domain and www both go to the main address.
app.use((req, res, next) => {
  const host = String(req.hostname || '').toLowerCase();
  if (host.startsWith('www.') || host.includes('doubletheadventure') || host.includes('a2publishing')) {
    if (host !== 'localhost' && !host.startsWith('127.')) return res.redirect(301, SITE_URL + req.originalUrl);
  }
  next();
});

// Asset addresses carry a fingerprint of the file (/css/site.css?v=ab12cd34), so a deploy never meets a stale copy
// in the browser cache or the Play area's service worker.
const assetHashes = {};
app.locals.asset = (p) => {
  if (!(p in assetHashes)) {
    try { assetHashes[p] = require('crypto').createHash('md5').update(fs.readFileSync(path.join(__dirname, 'public', p))).digest('hex').slice(0, 8); } catch (e) { assetHashes[p] = ''; }
  }
  return assetHashes[p] ? `${p}?v=${assetHashes[p]}` : p;
};

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  setHeaders: (res, file) => { if (file.endsWith(path.sep + 'sw.js')) res.set('Cache-Control', 'no-cache'); }
}));
// Stripe webhook: needs the raw body to check the signature, so it goes before the JSON parser.
app.post('/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!shop.stripe() || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(404).end();
  let event;
  try { event = shop.verify(req.body, req.get('stripe-signature')); } catch (err) { return res.status(400).send('Bad signature'); }
  try { await shop.handleEvent(event); res.json({ received: true }); } catch (err) { console.error('Stripe webhook failed:', err.message); res.status(500).end(); }
});
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));

// Basic security headers. No third-party scripts run on this site.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; media-src 'self'; frame-src https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://checkout.stripe.com"
  );
  next();
});

// ---------- Helpers for every page ----------
function bookView(b, h, req) {
  const title = h.bookTitle(b);
  const store = amazon.storeFor(req.get('accept-language'), h.lang);
  return {
    ...b,
    displayTitle: title,
    titleIsFallback: h.isFallback(b.title),
    cover: bookImage(b.slug, 'cover'),
    coverSmall: coverSmall(b.slug),
    spread: bookImage(b.slug, 'spread'),
    href: h.url('/books/' + b.slug),
    amazonMain: amazon.link(b, title, store),
    amazonStores: amazon.links(b, title, store),
    valueText: h.valueLabel(b),
    cultureText: h.cultureLabel(b)
  };
}

// ---------- SEO helpers ----------
// Fallback share picture for pages that have none of their own.
const DEFAULT_SHARE = fs.existsSync(path.join(__dirname, 'public', 'images', 'share', 'site.png')) ? '/images/share/site.png' : '/images/brand/logo.png';

// Cut a description to a search-friendly length, at a sentence end if possible, else at a word.
function seoTrim(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–—-]+$/, '') + '…';
}

// Structured data on every page: who we are, the site, this page and where it sits, plus any page-specific items.
function baseJsonLd(h, req, seo, fullTitle, canonical, extra) {
  const home = SITE_URL + h.url('/');
  const org = { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'A² Publishing', alternateName: 'Double the Adventure', url: SITE_URL + '/',
    logo: { '@type': 'ImageObject', url: SITE_URL + '/images/brand/logo.png' }, sameAs: ['https://www.facebook.com/A2Publishing'],
    description: h.t('meta.siteDescription') };
  const web = { '@type': 'WebSite', '@id': SITE_URL + '/#site', name: 'Double the Adventure', url: home, inLanguage: h.lang, publisher: { '@id': SITE_URL + '/#org' },
    potentialAction: { '@type': 'SearchAction', target: home.replace(/\/$/, '') + '/search?q={q}', 'query-input': 'required name=q' } };
  const parts = req.basePath.split('/').filter(Boolean);
  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Double the Adventure', item: home }];
  parts.forEach((p, i) => crumbs.push({ '@type': 'ListItem', position: i + 2, name: i === parts.length - 1 && seo.title ? seo.title : p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), item: SITE_URL + h.url('/' + parts.slice(0, i + 1).join('/')) }));
  const webPage = { '@type': 'WebPage', '@id': canonical + '#page', url: canonical, name: fullTitle, description: seo.description, inLanguage: h.lang,
    isPartOf: { '@id': SITE_URL + '/#site' }, primaryImageOfPage: seo.image ? SITE_URL + seo.image : undefined,
    breadcrumb: parts.length ? { '@type': 'BreadcrumbList', itemListElement: crumbs } : undefined };
  const graph = [org, web, webPage];
  const list = extra ? [].concat(extra) : [];
  list.forEach((x) => { if (x['@graph']) graph.push(...x['@graph']); else { const { '@context': _c, ...rest } = x; graph.push(rest); } });
  return { '@context': 'https://schema.org', '@graph': graph };
}

function page(req, res, view, data = {}, status = 200) {
  const h = req.h;
  const seo = Object.assign({ title: '', description: h.t('meta.siteDescription') }, data.seo || {});
  seo.description = seoTrim(seo.description || h.t('meta.siteDescription'), 160);
  if (!seo.image) seo.image = DEFAULT_SHARE;
  const branded = seo.title ? `${seo.title} | A² Publishing` : '';
  const fullTitle = seo.title ? (branded.length <= 62 ? branded : seo.title) : (h.lang === 'fr' ? 'A² Publishing | Albums Double the Adventure pour enfants' : 'A² Publishing | Double the Adventure picture books');
  const canonical = SITE_URL + h.url(req.basePath);
  data = { ...data, jsonLd: baseJsonLd(h, req, seo, fullTitle, canonical, data.jsonLd) };
  const alternates = LANGS.map((l) => ({ lang: l, href: SITE_URL + (l === 'en' ? req.basePath : '/' + l + (req.basePath === '/' ? '/' : req.basePath)) }));
  res.status(status).render('pages/' + view, {
    ...h,
    site,
    catalog,
    seo: { ...seo, fullTitle, canonical },
    alternates,
    storiesLive: readalouds.slugs().length > 0,
    basePath: req.basePath,
    sent: req.query.sent,
    failed: req.query.failed,
    allBooks: catalog.books.map((b) => bookView(b, h, req)),
    featured: bookView(catalog.get(site.featured), h, req),
    bookView: (b) => bookView(b, h, req),
    mapPoints,
    ...data,
    seo: { ...seo, fullTitle, canonical }
  });
}

// ---------- Pages (mounted once for English at / and once for French at /fr) ----------
const router = express.Router();

// Picture cards for "Inside every book" (home, parents, educators).
function showcaseData(h, req) {
  const guides = heroes.list().filter((g) => heroVisible(g) && catalog.get(g.book));
  const animals = [];
  guides.forEach((g) => (g.cast || []).forEach((c) => { const img = heroes.image(g.book, c.image); if (img) animals.push({ image: img, name: h.pick(c.name), animal: h.pick(c.animal), book: g.book }); }));
  const strip = [];
  guides.forEach((g) => { const a = animals.find((x) => x.book === g.book); if (a) strip.push(a); });
  const readSlug = reader.has(site.featured) ? site.featured : reader.slugs()[0];
  const videoSlug = readalouds.forBook(site.featured, h.lang).length ? site.featured : readalouds.slugs()[0];
  return {
    read: readSlug ? { preview: readerPreview(readSlug, h.lang), href: h.url('/stories') + '#read', count: reader.slugs().length } : null,
    watch: videoSlug ? { book: bookView(catalog.get(videoSlug), h, req), count: readalouds.slugs().reduce((n, s) => n + readalouds.forBook(s, 'en').length, 0) } : null,
    animals: { strip: strip.slice(0, 8), count: animals.length },
    color: { pages: play.coloring.slice(0, 3).map((s) => play.pages(s)[0]), count: play.coloring.length },
    snugPage: play.pages('the-snug')[0] || ''
  };
}
router.get('/', (req, res) => page(req, res, 'home', { showcase: showcaseData(req.h, req) }));

router.get('/books', (req, res) => {
  const moment = catalog.moments[req.query.moment] ? req.query.moment : '';
  const extras = {};
  catalog.books.forEach((b) => {
    extras[b.slug] = {
      read: reader.has(b.slug), watch: readalouds.forBook(b.slug, 'en').length > 0,
      animals: heroVisible(heroes.get(b.slug)), play: play.pages(b.slug).length > 0 || play.jigsaw.includes(b.slug)
    };
  });
  const filterRead = req.query.moment === 'read';
  page(req, res, 'books', { moment: filterRead ? 'read' : moment, extras, seo: { title: req.h.t('books.title') } });
});

router.get('/books/coming', (req, res) => page(req, res, 'coming', { seo: { title: req.h.t('coming.title') } }));
router.get('/books/review-team', (req, res) => page(req, res, 'review-team', { seo: { title: req.h.t('reviewTeam.title') } }));

// Book page: the first story spread of the online reader (always inside the free sample), or null.
function readerPreview(slug, lang) {
  const m = reader.has(slug) ? reader.manifest(slug) : null;
  if (!m) return null;
  const l = m.langs.includes(lang) ? lang : (m.langs.includes('en') ? 'en' : m.langs[0]);
  const spread = m.spreads.find((s, i) => i > 0 && i < reader.settings.sampleSpreads && s.length === 2 && s[0] !== 'p01') || m.spreads[1];
  if (!spread) return null;
  return { pages: spread.map((p) => (p === 'blank' ? '/images/blank-page.png' : `/reader/${slug}/${l}/${p}.webp`)), totalPages: m.spreads.reduce((n, s) => n + s.filter((p) => p !== 'cover' && p !== 'blank').length, 0) };
}
// Book page: a short look at the hero guide (portraits, one fact), or null.
function heroTeaser(slug, h) {
  const g = heroes.get(slug);
  if (!heroVisible(g)) return null;
  const fact = (g.place && g.place.facts || []).find((f) => f.kind === 'wow') || (g.place && g.place.facts || [])[0];
  return {
    title: h.pick(g.title), intro: h.pick(g.intro), place: h.pick(g.place && g.place.name),
    placeImage: heroes.image(slug, g.place && g.place.image),
    fact: fact ? { title: h.pick(fact.title), text: h.pick(fact.text) } : null,
    cast: (g.cast || []).map((c) => ({ name: h.pick(c.name), animal: h.pick(c.animal), superpower: h.pick(c.superpower), image: heroes.image(slug, c.image), colour: c.colour }))
  };
}

router.get('/books/:slug', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b) return next();
  const h = req.h;
  const view = bookView(b, h, req);
  const related = catalog.books
    .filter((o) => o.slug !== b.slug && o.status !== 'coming' && o.moments.some((m) => b.moments.includes(m)))
    .slice(0, 4)
    .map((o) => bookView(o, h, req));
  page(req, res, 'book', {
    book: view,
    related,
    bookArticles: articles.forBook(b.slug, h.lang).slice(0, 6),
    readAloud: readalouds.forBook(b.slug, h.lang),
    readHref: reader.has(b.slug) ? h.url('/books/' + b.slug + '/read') : '',
    readPreview: readerPreview(b.slug, h.lang),
    heroTeaser: heroTeaser(b.slug, h),
    colorPages: play.pages(b.slug),
    readOpen: reader.isOpen(b.slug),
    bookPlay: {
      color: play.pages(b.slug).length > 0,
      jigsaw: play.hasCover(b.slug) && play.jigsaw.includes(b.slug),
      memory: play.jigsaw.includes(b.slug),
      map: !!(b.culture && mapPoints.points[b.culture]),
      heroes: heroVisible(heroes.get(b.slug))
    },
    seo: { title: view.displayTitle, description: h.pick(b.blurb) || h.pick(b.subtitle) || h.t('meta.bookDesc').replace('{title}', view.displayTitle).replace('{value}', (view.valueText || '').toLowerCase()), image: shareImage('book', b.slug, view.cover) }
  });
});

// Heroes Encyclopedia: the real animals behind each book (data/heroes/<slug>.json). Drafts show only with SHOW_DRAFTS=1.
const heroVisible = (g) => g && (!g.draft || process.env.SHOW_DRAFTS === '1');
router.get('/heroes', (req, res) => {
  const h = req.h;
  const list = heroes.list().filter((g) => heroVisible(g) && catalog.get(g.book))
    .sort((x, y) => catalog.get(x.book).n - catalog.get(y.book).n)
    .map((g) => ({
      guide: g, book: bookView(catalog.get(g.book), h, req), place: h.pick(g.place && g.place.name),
      cast: (g.cast || []).map((c) => ({ id: c.id, name: h.pick(c.name), animal: h.pick(c.animal), superpower: h.pick(c.superpower), colour: c.colour, image: heroes.image(g.book, c.image), fact: (c.facts || []).find((f) => f.kind === 'wow') || (c.facts || [])[0] }))
    }));
  const all = [];
  list.forEach((x) => x.cast.forEach((c) => { if (c.image && c.fact) all.push({ ...c, book: x.book, guideSlug: x.guide.book }); }));
  // The featured animal changes every day.
  const day = Math.floor(Date.now() / 86400000);
  const spot = all.length ? all[day % all.length] : null;
  if (spot) spot.factText = { title: h.pick(spot.fact.title), text: h.pick(spot.fact.text) };
  const animalCount = list.reduce((n, x) => n + x.cast.length, 0);
  page(req, res, 'heroes', { extraCss: 'heroes', list, spot, animalCount, seo: { title: h.t('heroes.title'), description: h.t('heroes.lead') } });
});
router.get('/heroes/:slug', (req, res, next) => {
  const g = heroes.get(req.params.slug);
  const b = catalog.get(req.params.slug);
  if (!heroVisible(g) || !b) return next();
  const h = req.h;
  const book = bookView(b, h, req);
  const img = (f) => heroes.image(g.book, f);
  const lineup = g.cast.slice().sort((x, y) => x.lineup.grams - y.lineup.grams);
  const lo = Math.log10(lineup[0].lineup.grams), hi = Math.log10(lineup[lineup.length - 1].lineup.grams);
  const size = (grams) => Math.round(64 + ((Math.log10(grams) - lo) / Math.max(hi - lo, 1)) * 112);
  const url = SITE_URL + h.url('/heroes/' + g.book);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: h.pick(g.seoTitle || g.title), description: h.pick(g.description), inLanguage: h.lang, dateModified: g.updated, mainEntityOfPage: url,
        about: g.cast.map((c) => ({ '@type': 'Thing', name: h.pick(c.animal) })),
        author: { '@type': 'Organization', name: 'A² Publishing', url: SITE_URL } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: h.t('heroes.title'), item: SITE_URL + h.url('/heroes') },
        { '@type': 'ListItem', position: 2, name: book.displayTitle, item: url } ] }
    ].concat((g.faq || []).length ? [{ '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: h.pick(f.q), acceptedAnswer: { '@type': 'Answer', text: h.pick(f.a) } })) }] : [])
  };
  page(req, res, 'hero-guide', {
    extraCss: 'heroes',
    guide: g, book, img, lineup, size, jsonLd,
    seo: { title: (() => { const t = h.pick(g.seoTitle || g.title); const b = book.displayTitle; return t.length <= 62 ? t : (h.lang === 'fr' ? 'Les vrais animaux de ' + b : 'The real animals behind ' + b); })(), description: h.pick(g.description), image: book.cover, noindex: g.draft, type: 'article' }
  });
});

// Value hubs: every book, article, game and guide for one value.
const hubValues = () => Object.keys(catalog.values).filter((v) => catalog.books.some((b) => b.value === v && b.status !== 'coming'));
router.get('/values', (req, res) => {
  const h = req.h;
  const items = hubValues().map((v) => ({
    key: v, label: h.pick(catalog.values[v]), href: h.url('/values/' + v),
    book: bookView(catalog.books.find((b) => b.value === v && b.status !== 'coming'), h, req)
  }));
  page(req, res, 'values', { items, seo: { title: h.t('valueHub.indexTitle'), description: h.t('valueHub.indexLead') } });
});
router.get('/values/:value', (req, res, next) => {
  const v = req.params.value;
  if (!hubValues().includes(v)) return next();
  const h = req.h;
  const label = h.pick(catalog.values[v]);
  const list = catalog.books.filter((b) => b.value === v && b.status !== 'coming');
  const bookViews = list.map((b) => ({ ...bookView(b, h, req), idea: (guides.get(b.slug) || {}).childValue || '', hasColor: play.pages(b.slug).length > 0, hasGuide: !!guides.get(b.slug) }));
  const arts = articles.list(h.lang).filter((a) => a.books.some((s) => list.some((b) => b.slug === s)));
  page(req, res, 'value-hub', {
    value: v, label, bookViews, arts,
    others: hubValues().filter((o) => o !== v).map((o) => ({ key: o, label: h.pick(catalog.values[o]), href: h.url('/values/' + o) })),
    seo: { title: h.t('valueHub.pageTitle').replace('{value}', h.lang === 'en' ? label.toLowerCase() : label), description: h.t('valueHub.pageLead').replace('{value}', label.toLowerCase()), image: shareImage('book', list[0].slug, bookViews[0].cover) }
  });
});

// Search: books, articles, values and teacher guides.
router.get('/search', (req, res) => {
  const h = req.h;
  const q = String(req.query.q || '').trim().slice(0, 80);
  let results = [];
  if (q) {
    const docs = [];
    catalog.books.filter((b) => b.status !== 'coming').forEach((b) => {
      const v = bookView(b, h, req);
      docs.push({ kind: 'book', title: v.displayTitle, href: v.href, image: v.cover, boost: 4,
        text: [h.pick(b.subtitle), h.pick(b.blurb), h.pick(b.hero), v.valueText, v.cultureText, h.pick(b.cultureIdea), h.pick(b.refrain), b.moments.map((m) => h.pick(catalog.moments[m])).join(' ')].filter(Boolean).join(' ') });
      if (guides.get(b.slug)) docs.push({ kind: 'guide', title: h.t('guides.pageTitle').replace('{title}', v.displayTitle), href: h.url('/educators/guides/' + b.slug), image: v.cover, text: guides.get(b.slug).summary + ' ' + guides.get(b.slug).questions.join(' ') });
    });
    hubValues().forEach((v) => {
      const label = h.pick(catalog.values[v]);
      docs.push({ kind: 'value', title: h.t('valueHub.pageTitle').replace('{value}', h.lang === 'en' ? label.toLowerCase() : label), href: h.url('/values/' + v), text: label, boost: 2 });
    });
    articles.list(h.lang).forEach((a) => docs.push({ kind: 'article', title: a.title, href: h.url('/parents/articles/' + a.slug), text: a.description + ' ' + a.toc.map((x) => x.text).join(' ') + ' ' + a.faq.map((f) => f.q).join(' '), lang: a.isFallback ? 'en' : '' }));
    results = search.run(docs, q);
  }
  page(req, res, 'search', { q, results, seo: { title: h.t('search.title'), description: h.t('search.lead'), noindex: true } });
});

// Start here: a short "what does your child need right now?" guide.
const startMoments = () => Object.keys(catalog.moments).filter((m) => catalog.books.some((b) => b.status !== 'coming' && b.moments.includes(m)));
router.get('/start', (req, res) => {
  const h = req.h;
  const items = startMoments().map((m) => ({ key: m, label: h.pick(catalog.moments[m]), href: h.url('/start/' + m), count: catalog.books.filter((b) => b.status !== 'coming' && b.moments.includes(m)).length }));
  page(req, res, 'start', { items, seo: { title: h.t('start.title'), description: h.t('start.lead') } });
});
router.get('/start/:moment', (req, res, next) => {
  const m = req.params.moment;
  if (!startMoments().includes(m)) return next();
  const h = req.h;
  // Live books first, then the ones coming soon; a book whose first moment is this one comes first.
  const list = catalog.books.filter((b) => b.status !== 'coming' && b.moments.includes(m))
    .sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || a.moments.indexOf(m) - b.moments.indexOf(m));
  const label = h.pick(catalog.moments[m]);
  const bookViews = list.map((b) => ({ ...bookView(b, h, req), idea: (guides.get(b.slug) || {}).childValue || '', hubHref: h.url('/values/' + b.value) }));
  const arts = articles.list(h.lang).filter((a) => a.books.some((s) => list.some((b) => b.slug === s))).slice(0, 3);
  page(req, res, 'start-result', {
    label, bookViews, arts,
    others: startMoments().filter((o) => o !== m).map((o) => ({ label: h.pick(catalog.moments[o]), href: h.url('/start/' + o) })),
    seo: { title: h.t('start.resultTitle').replace('{moment}', label.toLowerCase()), description: h.t('start.resultLead'), image: shareImage('book', list[0].slug, bookViews[0].cover) }
  });
});

// Story time: read-aloud videos of our books.
router.get('/stories', (req, res) => {
  const h = req.h;
  const list = readalouds.slugs().map((s) => catalog.get(s)).filter(Boolean)
    .map((b) => ({ ...bookView(b, h, req), langs: readalouds.forBook(b.slug, h.lang).map((v) => v.label) }));
  const readList = reader.slugs().map((s) => catalog.get(s)).filter((b) => b && b.status !== 'coming')
    .map((b) => ({ book: bookView(b, h, req), preview: readerPreview(b.slug, h.lang), href: h.url('/books/' + b.slug + '/read') }))
    .filter((r) => r.preview);
  page(req, res, 'stories', { list, readList, seo: { title: h.t('readwatch.title'), description: h.t('readwatch.lead') } });
});

router.get('/values-map', (req, res) => {
  const h = req.h;
  // Every book gets a pin: where its value comes from (books with a culture), or where its story's real animals live (hero guide).
  const atlas = catalog.books.filter((b) => b.status !== 'coming').map((b) => {
    const g = heroes.get(b.slug); const m = g && g.place && g.place.map;
    const culture = b.culture && mapPoints.points[b.culture];
    const pt = culture ? mapPoints.points[b.culture] : (m && m.lat != null ? geo.toMap(m.lat, m.lon) : null);
    return {
      book: bookView(b, h, req), kind: culture ? 'culture' : 'story', pt,
      place: g ? h.pick(g.place.name) : '', guideHref: heroVisible(g) ? h.url('/heroes/' + b.slug) : '',
      idea: h.pick(b.cultureIdea)
    };
  }).filter((x) => x.pt);
  page(req, res, 'values-map', { atlas, seo: { title: h.t('valuesMap.title'), description: h.t('valuesMap.lead') } });
});

router.get('/shop', (req, res) => {
  const h = req.h;
  const open = shop.open();
  page(req, res, 'shop', {
    shopOpen: open,
    liveBooks: catalog.books.filter((b) => b.status === 'live').map((b) => bookView(b, h, req)),
    soonBooks: catalog.books.filter((b) => b.status !== 'live' && b.status !== 'coming').map((b) => bookView(b, h, req)),
    products: open ? shop.priced().map((p) => ({ id: p.id, title: h.pick(p.title), text: h.pick(p.text), price: (p.priceCents / 100).toFixed(2) })) : [],
    seo: { title: h.t('shop.openTitle'), description: open ? h.t('shop.openLead') : h.t('shop.pageLead') }
  });
});
router.get('/shop/thanks', (req, res) => page(req, res, 'shop-thanks', { seo: { title: req.h.t('shop.thanksTitle'), noindex: true } }));
router.post('/shop/checkout', async (req, res) => {
  const b = req.body || {};
  try {
    const url = await shop.createSession({ productId: String(b.product || ''), quantity: b.quantity, lang: LANGS.includes(b.lang) && b.lang === 'fr' ? 'fr' : 'en' });
    if (url) return res.redirect(303, url);
  } catch (err) { console.error('Checkout failed:', err.message); }
  res.redirect(303, (b.lang === 'fr' ? '/fr' : '') + '/shop');
});
// ---------- Book reader: /books/<slug>/read ----------
// Pages come from content/reader/<slug>/ through /reader/... and only for the spreads this visitor may see
// (lib/reader.js). Sample mode while the books are in KDP Select; see data/reader.js.
const readerSales = () => !!shop.stripe();
function readerLang(req, slug) {
  const m = reader.manifest(slug);
  const want = String(req.query.lang || req.h.lang);
  return m.langs.includes(want) ? want : (m.langs.includes(req.h.lang) ? req.h.lang : m.langs[0]);
}
router.get('/books/:slug/read', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b || !reader.has(b.slug)) return next();
  const h = req.h;
  const book = bookView(b, h, req);
  const lang = readerLang(req, b.slug);
  const v = reader.view(req, b.slug, lang, book.cover);
  const m = reader.manifest(b.slug);
  page(req, res, 'reader', {
    readerMode: true,
    book, readLang: lang,
    readLangs: m.langs.map((l) => ({ code: l, name: ({ en: 'English', fr: 'Français', es: 'Español', de: 'Deutsch', it: 'Italiano' })[l] || l.toUpperCase(), href: h.url('/books/' + b.slug + '/read') + '?lang=' + l })),
    config: {
      slug: b.slug, lang, spreads: v.spreads, total: v.total, totalPages: v.totalPages, locked: v.locked, open: v.open, unlocked: v.unlocked,
      bookHref: book.href, amazon: book.amazonMain,
      voice: lang, sales: v.open && readerSales(), price: (reader.settings.priceCents / 100).toFixed(2)
    },
    codeState: String(req.query.code || ''),
    codeHint: reader.prefixFor(b.slug),
    seo: { title: h.t('reader.title') + ': ' + book.displayTitle, description: h.pick(b.blurb) || h.pick(b.subtitle) || '', image: book.cover, noindex: true }
  });
});
router.post('/books/:slug/read/code', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b || !reader.has(b.slug)) return next();
  const back = req.h.url('/books/' + b.slug + '/read');
  if (reader.tooMany(req.ip)) return res.redirect(303, back + '?code=wait#gate');
  const r = reader.redeem((req.body || {}).code);
  // While a book is in KDP Select (sample mode) only demo codes open it.
  if (!r || (!r.demo && !reader.isOpen(b.slug)) || (r.slug && r.slug !== b.slug && !r.all)) return res.redirect(303, back + '?code=bad#gate');
  reader.writeCookie(req, res, r);
  res.redirect(303, back + '?code=ok');
});
router.post('/books/:slug/read/buy', async (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b || !reader.has(b.slug)) return next();
  const h = req.h;
  const back = h.url('/books/' + b.slug + '/read');
  if (!reader.isOpen(b.slug) || !readerSales()) return res.redirect(303, back);
  try {
    const session = await shop.stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: reader.settings.currency, unit_amount: reader.settings.priceCents,
        product_data: { name: (h.lang === 'fr' ? 'Lire en ligne : ' : 'Read online: ') + h.bookTitle(b) } } }],
      success_url: `${SITE_URL}${back}/unlocked?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${back}#gate`,
      locale: h.lang === 'fr' ? 'fr-CA' : 'en',
      metadata: { reader: b.slug, lang: h.lang }
    });
    return res.redirect(303, session.url);
  } catch (err) { console.error('Reader checkout failed:', err.message); }
  res.redirect(303, back + '#gate');
});
// After payment: Stripe's own record says whether it was paid (never the address alone). Gives a code for other devices.
router.get('/books/:slug/read/unlocked', async (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b || !reader.has(b.slug) || !readerSales()) return next();
  const back = req.h.url('/books/' + b.slug + '/read');
  try {
    const s = await shop.stripe().checkout.sessions.retrieve(String(req.query.session_id || '').slice(0, 200));
    if (s && s.payment_status === 'paid' && s.metadata && s.metadata.reader === b.slug) {
      reader.writeCookie(req, res, { slug: b.slug });
      const serial = 'P' + require('crypto').createHash('sha256').update(s.id).digest('hex').slice(0, 6).toUpperCase();
      const code = reader.makeCode(reader.prefixFor(b.slug), serial);
      return page(req, res, 'reader-unlocked', { book: bookView(b, req.h, req), code, readHref: back, seo: { title: req.h.t('reader.unlockedTitle'), noindex: true } });
    }
  } catch (err) { console.error('Reader unlock check failed:', err.message); }
  res.redirect(303, back + '#gate');
});
// Unsubscribe: the link in every email opens a page with one button (so mail scanners can't unsubscribe people by accident).
router.get('/unsubscribe', (req, res) => {
  const e = String(req.query.e || '').toLowerCase().slice(0, 254);
  const ok = EMAIL_RE.test(e) && welcome.validToken(e, String(req.query.t || ''));
  page(req, res, 'unsubscribe', { e, token: String(req.query.t || ''), valid: ok, done: req.query.done === '1', seo: { title: req.h.t('unsub.title'), noindex: true } });
});
router.get('/play', (req, res) => {
  const h = req.h;
  const views = (slugs) => slugs.map((s) => bookView(catalog.get(s), h, req));
  page(req, res, 'play', {
    storyCount: readalouds.slugs().length,
    coloringBooks: views(play.coloring).map((b) => ({ ...b, pageCount: play.pages(b.slug).length })),
    jigsawBooks: views(play.jigsaw),
    memorySizes: play.MEMORY_SIZES,
    seo: { title: h.t('play.title'), description: h.t('play.lead') }
  });
});

// One game page. Everything the game script needs goes in data-config on the page.
function gamePage(req, res, game, book, config, title) {
  const h = req.h;
  const view = book ? bookView(book, h, req) : null;
  const gameDesc = view && (game === 'color' || game === 'jigsaw') ? h.t('meta.' + game + 'Desc').replace('{title}', view.displayTitle) : h.t('play.lead');
  page(req, res, 'play-game', {
    playMode: true,
    gameScript: game,
    game,
    book: view,
    config: {
      game,
      lang: h.lang,
      text: h.t('playGame'),
      book: view ? { title: view.displayTitle, href: view.href, cover: view.cover, amazon: view.amazonMain } : null,
      playHref: h.url('/play'),
      ...config
    },
    seo: { title, description: gameDesc, image: view ? view.cover : '' }
  });
}

router.get('/play/color/:slug', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  const pages = b ? play.pages(b.slug) : [];
  if (!pages.length) return next();
  const n = Math.min(Math.max(parseInt(req.query.p, 10) || 1, 1), pages.length);
  gamePage(req, res, 'color', b, { pages, start: req.query.p ? n - 1 : -1, colorHref: req.h.url('/play/color/' + b.slug) },
    req.h.t('playGame.colorTitle') + ': ' + req.h.bookTitle(b));
});

router.get('/play/jigsaw/:slug', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  if (!b || !play.hasCover(b.slug)) return next();
  const pieces = play.JIGSAW_SIZES.includes(Number(req.query.pieces)) ? Number(req.query.pieces) : 0;
  gamePage(req, res, 'jigsaw', b, { image: '/images/books/' + b.slug + '/cover.jpg', pieces, sizes: play.JIGSAW_SIZES },
    req.h.t('playGame.jigsawTitle') + ': ' + req.h.bookTitle(b));
});

router.get('/play/memory', (req, res) => {
  const h = req.h;
  const pairs = play.MEMORY_SIZES.includes(Number(req.query.pairs)) ? Number(req.query.pairs) : 0;
  const cards = play.jigsaw.map((s) => {
    const v = bookView(catalog.get(s), h, req);
    return { slug: s, title: v.displayTitle, cover: v.cover, href: v.href };
  });
  gamePage(req, res, 'memory', null, { cards, pairs, sizes: play.MEMORY_SIZES }, h.t('playGame.memoryTitle'));
});
router.get('/parents', (req, res) =>
  page(req, res, 'parents', { showcase: showcaseData(req.h, req), latestArticles: articles.list(req.h.lang).slice(0, 3), seo: { title: req.h.t('parents.title') } }));

router.get('/parents/articles', (req, res) => {
  const topic = articles.TOPICS.includes(req.query.topic) ? req.query.topic : '';
  const all = articles.list(req.h.lang);
  page(req, res, 'articles', {
    topic,
    articleList: all,
    topics: articles.TOPICS.filter((tp) => all.some((a) => a.topic === tp)),
    seo: { title: req.h.t('articles.title'), description: req.h.t('articles.lead') }
  });
});

router.get('/parents/articles/:slug', (req, res, next) => {
  const h = req.h;
  const a = articles.get(req.params.slug, h.lang);
  if (!a) return next();
  const books = a.books.map((s) => catalog.get(s)).filter(Boolean).map((b) => bookView(b, h, req));
  const more = articles.list(h.lang).filter((o) => o.slug !== a.slug)
    .sort((x, y) => (y.topic === a.topic) - (x.topic === a.topic)).slice(0, 3);
  const image = a.image || shareImage('article', a.slug, (books[0] && books[0].cover) || '');
  const url = SITE_URL + h.url('/parents/articles/' + a.slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: a.title,
        description: a.description,
        inLanguage: a.lang,
        datePublished: a.date,
        dateModified: a.updated || a.date,
        mainEntityOfPage: url,
        image: image ? SITE_URL + image : undefined,
        author: { '@type': 'Organization', name: 'A² Publishing', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'A² Publishing', logo: { '@type': 'ImageObject', url: SITE_URL + '/images/brand/logo.png' } }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: h.t('nav.parents'), item: SITE_URL + h.url('/parents') },
          { '@type': 'ListItem', position: 2, name: h.t('articles.title'), item: SITE_URL + h.url('/parents/articles') },
          { '@type': 'ListItem', position: 3, name: a.title, item: url }
        ]
      }
    ].concat(a.faq.length ? [{
      '@type': 'FAQPage',
      mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    }] : [])
  };
  page(req, res, 'article', {
    article: a,
    books,
    more,
    jsonLd,
    seo: { title: a.title, description: a.description, image, noindex: a.draft, type: 'article' }
  });
});
router.get('/educators', (req, res) => page(req, res, 'educators', {
  showcase: showcaseData(req.h, req),
  guideCovers: catalog.books.filter((b) => b.status !== 'coming' && guides.get(b.slug)).map((b) => ({ ...bookView(b, req.h, req), hasVideo: readalouds.slugs().includes(b.slug) })),
  classSets: shopData.products.filter((p) => p.educator && Number.isInteger(p.priceCents)).map((p) => ({
    id: p.id,
    title: p.title[req.h.lang] || p.title.en,
    price: (p.priceCents / 100).toFixed(2),
    amazon: (p.books * 11.99).toFixed(2)
  })),
  seo: { title: req.h.t('educators.title') }
}));
// Teacher guides: one printable page per book.
const guideBooks = () => catalog.books.filter((b) => b.status !== 'coming' && guides.get(b.slug));
router.get('/educators/guides', (req, res) => {
  const h = req.h;
  page(req, res, 'guides', {
    guideList: guideBooks().map((b) => bookView(b, h, req)),
    seo: { title: h.t('guides.title'), description: h.t('guides.lead') }
  });
});
router.get('/educators/guides/:slug', (req, res, next) => {
  const b = catalog.get(req.params.slug);
  const g = b && b.status !== 'coming' ? guides.get(b.slug) : null;
  if (!g) return next();
  const h = req.h;
  const view = bookView(b, h, req);
  const arts = articles.forBook(b.slug, h.lang).filter((a) => ['classroom', 'activities', 'reading'].includes(a.topic)).slice(0, 3);
  page(req, res, 'guide', {
    book: view, g, guideArticles: arts,
    g2: guide2.get(b.slug, h.lang),
    hasVideo: readalouds.slugs().includes(b.slug),
    hasHeroes: heroVisible(heroes.get(b.slug)),
    heroPics: (() => { const hg = heroVisible(heroes.get(b.slug)) ? heroes.get(b.slug) : null; if (!hg) return []; return [{ image: heroes.image(b.slug, hg.place && hg.place.image), name: h.pick(hg.place.name) }].concat((hg.cast || []).slice(0, 2).map((c) => ({ image: heroes.image(b.slug, c.image), name: h.pick(c.animal) || h.pick(c.name) }))).filter((p) => p.image); })(),
    hasColor: play.pages(b.slug).length > 0,
    hasJigsaw: play.jigsaw.includes(b.slug),
    seo: { title: h.t('guides.pageTitle').replace('{title}', view.displayTitle), description: h.t('meta.guideDesc').replace('{title}', view.displayTitle).replace('{value}', (view.valueText || '').toLowerCase()), image: view.cover }
  });
});
// ---------- Classroom tools: book finder, big-screen story time, printables ----------
const QRCode = require('qrcode');
// A year of values, September to June. Every book appears once.
const VALUE_YEAR = [
  ['the-snug', 'the-circle-of-paws'],
  ['friendship-bridge', 'the-view-from-down-low'],
  ['rainy-day-shiny-things', 'the-desert-buzz'],
  ['the-light-that-grows', 'secret-hero', 'tumble-and-the-honey-glow'],
  ['eight-times-up', 'knot-by-knot'],
  ['the-pebbles-inside', 'finn-and-coral'],
  ['the-fox-mistake', 'the-honest-little-raccoon'],
  ['becoming-a-tree', 'the-spring-that-wanted-to-stay'],
  ['the-littlest-guardian', 'the-old-path-song'],
  ['pip-the-brave-parrot', 'the-beetle-who-knew-the-stars']
];
function classroomBooks(req) {
  const h = req.h;
  const videos = readalouds.slugs();
  return guideBooks().map((b) => {
    const g = guide2.get(b.slug, h.lang) || {};
    const hasVideo = videos.includes(b.slug);
    const readHref = h.url('/books/' + b.slug + '/read');
    const scanPath = hasVideo ? h.url('/books/' + b.slug) + '#read-aloud' : (reader.has(b.slug) ? readHref : h.url('/books/' + b.slug));
    return { ...bookView(b, h, req), hasVideo, hasReader: reader.has(b.slug), readHref, theme: g.theme || h.pick(b.themeLine) || '', refrain: g.refrain || '', scanUrl: SITE_URL + scanPath };
  });
}
router.get('/educators/classroom', (req, res) => {
  const h = req.h;
  const list = classroomBooks(req);
  const bySlug = Object.fromEntries(list.map((b) => [b.slug, b]));
  const moment = catalog.moments[req.query.moment] ? req.query.moment : '';
  const moments = [...new Set(list.flatMap((b) => b.moments || []))].filter((m) => catalog.moments[m]);
  const months = h.t('classroom.months');
  page(req, res, 'classroom', {
    list, moment, moments,
    year: VALUE_YEAR.map((slugs, i) => ({ month: months[i], books: slugs.map((s) => bySlug[s]).filter(Boolean) })),
    seo: { title: h.t('classroom.title'), description: h.t('classroom.lead') }
  });
});
router.get('/educators/classroom/cards', async (req, res, next) => {
  try {
    const list = classroomBooks(req);
    const pick = list.find((b) => b.slug === req.query.book);
    const cards = await Promise.all((pick ? [pick] : list).map(async (b) => ({ ...b, qr: await QRCode.toString(b.scanUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }) })));
    page(req, res, 'classroom-cards', { cards, seo: { title: req.h.t('classroom.cardsTitle'), description: req.h.t('classroom.cardsLead') } });
  } catch (e) { next(e); }
});
router.get('/educators/classroom/posters', (req, res) => {
  const list = classroomBooks(req);
  const pick = list.find((b) => b.slug === req.query.book);
  page(req, res, 'classroom-posters', { posters: pick ? [pick] : list, single: !!pick, seo: { title: req.h.t('classroom.postersTitle'), description: req.h.t('classroom.postersLead') } });
});
router.get('/educators/libraries/one-sheet', async (req, res, next) => {
  try {
    const list = classroomBooks(req);
    const qr = await QRCode.toString(SITE_URL + req.h.url('/educators'), { type: 'svg', margin: 0 });
    page(req, res, 'one-sheet', { list, qr, sets: shopData.products.filter((p) => p.educator && Number.isInteger(p.priceCents)).map((p) => ({ title: p.title[req.h.lang] || p.title.en, price: (p.priceCents / 100).toFixed(2) })), seo: { title: req.h.t('oneSheet.title'), description: req.h.t('oneSheet.lead') } });
  } catch (e) { next(e); }
});
router.get('/educators/:page', (req, res, next) => {
  if (!EDUCATOR_PAGES.includes(req.params.page)) return next();
  const content = req.h.t('educatorPages.' + req.params.page);
  const videos = readalouds.slugs();
  const guideCovers = content.showBooks ? guideBooks().map((b) => ({ ...bookView(b, req.h, req), hasVideo: videos.includes(b.slug) })) : [];
  page(req, res, 'educator-page', { key: req.params.page, content, guideCovers, seo: { title: content.title, description: content.lead } });
});
router.get('/partners', (req, res) => page(req, res, 'partners', { seo: { title: req.h.t('partners.title') } }));
router.get('/partners/:page', (req, res, next) => {
  if (!PARTNER_PAGES.includes(req.params.page)) return next();
  const content = req.h.t('partnerPages.' + req.params.page);
  page(req, res, 'partner-page', { key: req.params.page, content, seo: { title: content.title, description: content.lead } });
});
router.get('/about', (req, res) => page(req, res, 'about', { seo: { title: req.h.t('about.title'), description: req.h.t('about.lead') + ' ' + req.h.t('about.question') } }));
router.get('/contact', (req, res) => page(req, res, 'contact', { seo: { title: req.h.t('contact.title') } }));
router.get('/faq', (req, res) => page(req, res, 'faq', { seo: { title: req.h.t('faq.title') } }));
router.get('/policies/:page', (req, res, next) => {
  if (!POLICY_PAGES.includes(req.params.page)) return next();
  const content = req.h.t('policies.' + req.params.page);
  page(req, res, 'policy', { content, seo: { title: content.title } });
});

// Short and old addresses.
router.get('/ks', (req, res) => res.redirect(302, site.kickstarterUrl || req.h.url('/books')));
router.get('/our-story', (req, res) => res.redirect(301, req.h.url('/about')));
router.get('/teachers', (req, res) => res.redirect(301, req.h.url('/educators/teachers')));
router.get('/early-years', (req, res) => res.redirect(301, req.h.url('/educators/early-years')));

function withLang(lang) {
  return (req, res, next) => {
    req.h = helpers(lang);
    // The path without the /fr prefix, used for the language switch and canonical links.
    req.basePath = req.path || '/';
    next();
  };
}

// ---------- Forms ----------
// A tiny per-address limit, so a bot can't flood the tables.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 12;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v, max) => String(v || '').trim().slice(0, max);
const ROLE = ['parent', 'educator', 'other'];
const KINDS = ['contact', 'quote', 'visit', 'press', 'stores', 'sponsors', 'rights', 'review-team'];

function finish(req, res, ok, back) {
  const wantsJson = (req.get('accept') || '').includes('application/json');
  if (wantsJson) return res.status(ok ? 200 : 400).json({ ok });
  const formId = clean(req.body.form, 40).replace(/[^a-z0-9-]/gi, '') || 'form';
  const target = new URL(back, 'http://x');
  target.searchParams.delete('sent');
  target.searchParams.delete('failed');
  target.searchParams.set(ok ? 'sent' : 'failed', formId);
  res.redirect(303, target.pathname + target.search + '#' + formId);
}

function safeBack(req) {
  const back = clean(req.body.back, 200);
  return back.startsWith('/') && !back.startsWith('//') ? back : '/';
}

app.post('/api/subscribe', async (req, res) => {
  const b = req.body || {};
  if (b.website) return finish(req, res, true, safeBack(req)); // honeypot
  const email = clean(b.email, 254).toLowerCase();
  const lang = LANGS.includes(b.lang) ? b.lang : 'en';
  const slug = catalog.get(b.book) ? b.book : null;
  if (!EMAIL_RE.test(email) || !b.consent || tooMany(req.ip)) return finish(req, res, false, safeBack(req));
  const table = b.list === 'waitlist' && slug ? 'waitlist' : 'subscribers';
  const row = table === 'waitlist'
    ? { email, book_slug: slug, lang, consent: true }
    : { email, role: ROLE.includes(b.role) ? b.role : null, source: clean(b.source, 80) || null, book_slug: slug, lang, consent: true };
  const result = await insert(table, row);
  if (result.ok) welcome.sendWelcome(row, { waitlist: table === 'waitlist', bookTitle: slug ? (catalog.get(slug).title[lang] || catalog.get(slug).title.en) : '' }).catch(() => {});
  finish(req, res, result.ok, safeBack(req));
});

app.post('/unsubscribe', async (req, res) => {
  const e = String((req.body || {}).e || '').toLowerCase().slice(0, 254);
  const lang = (req.body || {}).lang === 'fr' ? '/fr' : '';
  if (EMAIL_RE.test(e) && welcome.validToken(e, String((req.body || {}).t || ''))) await insert('unsubscribes', { email: e });
  res.redirect(303, `${lang}/unsubscribe?done=1`);
});

app.post('/api/enquire', async (req, res) => {
  const b = req.body || {};
  if (b.website) return finish(req, res, true, safeBack(req));
  const email = clean(b.email, 254).toLowerCase();
  const kind = KINDS.includes(b.kind) ? b.kind : 'contact';
  if (!EMAIL_RE.test(email) || !clean(b.message, 4000) || tooMany(req.ip)) return finish(req, res, false, safeBack(req));
  const row = {
    kind,
    name: clean(b.name, 120) || null,
    email,
    organisation: clean(b.organisation, 160) || null,
    message: (b.topic === 'value' ? '[Value idea] ' : '') + clean(b.message, 3980),
    page: safeBack(req)
  };
  const result = await insert('enquiries', row);
  notify({
    subject: `New ${kind} enquiry from ${row.name || row.email}`,
    text: `Kind: ${kind}\nName: ${row.name || ''}\nEmail: ${row.email}\nOrganisation: ${row.organisation || ''}\nPage: ${row.page}\n\n${row.message}`,
    replyTo: row.email
  }).catch((err) => console.error('Notify failed:', err.message));
  finish(req, res, result.ok, safeBack(req));
});

// ---------- SEO files ----------
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`));

// A plain summary of the site for AI answer engines (llmstxt.org format).
app.get('/llms.txt', (req, res) => {
  const h = helpers('en');
  const books = catalog.books.filter((b) => b.status !== 'coming').map((b) => {
    const blurb = h.pick(b.blurb) || h.pick(b.subtitle) || '';
    return `- [${h.bookTitle(b)}](${SITE_URL}/books/${b.slug}): value: ${h.valueLabel(b)}${h.cultureLabel(b) ? '; tradition: ' + h.cultureLabel(b) : ''}. ${seoTrim(blurb, 220)}`;
  });
  const arts = articles.list('en').filter((a) => !a.draft && !a.isFallback).slice(0, 40).map((a) => `- [${a.title}](${SITE_URL}/parents/articles/${a.slug}): ${seoTrim(a.description || '', 180)}`);
  const guidesList = heroes.published().map((s) => { const b = catalog.get(s); return b ? `- [Real animals behind ${h.bookTitle(b)}](${SITE_URL}/heroes/${s})` : ''; }).filter(Boolean);
  const body = [
    '# A² Publishing: Double the Adventure picture books',
    '',
    '> ' + h.t('meta.siteDescription'),
    '',
    'A² Publishing (Amr Mohamed and Abdallah Shehata, Canada) makes the Double the Adventure series: picture books for children aged 3 to 7. Each book takes one old value from a culture\'s traditional stories (for example Ubuntu, Sankofa, kaitiakitanga, ayni) and tells it through animal heroes, with no religious content. Books are sold on Amazon in paperback and Kindle, with free coloring pages, games, teacher guides, read-aloud videos and articles for parents on this site. The site is in English and French (/fr/).',
    '',
    '## Main pages',
    `- [Books](${SITE_URL}/books): the full catalog`,
    `- [Read and watch](${SITE_URL}/stories): read-aloud videos and the online book reader`,
    `- [Values](${SITE_URL}/values): books, games and guides grouped by value (courage, kindness, honesty...)`,
    `- [Parents](${SITE_URL}/parents) and [articles for parents](${SITE_URL}/parents/articles)`,
    `- [Educators](${SITE_URL}/educators) and [free teacher guides](${SITE_URL}/educators/guides)`,
    `- [Play](${SITE_URL}/play): free coloring, jigsaw and memory games`,
    `- [Shop](${SITE_URL}/shop): Amazon links and classroom sets`,
    `- [About](${SITE_URL}/about) · [FAQ](${SITE_URL}/faq) · [Contact](${SITE_URL}/contact)`,
    '',
    '## Books',
    ...books,
    '',
    guidesList.length ? '## Hero and location guides (real animal facts, with sources)' : '',
    ...guidesList,
    '',
    '## Articles for parents and teachers',
    ...arts,
    ''
  ].join('\n');
  res.type('text/plain; charset=utf-8').send(body);
});

app.get('/sitemap.xml', (req, res) => {
  const paths = ['/', '/stories', '/start', '/values', '/values-map', '/books', '/books/coming', '/books/review-team', '/shop', '/play', '/parents', '/educators', '/partners', '/about', '/contact', '/faq']
    .concat(EDUCATOR_PAGES.map((p) => '/educators/' + p))
    .concat(startMoments().map((m) => '/start/' + m), hubValues().map((v) => '/values/' + v), ['/educators/guides', '/educators/classroom', '/educators/classroom/cards', '/educators/classroom/posters', '/educators/libraries/one-sheet'], guideBooks().map((b) => '/educators/guides/' + b.slug))
    .concat(PARTNER_PAGES.map((p) => '/partners/' + p))
    .concat(POLICY_PAGES.map((p) => '/policies/' + p))
    .concat(catalog.books.map((b) => '/books/' + b.slug))
    .concat(['/parents/articles'])
    .concat(articles.published().map((s) => '/parents/articles/' + s))
    .concat(heroes.published().length ? ['/heroes'] : [], heroes.published().map((s) => '/heroes/' + s))
    .concat(['/play/memory'])
    .concat(play.coloring.map((s) => '/play/color/' + s))
    .concat(play.jigsaw.map((s) => '/play/jigsaw/' + s));
  const loc = (lang, p) => SITE_URL + (lang === 'en' ? p : '/' + lang + (p === '/' ? '/' : p));
  const urls = paths.flatMap((p) =>
    LANGS.map((lang) => {
      const alts = LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${loc(l, p)}"/>`).join('');
      return `<url><loc>${loc(lang, p)}</loc>${alts}</url>`;
    })
  );
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`
  );
});

// Reader files: page images and narration, only for spreads the visitor may see. Never cached by shared caches.
app.get('/reader/:slug/:lang/:name', (req, res) => {
  const f = reader.file(req, req.params.slug, req.params.lang, req.params.name);
  if (!f) return res.status(403).type('text/plain').send('Locked');
  res.set('Cache-Control', 'private, max-age=86400');
  res.set('X-Robots-Tag', 'noindex');
  res.sendFile(f);
});

app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

// French first (so /fr/... isn't read as an English path), then English.
app.use('/fr', withLang('fr'), router);
app.use('/', withLang('en'), router);

// Not found.
app.use((req, res) => {
  const lang = req.originalUrl.startsWith('/fr/') || req.originalUrl === '/fr' ? 'fr' : 'en';
  req.h = helpers(lang);
  req.basePath = '/';
  page(req, res, '404', { seo: { title: req.h.t('notFound.title') } }, 404);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).type('text/plain').send('Something went wrong. Please try again.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`A² Publishing site on http://localhost:${port}`));

module.exports = app;
