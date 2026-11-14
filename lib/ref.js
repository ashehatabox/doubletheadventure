// Referral codes (?ref=ot_296 on any link). The code is kept for 90 days in a first-party cookie (and in localStorage
// by public/js/site.js), then attached to sign-ups, enquiries and Stripe checkouts so outreach can be measured.
// Only the code itself is stored: no visitor id, no tracking across sites.
const NAME = 'a2ref';
const DAYS = 90;
const clean = (v) => {
  const s = String(v || '').trim().toLowerCase().slice(0, 60);
  return /^[a-z0-9][a-z0-9_.-]*$/.test(s) ? s : '';
};
function fromCookie(req) {
  const m = String(req.get('cookie') || '').match(/(?:^|;\s*)a2ref=([^;]+)/);
  return m ? clean(decodeURIComponent(m[1])) : '';
}
// The code for this request: a fresh ?ref= wins, then a form field, then the cookie.
function get(req) {
  return clean(req.query && req.query.ref) || clean(req.body && req.body.ref) || fromCookie(req);
}
// Express middleware: a page opened with ?ref= saves the code for 90 days (last code wins).
function capture(req, res, next) {
  const code = clean(req.query && req.query.ref);
  if (code && req.method === 'GET') {
    res.append('Set-Cookie', `${NAME}=${encodeURIComponent(code)}; Max-Age=${DAYS * 86400}; Path=/; SameSite=Lax${req.secure ? '; Secure' : ''}`);
  }
  next();
}
module.exports = { get, capture, clean, NAME, DAYS };
