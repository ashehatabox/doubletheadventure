// A² Publishing / Double the Adventure website — Express app.
// On GoDaddy (cPanel "Setup Node.js App") set the startup file to app.js.

require('dotenv').config();

const path = require('path');
const express = require('express');
const compression = require('compression');

const site = require('./data/site');
const catalog = require('./data/books');
const { helpers, bookImage, LANGS } = require('./lib/i18n');
const amazon = require('./lib/amazon');
const { insert } = require('./lib/supabase');
const { notify } = require('./lib/mailer');

const SITE_URL = (process.env.SITE_URL || 'https://a2publishing.ca').replace(/\/$/, '');
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
  if (host.startsWith('www.') || host.includes('doubletheadventure')) {
    if (host !== 'localhost' && !host.startsWith('127.')) return res.redirect(301, SITE_URL + req.originalUrl);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));

// Basic security headers. No third-party scripts run on this site.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
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
    spread: bookImage(b.slug, 'spread'),
    href: h.url('/books/' + b.slug),
    amazonMain: amazon.link(b, title, store),
    amazonStores: amazon.links(b, title, store),
    valueText: h.valueLabel(b),
    cultureText: h.cultureLabel(b)
  };
}

function page(req, res, view, data = {}, status = 200) {
  const h = req.h;
  const seo = Object.assign({ title: '', description: h.t('meta.siteDescription') }, data.seo || {});
  const fullTitle = seo.title ? `${seo.title} | A² Publishing` : 'A² Publishing | Double the Adventure picture books';
  const alternates = LANGS.map((l) => ({ lang: l, href: SITE_URL + (l === 'en' ? req.basePath : '/' + l + (req.basePath === '/' ? '/' : req.basePath)) }));
  res.status(status).render('pages/' + view, {
    ...h,
    site,
    catalog,
    seo: { ...seo, fullTitle, canonical: SITE_URL + h.url(req.basePath) },
    alternates,
    basePath: req.basePath,
    sent: req.query.sent,
    failed: req.query.failed,
    allBooks: catalog.books.map((b) => bookView(b, h, req)),
    featured: bookView(catalog.get(site.featured), h, req),
    bookView: (b) => bookView(b, h, req),
    ...data
  });
}

// ---------- Pages (mounted once for English at / and once for French at /fr) ----------
const router = express.Router();

router.get('/', (req, res) => page(req, res, 'home'));

router.get('/books', (req, res) => {
  const moment = catalog.moments[req.query.moment] ? req.query.moment : '';
  page(req, res, 'books', { moment, seo: { title: req.h.t('books.title') } });
});

router.get('/books/coming', (req, res) => page(req, res, 'coming', { seo: { title: req.h.t('coming.title') } }));
router.get('/books/review-team', (req, res) => page(req, res, 'review-team', { seo: { title: req.h.t('reviewTeam.title') } }));

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
    seo: { title: view.displayTitle, description: h.pick(b.blurb) || h.pick(b.subtitle) || h.t('meta.siteDescription'), image: view.cover }
  });
});

router.get('/shop', (req, res) => page(req, res, 'shop', { seo: { title: req.h.t('shop.title') } }));
router.get('/play', (req, res) => page(req, res, 'play', { seo: { title: req.h.t('play.title') } }));
router.get('/parents', (req, res) => page(req, res, 'parents', { seo: { title: req.h.t('parents.title') } }));
router.get('/educators', (req, res) => page(req, res, 'educators', { seo: { title: req.h.t('educators.title') } }));
router.get('/educators/:page', (req, res, next) => {
  if (!EDUCATOR_PAGES.includes(req.params.page)) return next();
  const content = req.h.t('educatorPages.' + req.params.page);
  page(req, res, 'educator-page', { key: req.params.page, content, seo: { title: content.title, description: content.lead } });
});
router.get('/partners', (req, res) => page(req, res, 'partners', { seo: { title: req.h.t('partners.title') } }));
router.get('/partners/:page', (req, res, next) => {
  if (!PARTNER_PAGES.includes(req.params.page)) return next();
  const content = req.h.t('partnerPages.' + req.params.page);
  page(req, res, 'partner-page', { key: req.params.page, content, seo: { title: content.title, description: content.lead } });
});
router.get('/about', (req, res) => page(req, res, 'about', { seo: { title: req.h.t('about.title') } }));
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
  finish(req, res, result.ok, safeBack(req));
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
    message: clean(b.message, 4000),
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

app.get('/sitemap.xml', (req, res) => {
  const paths = ['/', '/books', '/books/coming', '/books/review-team', '/shop', '/play', '/parents', '/educators', '/partners', '/about', '/contact', '/faq']
    .concat(EDUCATOR_PAGES.map((p) => '/educators/' + p))
    .concat(PARTNER_PAGES.map((p) => '/partners/' + p))
    .concat(POLICY_PAGES.map((p) => '/policies/' + p))
    .concat(catalog.books.map((b) => '/books/' + b.slug));
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
