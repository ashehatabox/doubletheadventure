// Checks the reviewer area: no access without a link, the link opens it, pages and pictures show, a comment
// and a "perfect page" are saved, the admin inbox needs its password, accepts a comment and exports it.
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.PORT = '0';
process.env.REVIEW_SECRET = 'test-review-secret';
process.env.ADMIN_PASSWORD = 'test-admin';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a2review-'));
delete process.env.SUPABASE_SECRET_KEY;

const review = require('../lib/review');
const SLUG = review.slugs().find((s) => review.book(s).pages.some((p) => p.image));
if (!SLUG) { console.log('review: no books in content/review yet, skipped'); process.exit(0); }
const book = review.book(SLUG);
const page = book.pages.find((p) => p.image && p.sentences.length);

function req(port, p, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ port, path: p, method: opts.method || 'GET', headers: opts.headers || {} }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}
const form = (port, p, data, headers) => req(port, p, { method: 'POST', body: new URLSearchParams(data).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers } });

(async () => {
  const app = require('../app');
  await new Promise((r) => setTimeout(r, 300));
  const server = app.listen(0);
  const port = server.address().port;
  const admin = { Authorization: 'Basic ' + Buffer.from('a:test-admin').toString('base64') };
  try {
    // 1. Closed without a link, and never indexed.
    let r = await req(port, '/review');
    assert.strictEqual(r.status, 401, 'review home needs a link');
    assert.match(r.headers['x-robots-tag'] || '', /noindex/);
    r = await req(port, `/review/img/${SLUG}/${page.id}.webp`);
    assert.strictEqual(r.status, 404, 'pictures need a link');
    r = await req(port, '/review/start/bad.token');
    assert.strictEqual(r.status, 401, 'a bad link is refused');
    r = await req(port, '/review/start/' + review.makeToken({ name: 'Old', days: -1 }));
    assert.strictEqual(r.status, 401, 'an expired link is refused');

    // 2. A good link sets the cookie.
    r = await req(port, '/review/start/' + review.makeToken({ name: 'Camille', days: 30 }));
    assert.strictEqual(r.status, 303);
    const cookie = String(r.headers['set-cookie']).split(';')[0];
    assert.match(cookie, /^a2review=/);
    const c = { Cookie: cookie };

    r = await req(port, '/review', { headers: c });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes(book.title.replace(/'/g, '&#39;')) || r.body.includes(book.title), 'home lists the book');
    assert.ok(r.body.includes('Bonjour Camille'));

    r = await req(port, `/review/${SLUG}?p=${page.id}`, { headers: c });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes(`/review/img/${SLUG}/${page.id}.webp`), 'page shows its picture');
    r = await req(port, `/review/img/${SLUG}/${page.id}.webp`, { headers: c });
    assert.strictEqual(r.status, 200, 'picture served to the reviewer');
    r = await req(port, `/review/${SLUG}?mode=lecture`, { headers: c });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('rv-read-page'), 'reading mode shows the pages');

    // 3. Comment + perfect page.
    r = await form(port, `/review/${SLUG}/comment`, { page: page.id, s: '0', kind: 'correction', proposed: 'Une phrase corrigée.', note: 'Test' }, c);
    assert.strictEqual(r.status, 303);
    assert.match(r.headers.location, /sent=1/);
    r = await form(port, `/review/${SLUG}/comment`, { page: page.id, s: '0', kind: 'suggestion', proposed: page.sentences[0], note: '' }, c);
    assert.doesNotMatch(r.headers.location, /sent=1/, 'an unchanged sentence with no note is not saved');
    r = await form(port, `/review/${SLUG}/ok`, { page: page.id }, c);
    assert.strictEqual(r.status, 303);
    const list = await review.comments({ reviewer: 'Camille' });
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].original, page.sentences[0], 'the original comes from the server, not the form');
    assert.strictEqual((await review.okPages({ reviewer: 'Camille' })).length, 1);
    r = await req(port, `/review/${SLUG}?p=${page.id}`, { headers: c });
    assert.ok(r.body.includes('Une phrase corrigée.'), 'her comment shows on the page');

    // 4. Admin.
    r = await req(port, '/admin/review');
    assert.strictEqual(r.status, 401, 'admin needs the password');
    assert.strictEqual(list[0].status, 'accepted', 'a text change is accepted automatically');
    r = await req(port, '/admin/review?f=accepted', { headers: admin });
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Une phrase corrigée.'));
    const id = list[0].id;
    r = await form(port, '/admin/review/' + id, { action: 'accept', f: 'open' }, admin);
    assert.strictEqual(r.status, 403, 'a change without this site as origin is refused');
    const origin = { ...admin, Origin: 'http://localhost:' + port, Host: 'localhost:' + port };
    r = await form(port, '/admin/review/' + id, { action: 'accept', f: 'open' }, origin);
    assert.strictEqual(r.status, 303);
    r = await form(port, '/admin/review/' + id, { action: 'reply', reply: 'Merci !', f: 'accepted' }, origin);
    r = await req(port, '/admin/review/export.json', { headers: admin });
    const out = JSON.parse(r.body);
    assert.strictEqual(out.books[0].changes[0].replace, 'Une phrase corrigée.');
    assert.strictEqual(out.books[0].changes[0].find, page.sentences[0]);
    r = await form(port, '/admin/review/invite', { name: 'Marie', days: '30' }, origin);
    assert.match(decodeURIComponent(r.headers.location), /\/review\/start\//, 'invite makes a link');
    r = await req(port, `/review/${SLUG}?p=${page.id}`, { headers: c });
    assert.ok(r.body.includes('Merci !'), 'she sees the reply');

    console.log(`review: ok (${review.slugs().length} books, tested ${SLUG} ${page.id})`);
  } finally {
    server.close();
    fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  }
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
