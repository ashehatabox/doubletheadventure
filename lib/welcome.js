// Welcome email after a sign-up, and the unsubscribe links that go with it (CASL: every message needs a working unsubscribe).
// Sent only when a mail account is set up (RESEND_API_KEY or SMTP_*). Without one, nothing happens.
const crypto = require('crypto');
const mailer = require('./mailer');
const play = require('../data/play');

const SITE = () => (process.env.SITE_URL || 'https://doubleadventure.ca').replace(/\/$/, '');
const secret = () => process.env.UNSUB_SECRET || '';
const sign = (email) => crypto.createHmac('sha256', secret()).update(String(email).toLowerCase()).digest('hex').slice(0, 32);
const unsubLink = (email, lang) => (secret() ? `${SITE()}${lang === 'fr' ? '/fr' : ''}/unsubscribe?e=${encodeURIComponent(email)}&t=${sign(email)}` : '');
const validToken = (email, t) => !!secret() && typeof t === 'string' && t.length === 32 && crypto.timingSafeEqual(Buffer.from(sign(email)), Buffer.from(t));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = {
  en: {
    subject: 'Welcome to Double the Adventure',
    subjectWait: 'We\'ll tell you when {title} is out',
    hi: 'Hello, and thank you for joining us.',
    free: 'Here is your free coloring page. Open it on a phone or tablet and tap to color:',
    first: 'Not sure which book to start with? Tell us what your child is going through and we\'ll point you to a story:',
    wait: 'We\'ll write to you the day {title} is out on Amazon. Meanwhile, here is a coloring page from one of our books:',
    sign: 'A² Publishing · Double the Adventure',
    why: 'You get this email because you signed up on our website.',
    unsub: 'Unsubscribe',
    unsubReply: 'To unsubscribe, reply to this email with the word "unsubscribe".'
  },
  fr: {
    subject: 'Bienvenue chez Double the Adventure',
    subjectWait: 'Nous vous écrirons à la sortie de {title}',
    hi: 'Bonjour, et merci de vous joindre à nous.',
    free: 'Voici votre coloriage gratuit. Ouvrez-le sur un téléphone ou une tablette et touchez pour colorier :',
    first: 'Vous ne savez pas par quel livre commencer ? Dites-nous ce que votre enfant vit et nous vous proposerons une histoire :',
    wait: 'Nous vous écrirons le jour où {title} sortira sur Amazon. En attendant, voici un coloriage tiré d\'un de nos livres :',
    sign: 'A² Publishing · Double the Adventure',
    why: 'Vous recevez ce courriel parce que vous vous êtes inscrit sur notre site.',
    unsub: 'Se désabonner',
    unsubReply: 'Pour vous désabonner, répondez à ce courriel avec le mot « désabonner ».'
  }
};

// row: { email, lang, book_slug }; bookTitle: the book's title (for waitlist sign-ups)
async function sendWelcome(row, { waitlist = false, bookTitle = '' } = {}) {
  if (!mailer.configured()) return false;
  const lang = row.lang === 'fr' ? 'fr' : 'en';
  const t = T[lang];
  const prefix = lang === 'fr' ? '/fr' : '';
  const slug = play.coloring.includes(row.book_slug) ? row.book_slug : play.coloring[0];
  const color = slug ? `${SITE()}${prefix}/play/color/${slug}` : '';
  const start = `${SITE()}${prefix}/start`;
  const unsub = unsubLink(row.email, lang);
  const address = process.env.MAIL_ADDRESS || '';
  const subject = waitlist ? t.subjectWait.replace('{title}', bookTitle || '') : t.subject;
  const lines = [t.hi, '', waitlist ? t.wait.replace('{title}', bookTitle) : t.free, color, '', t.first, start, '', t.sign, address, t.why, unsub ? `${t.unsub}: ${unsub}` : t.unsubReply].filter((x, i, a) => x !== '' || a[i - 1] !== '');
  const html = `<div style="font-family:Arial,sans-serif;color:#4A3426;line-height:1.55;max-width:560px">
<p>${esc(t.hi)}</p>
<p>${esc(waitlist ? t.wait.replace('{title}', bookTitle) : t.free)}</p>
${color ? `<p><a href="${color}" style="display:inline-block;background:#D9381E;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${lang === 'fr' ? 'Colorier maintenant' : 'Color now'}</a></p>` : ''}
<p>${esc(t.first)}<br><a href="${start}">${start}</a></p>
<p style="font-size:13px;color:#7a6a5c">${esc(t.sign)}${address ? '<br>' + esc(address) : ''}<br>${esc(t.why)}<br>${unsub ? `<a href="${unsub}">${esc(t.unsub)}</a>` : esc(t.unsubReply)}</p></div>`;
  try {
    return await mailer.send({ to: row.email, subject, text: lines.join('\n'), html, replyTo: process.env.STORE_EMAIL || undefined });
  } catch (err) {
    console.error('Welcome email failed:', err.message);
    return false;
  }
}

module.exports = { sendWelcome, unsubLink, validToken };
