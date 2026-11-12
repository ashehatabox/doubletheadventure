// The book reader: which spreads a visitor may see, book codes, and the unlock cookie.
// Every page image and narration clip goes through here; nothing of a book is in public/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const settings = require('../data/reader');

const ROOT = path.join(__dirname, '..', 'content', 'reader');
const COOKIE = 'a2read';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1: easy to type from a printed page

// Secrets. Without them (local tests) a random one is used, so unlocks last until the next restart.
const fallback = crypto.randomBytes(32).toString('hex');
const secret = () => process.env.READER_SECRET || fallback;
const codeSecret = () => process.env.READER_CODE_SECRET || process.env.READER_SECRET || fallback;
if (!process.env.READER_SECRET && process.env.NODE_ENV === 'production') console.warn('READER_SECRET is not set: reader unlocks will not survive a restart.');

// ---------- Books ----------
const cache = new Map();
function manifest(slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (cache.has(slug)) return cache.get(slug);
  const file = path.join(ROOT, slug, 'manifest.json');
  let m = null;
  if (fs.existsSync(file)) {
    m = JSON.parse(fs.readFileSync(file, 'utf8'));
    m.langs = Object.keys(m.languages || {}).filter((l) => fs.existsSync(path.join(ROOT, slug, l)));
  }
  cache.set(slug, m);
  return m;
}
const has = (slug) => { const m = manifest(slug); return !!(m && m.langs.length); };
const slugs = () => (fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter(has) : []);

// Open = out of KDP Select: free spreads plus code/payment unlock. Otherwise sample mode.
const stillSelect = (slug) => {
  const end = (settings.selectEnds || {})[slug];
  return settings.stillInSelect.includes(slug) || (!!end && new Date().toISOString().slice(0, 10) <= end);
};
const isOpen = (slug) => process.env.READER_OPEN === '1' && !stillSelect(slug);
const freeCount = (slug) => (isOpen(slug) ? settings.freeSpreads : settings.sampleSpreads);

// ---------- Unlock cookie: a signed list of unlocked books ----------
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');
function readCookie(req) {
  const raw = String(req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return { books: [], all: false, demo: false };
  const [data, mac] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  if (!data || !mac) return { books: [], all: false, demo: false };
  const good = sign(data);
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return { books: [], all: false, demo: false };
  try {
    const v = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return { books: Array.isArray(v.b) ? v.b : [], all: v.a === 1, demo: v.d === 1 };
  } catch { return { books: [], all: false, demo: false }; }
}
function writeCookie(req, res, { slug, all, demo }) {
  const cur = readCookie(req);
  const books = Array.from(new Set(cur.books.concat(slug ? [slug] : []))).slice(0, 60);
  const data = Buffer.from(JSON.stringify({ b: books, a: all || cur.all ? 1 : 0, d: demo || cur.demo ? 1 : 0 })).toString('base64url');
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.append('Set-Cookie', `${COOKIE}=${data}.${sign(data)}; Path=/; Max-Age=${60 * 60 * 24 * 400}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}
const unlocked = (req, slug) => { const c = readCookie(req); return c.demo || (isOpen(slug) && (c.all || c.books.includes(slug))); };

// How many spreads this visitor may see.
function allowed(req, slug) {
  const m = manifest(slug);
  if (!m) return 0;
  return unlocked(req, slug) ? m.spreads.length : Math.min(freeCount(slug), m.spreads.length);
}

// ---------- Book codes: PREFIX-SERIAL-CHECK, checked without a database ----------
function check(prefix, serial) {
  const mac = crypto.createHmac('sha256', codeSecret()).update(prefix + '|' + serial).digest();
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[mac[i] % ALPHABET.length];
  return out;
}
const makeCode = (prefix, serial) => `${prefix}-${serial}-${check(prefix, serial)}`;
const prefixFor = (slug) => settings.codePrefix[slug] || slug.split('-').map((w) => w[0]).join('').toUpperCase();

// Returns { all } or { slug } when the code is good, otherwise null.
function redeem(input) {
  const flat = String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  if ((settings.demoCodes || []).includes(flat)) return { demo: true, all: true };
  const code = String(input || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const parts = code.split('-');
  if (parts.length !== 3) return null;
  const [prefix, serial, mac] = parts;
  if (!/^[A-Z0-9]{2,8}$/.test(serial) || mac.length !== 6) return null;
  if (settings.revoked.includes(code)) return null;
  const good = check(prefix, serial);
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  if (prefix === 'FAMILY') return { all: true };
  const slug = Object.keys(settings.codePrefix).find((s) => settings.codePrefix[s] === prefix);
  return slug ? { slug } : null;
}

// Slow down guessing: 10 tries per address per 10 minutes.
const tries = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (tries.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  tries.set(ip, list);
  if (tries.size > 5000) tries.clear();
  return list.length > 10;
}

// ---------- Files ----------
// The file for one page or narration clip, or null when it isn't in a spread this visitor may see.
function file(req, slug, lang, name) {
  const m = manifest(slug);
  if (!m || !m.langs.includes(lang)) return null;
  const limit = allowed(req, slug);
  let idx = -1;
  let rel = null;
  let mt = name.match(/^(p\d{2})\.webp$/);
  if (mt) { idx = m.spreads.findIndex((s) => s.includes(mt[1])); rel = path.join(lang, name); }
  mt = name.match(/^s(\d{2})\.mp3$/);
  if (mt) { idx = parseInt(mt[1], 10); rel = path.join(lang, 'audio', name); }
  if (idx < 0 || idx >= limit || !rel) return null;
  const full = path.join(ROOT, slug, rel);
  return fs.existsSync(full) ? full : null;
}

// What the reader page needs: only the spreads this visitor may see (images, text, audio).
function view(req, slug, lang, coverUrl) {
  const m = manifest(slug);
  const L = m.languages[lang] || {};
  const limit = allowed(req, slug);
  const base = `/reader/${slug}/${lang}/`;
  const spreads = m.spreads.slice(0, limit).map((pages, i) => ({
    pages: pages.map((p) => (p === 'blank' ? { src: '/images/blank-page.png', text: '', blank: true } : { src: p === 'cover' ? coverUrl : base + p + '.webp', text: (L.text || {})[p] || '' })),
    audio: fs.existsSync(path.join(ROOT, slug, lang, 'audio', `s${String(i).padStart(2, '0')}.mp3`)) ? `${base}s${String(i).padStart(2, '0')}.mp3` : ''
  }));
  return { spreads, total: m.spreads.length, totalPages: m.spreads.reduce((n, sp) => n + sp.filter((p) => p !== 'blank').length, 0), locked: limit < m.spreads.length, open: isOpen(slug), unlocked: unlocked(req, slug) };
}

module.exports = { manifest, has, slugs, isOpen, allowed, unlocked, file, view, redeem, tooMany, writeCookie, makeCode, prefixFor, settings };
