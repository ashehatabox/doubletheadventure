// Routes for the reviewer area (/review, French) and Abdallah's inbox (/admin/review, English).
// Mounted in app.js before the language routers. Logic and storage: lib/review.js.
const crypto = require('crypto');
const review = require('./review');
const settings = require('../data/review');

module.exports = function mount(app, { catalog, SITE_URL }) {
  review.migrateFile().catch((err) => console.error('review:', err.message));
  const noindex = (res) => { res.set('X-Robots-Tag', 'noindex, nofollow'); res.set('Cache-Control', 'private, no-store'); };
  const bookNo = (slug) => { const b = catalog.get(slug); return b ? b.n : 99; };
  const ordered = () => review.slugs().map(review.book).filter(Boolean).sort((a, b) => bookNo(a.slug) - bookNo(b.slug));
  const KIND_FR = { correction: 'Correction', suggestion: 'Suggestion', question: 'Question' };

  function render(res, view, data, status = 200) {
    noindex(res);
    res.status(status).render('review/' + view, { KIND_FR, ...data });
  }
  function needReviewer(req, res, next) {
    const r = review.reviewer(req);
    if (!r) return render(res, 'gone', { title: 'Lien expiré' }, 401);
    req.reviewer = r;
    next();
  }
  const safe = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('review:', err.message);
    render(res, 'gone', { title: 'Un problème', error: true }, 500);
  });

  // ---------- Reviewer ----------
  app.get('/review/start/:token', (req, res) => {
    const r = review.readToken(req.params.token);
    if (!r) return render(res, 'gone', { title: 'Lien expiré' }, 401);
    review.setCookie(req, res, req.params.token, r.expires);
    noindex(res);
    res.redirect(303, '/review');
  });

  app.get('/review', needReviewer, safe(async (req, res) => {
    const name = req.reviewer.name;
    const [mine, ok] = await Promise.all([review.comments({ reviewer: name }), review.okPages({ reviewer: name })]);
    const books = ordered().map((b) => {
      const done = new Set(ok.filter((p) => p.slug === b.slug).map((p) => p.page).concat(mine.filter((c) => c.slug === b.slug).map((c) => c.page)));
      const seen = b.pages.filter((p) => done.has(p.id)).length;
      const count = mine.filter((c) => c.slug === b.slug).length;
      const firstOpen = b.pages.find((p) => !done.has(p.id));
      const status = seen === 0 ? 'À relire' : seen >= b.pages.length ? 'Terminé' : `En cours, ${seen} pages sur ${b.pages.length}`;
      return { slug: b.slug, n: bookNo(b.slug), title: b.title, pages: b.pages.length, status: status + (count ? `, ${count} commentaire${count > 1 ? 's' : ''}` : ''),
        action: seen === 0 ? 'Commencer' : seen >= b.pages.length ? 'Revoir' : 'Continuer',
        href: `/review/${b.slug}` + (firstOpen && seen ? `?p=${firstOpen.id}` : ''), cover: `/images/books/${b.slug}/cover-sm.jpg` };
    });
    const answered = new Set(mine.filter((c) => c.page === 'refrain').map((c) => c.slug));
    const priorities = settings.priorities.map((p) => ({ ...p, answered: answered.has(p.slug) }));
    const have = new Set(books.map((b) => b.slug));
    const missing = catalog.books.filter((b) => !have.has(b.slug) && b.status !== 'coming').map((b) => b.n).sort((a, b) => a - b);
    render(res, 'home', { title: 'Espace relecture', reviewer: req.reviewer, books, priorities, missing, thanks: req.query.merci === '1' });
  }));

  app.post('/review/answer', needReviewer, safe(async (req, res) => {
    const p = settings.priorities.find((x) => x.id === String((req.body || {}).id));
    if (!p) return res.redirect(303, '/review');
    const body = req.body || {};
    if (String(body.proposed || '').trim() || String(body.note || '').trim()) {
      await review.addComment({ reviewer: req.reviewer.name, lang: req.reviewer.lang, slug: p.slug, page: 'refrain', kind: 'question', original: p.text, proposed: body.proposed || p.text, note: body.note });
    }
    res.redirect(303, '/review?merci=1#prio');
  }));

  app.get('/review/img/:slug/:name', (req, res) => {
    if (!review.reviewer(req)) return res.status(404).end();
    const f = review.image(req.params.slug, req.params.name);
    if (!f) return res.status(404).end();
    noindex(res);
    res.sendFile(f);
  });

  app.get('/review/:slug', needReviewer, safe(async (req, res, next) => {
    const b = review.book(req.params.slug);
    if (!b) return next();
    const name = req.reviewer.name;
    const [mine, ok] = await Promise.all([review.comments({ reviewer: name, slug: b.slug }), review.okPages({ reviewer: name, slug: b.slug })]);
    const okSet = new Set(ok.map((p) => p.page));
    let idx = Math.max(0, b.pages.findIndex((p) => p.id === req.query.p));
    const page = b.pages[idx];
    const sel = Math.min(Math.max(0, parseInt(req.query.s, 10) || 0), page.sentences.length - 1);
    const reading = req.query.mode === 'lecture';
    const showEn = req.query.en === '1';
    const qs = (o) => '?' + new URLSearchParams(Object.assign({ p: page.id }, showEn ? { en: '1' } : {}, o)).toString();
    const pageComments = mine.filter((c) => c.page === page.id);
    const commented = new Set(pageComments.map((c) => c.sentence));
    const thumbs = b.pages.map((p, i) => {
      const n = mine.filter((c) => c.page === p.id).length;
      return { id: p.id, num: parseInt(p.id.slice(1), 10), current: i === idx, href: qs({ p: p.id }) + '#page',
        status: n ? (n === 1 ? '1 commentaire' : n + ' commentaires') : okSet.has(p.id) ? 'Parfaite' : 'À relire' };
    });
    render(res, 'book', {
      title: b.title, reviewer: req.reviewer, book: b, page, idx, total: b.pages.length, sel, reading, showEn,
      sentences: page.sentences.map((t, i) => ({ text: t, i, selected: i === sel, commented: commented.has(i), href: qs({ s: String(i) }) + '#panel' })),
      thumbs, pageComments, sent: req.query.sent === '1', pageOk: okSet.has(page.id),
      prevHref: idx > 0 ? qs({ p: b.pages[idx - 1].id }) + '#page' : '', nextHref: idx < b.pages.length - 1 ? qs({ p: b.pages[idx + 1].id }) + '#page' : '',
      enHref: '?' + new URLSearchParams(Object.assign({ p: page.id, s: String(sel) }, showEn ? {} : { en: '1' })).toString() + '#page',
      readHref: `/review/${b.slug}?mode=lecture#${page.id}`, reviewHref: `/review/${b.slug}${qs({})}#page`
    });
  }));

  app.post('/review/:slug/comment', needReviewer, safe(async (req, res, next) => {
    const b = review.book(req.params.slug);
    if (!b) return next();
    const body = req.body || {};
    const page = b.pages.find((p) => p.id === body.page) || b.pages[0];
    const s = Math.min(Math.max(0, parseInt(body.s, 10) || 0), page.sentences.length - 1);
    const proposed = String(body.proposed || '').trim();
    const note = String(body.note || '').trim();
    const back = (extra) => `/review/${b.slug}?` + new URLSearchParams(Object.assign({ p: page.id, s: String(s) }, body.en === '1' ? { en: '1' } : {}, extra)).toString() + '#panel';
    if (!note && (!proposed || proposed === page.sentences[s])) return res.redirect(303, back({}));
    await review.addComment({ reviewer: req.reviewer.name, lang: req.reviewer.lang, slug: b.slug, page: page.id, sentence: s, kind: body.kind, original: page.sentences[s], proposed: proposed || page.sentences[s], note });
    res.redirect(303, back({ sent: '1' }));
  }));

  app.post('/review/:slug/ok', needReviewer, safe(async (req, res, next) => {
    const b = review.book(req.params.slug);
    if (!b) return next();
    const body = req.body || {};
    const i = Math.max(0, b.pages.findIndex((p) => p.id === body.page));
    await review.markPage(req.reviewer.name, b.slug, b.pages[i].id);
    const next_ = b.pages[i + 1];
    if (!next_) return res.redirect(303, '/review?merci=1');
    res.redirect(303, `/review/${b.slug}?` + new URLSearchParams(Object.assign({ p: next_.id }, body.en === '1' ? { en: '1' } : {})).toString() + '#page');
  }));

  // ---------- Admin: /admin/review (English) ----------
  // HTTP Basic sign-in with ADMIN_PASSWORD (any user name). Without ADMIN_PASSWORD the inbox doesn't exist.
  function needAdmin(req, res, next) {
    const pass = process.env.ADMIN_PASSWORD;
    if (!pass) return res.status(404).type('text/plain').send('Not found');
    const m = String(req.headers.authorization || '').match(/^Basic (.+)$/);
    const given = m ? Buffer.from(m[1], 'base64').toString('utf8').split(':').slice(1).join(':') : '';
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(pass).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      res.set('WWW-Authenticate', 'Basic realm="A2 admin", charset="UTF-8"');
      return res.status(401).type('text/plain').send('Sign in needed');
    }
    // Basic auth is sent on cross-site requests too: a change must come from this site's own pages.
    if (req.method === 'POST') {
      const from = String(req.get('origin') || req.get('referer') || '');
      const host = req.get('host');
      if (!from || !(from.startsWith('https://' + host) || from.startsWith('http://' + host))) return res.status(403).type('text/plain').send('Forbidden');
    }
    noindex(res);
    next();
  }
  const FILTERS = { open: 'Open', accepted: 'Accepted, to fix in Canva', fixed: 'Fixed', kept: 'Kept as is' };
  const KIND_EN = { correction: 'Correction', suggestion: 'Suggestion', question: 'Question' };

  app.get('/admin/review', needAdmin, safe(async (req, res) => {
    const f = FILTERS[req.query.f] ? req.query.f : 'open';
    const all = await review.comments({});
    const ok = await review.okPages({});
    const counts = Object.fromEntries(Object.keys(FILTERS).map((k) => [k, all.filter((c) => c.status === k).length]));
    const where = (c) => {
      const b = catalog.get(c.slug);
      const n = b ? 'Book ' + b.n : c.slug;
      return c.page === 'refrain' ? n + ', refrain' : n + ', page ' + parseInt(String(c.page).slice(1), 10);
    };
    const items = all.filter((c) => c.status === f).reverse().map((c) => ({ ...c, kindLabel: KIND_EN[c.kind] || c.kind, where: where(c),
      when: new Date(c.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }),
      pageHref: c.page === 'refrain' ? '' : '/admin/review/open?' + new URLSearchParams({ to: `/review/${c.slug}?p=${c.page}&s=${c.sentence || 0}` }).toString() }));
    const reviewers = Array.from(new Set(all.map((c) => c.reviewer).concat(ok.map((p) => p.reviewer))));
    const invite = req.query.link ? { link: String(req.query.link), name: String(req.query.name || '') } : null;
    render(res, 'admin', { title: 'French review', f, FILTERS, counts, items, reviewers, okCount: ok.length, invite, storage: review.storageLabel(), safe: review.useSupabase() || process.env.NODE_ENV !== 'production' });
  }));

  // Opens a reviewer page for Abdallah himself (a short preview link in his browser).
  app.get('/admin/review/open', needAdmin, (req, res) => {
    const to = String(req.query.to || '/review');
    const token = review.makeToken({ name: 'Abdallah', lang: 'fr', days: 7 });
    review.setCookie(req, res, token, Date.now() + 7 * 864e5);
    res.redirect(303, /^\/review(\/[a-z0-9-]+)?(\?[^#]*)?$/.test(to) ? to + '#panel' : '/review');
  });

  app.post('/admin/review/invite', needAdmin, (req, res) => {
    const name = String((req.body || {}).name || '').trim().slice(0, 60) || 'Reviewer';
    const days = Math.min(365, Math.max(1, parseInt((req.body || {}).days, 10) || 60));
    const token = review.makeToken({ name, lang: 'fr', days });
    const link = SITE_URL + '/review/start/' + token;
    res.redirect(303, '/admin/review?' + new URLSearchParams({ link, name }).toString() + '#invite');
  });

  app.post('/admin/review/:id', needAdmin, safe(async (req, res) => {
    const body = req.body || {};
    const changes = {};
    if (body.action === 'accept') changes.status = 'accepted';
    if (body.action === 'keep') changes.status = 'kept';
    if (body.action === 'fixed') changes.status = 'fixed';
    if (body.action === 'reopen') changes.status = 'open';
    if (body.action === 'reply') changes.reply = String(body.reply || '');
    await review.updateComment(req.params.id, changes);
    res.redirect(303, '/admin/review?f=' + encodeURIComponent(String(body.f || 'open')));
  }));

  // Accepted changes, ready for the Canva text fixes (same book + page + French lines as the translations files).
  app.get('/admin/review/export.json', needAdmin, safe(async (req, res) => {
    const rows = await review.comments({ status: 'accepted' });
    const out = {};
    rows.forEach((c) => {
      const b = catalog.get(c.slug);
      const key = c.slug;
      out[key] = out[key] || { book: b ? b.n : null, slug: c.slug, title: (review.book(c.slug) || {}).title || c.slug, changes: [] };
      out[key].changes.push({ page: c.page, lang: c.lang, find: c.original, replace: c.proposed, kind: c.kind, note: c.note, by: c.reviewer, id: c.id });
    });
    res.set('Content-Disposition', 'attachment; filename="review-accepted-' + new Date().toISOString().slice(0, 10) + '.json"');
    res.json({ exported_at: new Date().toISOString(), books: Object.values(out).sort((a, b) => (a.book || 99) - (b.book || 99)) });
  }));
};
