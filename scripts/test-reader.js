// Checks the book reader: sample mode keeps the book closed after the sample (KDP Select),
// open mode shows the free spreads, codes unlock, wrong codes don't, and locked files stay locked.
const assert = require('assert');
const http = require('http');

process.env.READER_SECRET = 'test-secret';
process.env.READER_CODE_SECRET = 'test-code-secret';
process.env.PORT = '0';
delete process.env.STRIPE_SECRET_KEY;

const reader = require('../lib/reader');
const SLUG = reader.slugs()[0];
if (!SLUG) { console.log('reader: no books in content/reader yet, skipped'); process.exit(0); }
const m = reader.manifest(SLUG);
const pageOf = (i) => m.spreads[i].find((p) => p !== 'cover');

function get(port, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port, path, method: opts.method || 'GET', headers: opts.headers || {} }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
const post = (port, path, form, cookie) => get(port, path, { method: 'POST', body: new URLSearchParams(form).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) } });

(async () => {
  const app = require('../app');
  await new Promise((r) => setTimeout(r, 300));
  const server = app.listen(0);
  const port = server.address().port;
  const L = m.langs[0];
  const file = (i) => `/reader/${SLUG}/${L}/${pageOf(i)}.webp`;
  try {
    // 1. Sample mode (default): only sampleSpreads open, no code box.
    delete process.env.READER_OPEN;
    let r = await get(port, `/books/${SLUG}/read`);
    assert.strictEqual(r.status, 200, 'reader page');
    assert.ok(!r.body.includes('rd-code-in'), 'no code box while in KDP Select');
    assert.strictEqual((await get(port, file(reader.settings.sampleSpreads - 1))).status, 200, 'last sample page opens');
    assert.strictEqual((await get(port, file(reader.settings.sampleSpreads))).status, 403, 'page after the sample is locked');
    r = await post(port, `/books/${SLUG}/read/code`, { code: reader.makeCode(reader.prefixFor(SLUG), '0001') });
    assert.ok(!String(r.headers['set-cookie'] || '').includes('a2read='), 'codes do nothing in sample mode');

    // 2. Open mode: free spreads, then the gate.
    process.env.READER_OPEN = '1';
    r = await get(port, `/books/${SLUG}/read`);
    assert.ok(r.body.includes('rd-code-in'), 'code box when open');
    assert.strictEqual((await get(port, file(reader.settings.freeSpreads - 1))).status, 200, 'last free page');
    assert.strictEqual((await get(port, file(reader.settings.freeSpreads))).status, 403, 'first paid page locked');

    // 3. A wrong code fails, a right code unlocks this book, a forged cookie doesn't.
    r = await post(port, `/books/${SLUG}/read/code`, { code: reader.prefixFor(SLUG) + '-0001-AAAAAA' });
    assert.ok(/code=bad/.test(r.headers.location), 'wrong code refused');
    r = await post(port, `/books/${SLUG}/read/code`, { code: reader.makeCode(reader.prefixFor(SLUG), '0001').toLowerCase().replace(/-/g, ' ') });
    assert.ok(/code=ok/.test(r.headers.location), 'good code accepted (any case, spaces)');
    const cookie = String(r.headers['set-cookie']).split(';')[0];
    const last = m.spreads.length - 1;
    assert.strictEqual((await get(port, file(last), { headers: { Cookie: cookie } })).status, 200, 'whole book open after the code');
    const forged = cookie.replace(/\.[^.]+$/, '.AAAA');
    assert.strictEqual((await get(port, file(last), { headers: { Cookie: forged } })).status, 403, 'forged cookie refused');

    // 4. A FAMILY code opens every book; another book's code doesn't open this one.
    r = await post(port, `/books/${SLUG}/read/code`, { code: reader.makeCode('FAMILY', '0007') });
    assert.ok(/code=ok/.test(r.headers.location), 'family code accepted');
    const other = Object.keys(reader.settings.codePrefix).find((s) => s !== SLUG);
    r = await post(port, `/books/${SLUG}/read/code`, { code: reader.makeCode(reader.settings.codePrefix[other], '0001') });
    assert.ok(/code=bad/.test(r.headers.location), 'another book\'s code refused');

    // 5. Still-in-Select books stay in sample mode even when open.
    reader.settings.stillInSelect.push(SLUG);
    assert.strictEqual((await get(port, file(last), { headers: { Cookie: cookie } })).status, 403, 'stillInSelect wins over a code');
    reader.settings.stillInSelect.pop();

    // 6. No path tricks.
    assert.strictEqual((await get(port, `/reader/${SLUG}/${L}/..%2Fmanifest.json`)).status, 403, 'no path tricks');
    console.log(`reader: all checks passed (${SLUG})`);
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
})().catch((err) => { console.error('reader test FAILED:', err.message); process.exit(1); });
