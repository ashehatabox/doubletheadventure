// The reviewer area (/review): a private place where a language reviewer reads each book page by page and
// comments on the translated text. Abdallah sees the comments in /admin/review.
//
// - Access: a signed link (/review/start/<token>) sets a cookie. No account, no password. Tokens carry the
//   reviewer's name, the language and an end date, signed with REVIEW_SECRET.
// - Text: content/review/<slug>.json, made by scripts/add-review-book.js from the project's translations files.
// - Pictures: the reader's page images (content/reader/<slug>/<lang>/), served only to a reviewer.
// - Storage: Supabase tables review_comments and review_pages when SUPABASE_SECRET_KEY is set (the secret key
//   can read rows back; the publishable key can't), otherwise a JSON file in DATA_DIR (local tests).
// The area shows whole books, so it is never public: every page is noindex and needs the cookie.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'review');
const READER = path.join(ROOT, 'content', 'reader');
// GoDaddy's /private folder survives deploys (the app folder does not), so a fallback file lives there.
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/private') ? '/private' : path.join(ROOT, 'data'));
const COOKIE = 'a2review';

const fallback = crypto.randomBytes(32).toString('hex');
const secret = () => process.env.REVIEW_SECRET || process.env.READER_SECRET || fallback;
if (!process.env.REVIEW_SECRET && !process.env.READER_SECRET && process.env.NODE_ENV === 'production') console.warn('REVIEW_SECRET is not set: reviewer links stop working after a restart.');

// ---------- Links ----------
const sign = (data) => crypto.createHmac('sha256', secret()).update('review|' + data).digest('base64url');
function makeToken({ name, lang = 'fr', days = 60 }) {
  const data = Buffer.from(JSON.stringify({ n: String(name || 'Reviewer').slice(0, 60), l: lang, e: Date.now() + days * 864e5 })).toString('base64url');
  return data + '.' + sign(data);
}
function readToken(token) {
  const [data, mac] = String(token || '').split('.');
  if (!data || !mac) return null;
  const good = sign(data);
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  try {
    const v = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!v.e || v.e < Date.now()) return null;
    return { name: v.n, lang: v.l || 'fr', expires: v.e };
  } catch { return null; }
}
function reviewer(req) {
  const raw = String(req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  return raw ? readToken(decodeURIComponent(raw.slice(COOKIE.length + 1))) : null;
}
function setCookie(req, res, token, expires) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  const maxAge = Math.max(60, Math.floor((expires - Date.now()) / 1000));
  res.append('Set-Cookie', `${COOKIE}=${token}; Path=/review; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

// ---------- Books ----------
// French lines split into sentences, so each one can be tapped. A sentence ends at . ! ? … (and a closing »
// right after), when the next one starts with a capital or an opening quote.
function sentences(line) {
  return String(line).split(/(?<=[.!?…](?:\s?»)?)\s+(?=[«“"A-ZÀ-ÖØ-Þ—])/u).map((s) => s.trim()).filter(Boolean);
}
const cache = new Map();
function book(slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (cache.has(slug)) return cache.get(slug);
  const file = path.join(CONTENT, slug + '.json');
  let b = null;
  if (fs.existsSync(file)) {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const pages = Object.keys(d.pages).map((id) => ({
      id, en: d.pages[id].en || '', lines: d.pages[id].text,
      sentences: d.pages[id].text.flatMap(sentences),
      image: fs.existsSync(path.join(READER, slug, 'en', id + '.webp')) ? `/review/img/${slug}/${id}.webp` : ''
    }));
    b = { slug, lang: d.lang || 'fr', title: d.title || slug, pages };
  }
  cache.set(slug, b);
  return b;
}
const slugs = () => (fs.existsSync(CONTENT) ? fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : []);
function image(slug, name) {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^p\d{2}\.webp$/.test(name)) return null;
  const full = path.join(READER, slug, 'en', name);
  return fs.existsSync(full) ? full : null;
}

// ---------- Storage ----------
// The project's address is public (it is in .env.example too); only the secret key must come from the server's settings.
const sbUrl = () => process.env.SUPABASE_URL || 'https://qhecthlbcqsuovpoykgd.supabase.co';
const sbKey = () => process.env.SUPABASE_SECRET_KEY;
const useSupabase = () => !!(sbUrl() && sbKey());
async function sb(method, table, query = '', body) {
  const res = await fetch(`${sbUrl()}/rest/v1/${table}${query}`, {
    method,
    headers: { apikey: sbKey(), 'Content-Type': 'application/json', Prefer: method === 'GET' ? '' : 'return=representation,resolution=merge-duplicates' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}
const FILE = () => path.join(DATA_DIR, 'review-store.json');
function load() {
  try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { return { comments: [], pages: [] }; }
}
function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(db, null, 1));
}

const KINDS = ['correction', 'suggestion', 'question'];
const STATUSES = ['open', 'accepted', 'kept', 'fixed'];
const clean = (s, n) => String(s || '').replace(/\r/g, '').trim().slice(0, n);

async function addComment(c) {
  const row = {
    id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    reviewer: clean(c.reviewer, 60), lang: clean(c.lang, 5) || 'fr', slug: clean(c.slug, 60), page: clean(c.page, 20),
    sentence: Number.isInteger(c.sentence) ? c.sentence : null, kind: KINDS.includes(c.kind) ? c.kind : 'suggestion',
    original: clean(c.original, 2000), proposed: clean(c.proposed, 2000), note: clean(c.note, 2000), status: 'open', reply: ''
  };
  // Abdallah's rule (Nov 27, 2026): every text change a reviewer sends is accepted automatically, for all reviewers.
  // Notes or questions without new text stay open so he can answer them.
  if (row.proposed && row.proposed !== row.original) row.status = 'accepted';
  if (useSupabase()) { await sb('POST', 'review_comments', '', row); return row; }
  const db = load(); db.comments.push(row); save(db); return row;
}
async function comments(filter = {}) {
  let rows;
  if (useSupabase()) {
    const q = ['order=created_at.asc', 'limit=2000'];
    if (filter.slug) q.push('slug=eq.' + encodeURIComponent(filter.slug));
    if (filter.reviewer) q.push('reviewer=eq.' + encodeURIComponent(filter.reviewer));
    if (filter.status) q.push('status=eq.' + encodeURIComponent(filter.status));
    rows = await sb('GET', 'review_comments', '?' + q.join('&'));
  } else {
    rows = load().comments.filter((r) => (!filter.slug || r.slug === filter.slug) && (!filter.reviewer || r.reviewer === filter.reviewer) && (!filter.status || r.status === filter.status));
  }
  return rows;
}
async function updateComment(id, changes) {
  const patch = { updated_at: new Date().toISOString() };
  if (changes.status && STATUSES.includes(changes.status)) patch.status = changes.status;
  if (typeof changes.reply === 'string') patch.reply = clean(changes.reply, 2000);
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return null;
  if (useSupabase()) { const r = await sb('PATCH', 'review_comments', '?id=eq.' + id, patch); return r[0] || null; }
  const db = load();
  const row = db.comments.find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, patch); save(db); return row;
}
// Pages the reviewer marked "perfect".
async function markPage(reviewerName, slug, page) {
  const row = { reviewer: clean(reviewerName, 60), slug: clean(slug, 60), page: clean(page, 20), ok_at: new Date().toISOString() };
  if (useSupabase()) { await sb('POST', 'review_pages', '?on_conflict=reviewer,slug,page', row); return; }
  const db = load();
  if (!db.pages.some((p) => p.reviewer === row.reviewer && p.slug === row.slug && p.page === row.page)) { db.pages.push(row); save(db); }
}
async function okPages(filter = {}) {
  if (useSupabase()) {
    const q = ['limit=5000'];
    if (filter.slug) q.push('slug=eq.' + encodeURIComponent(filter.slug));
    if (filter.reviewer) q.push('reviewer=eq.' + encodeURIComponent(filter.reviewer));
    return sb('GET', 'review_pages', '?' + q.join('&'));
  }
  return load().pages.filter((p) => (!filter.slug || p.slug === filter.slug) && (!filter.reviewer || p.reviewer === filter.reviewer));
}

// When the database is set up, comments saved earlier in a file (no key at the time) move into it, once.
async function migrateFile() {
  if (!useSupabase()) {
    if (process.env.NODE_ENV === 'production') console.warn('SUPABASE_SECRET_KEY is not set: reviewer comments are saved in ' + FILE() + ' only.');
    return 0;
  }
  const files = [FILE(), path.join(ROOT, 'data', 'review-store.json')].filter((f, i, a) => a.indexOf(f) === i && fs.existsSync(f));
  let moved = 0;
  for (const f of files) {
    try {
      const db = JSON.parse(fs.readFileSync(f, 'utf8'));
      if ((db.comments || []).length) await sb('POST', 'review_comments', '?on_conflict=id', db.comments);
      if ((db.pages || []).length) await sb('POST', 'review_pages', '?on_conflict=reviewer,slug,page', db.pages);
      moved += (db.comments || []).length;
      fs.renameSync(f, f + '.moved-' + Date.now());
      console.log(`review: moved ${moved} comments from ${f} into Supabase`);
    } catch (err) { console.error('review: could not move ' + f + ': ' + err.message); }
  }
  return moved;
}
const storageLabel = () => (useSupabase() ? 'Supabase' : 'a file on the server (' + FILE() + ')');

module.exports = { migrateFile, storageLabel, makeToken, readToken, reviewer, setCookie, book, slugs, image, sentences, addComment, comments, updateComment, markPage, okPages, useSupabase, KINDS, STATUSES };
