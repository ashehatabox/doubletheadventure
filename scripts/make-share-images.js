// Makes the 1200×630 pictures that show when a page is shared (Facebook, Pinterest, WhatsApp...).
// Usage: node scripts/make-share-images.js          → makes the missing ones
//        node scripts/make-share-images.js --all    → remakes all
// Needs Playwright with Chromium. If it isn't there, the site simply uses the book cover instead.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'images', 'share');
const catalog = require('../data/books');
const articles = require('../lib/articles');
const TOPICS = require('../locales/en').articles.topics;

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright not available: share pictures skipped (the site uses book covers).'); process.exit(0); }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dataUri = (rel) => {
  const f = path.join(ROOT, 'public', rel);
  if (!fs.existsSync(f)) return '';
  const ext = path.extname(f).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,` + fs.readFileSync(f).toString('base64');
};
const mark = dataUri('images/brand/mark.png');

function card({ eyebrow, title, cover, accent }) {
  const size = title.length > 70 ? 46 : title.length > 45 ? 54 : 64;
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#FFF9EE;font-family:Georgia,'DejaVu Serif',serif;color:#4A3426;display:flex;position:relative;overflow:hidden}
  .band{position:absolute;left:0;top:0;bottom:0;width:20px;background:${accent}}
  .left{width:430px;display:flex;align-items:center;justify-content:center;padding:40px 20px 40px 60px}
  .left img{max-width:100%;max-height:520px;border-radius:14px;box-shadow:0 14px 34px rgba(74,52,38,.28)}
  .right{flex:1;padding:60px 70px 50px 50px;display:flex;flex-direction:column;justify-content:space-between}
  .eyebrow{font:800 24px 'DejaVu Sans',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#D9381E}
  .title{font-size:${size}px;font-weight:700;line-height:1.14;margin-top:18px}
  .foot{display:flex;align-items:center;gap:16px;font:700 26px 'DejaVu Sans',Arial,sans-serif;color:#0A5F5E}
  .foot img{width:56px;height:56px;border-radius:50%}
  </style><div class="band"></div>
  <div class="left">${cover ? `<img src="${cover}">` : ''}</div>
  <div class="right"><div><div class="eyebrow">${esc(eyebrow)}</div><div class="title">${esc(title)}</div></div>
  <div class="foot">${mark ? `<img src="${mark}">` : ''}<span>A² Publishing · Double the Adventure</span></div></div>`;
}

(async () => {
  const all = process.argv.includes('--all');
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = [];
  for (const b of catalog.books) {
    if (b.status === 'coming') continue;
    const cover = dataUri(`images/books/${b.slug}/cover.jpg`);
    if (!cover) continue;
    jobs.push({ file: `book-${b.slug}.png`, html: card({ eyebrow: 'Picture book · ages 3–7', title: b.title.en, cover, accent: '#FFC93C' }) });
  }
  for (const slug of articles.published()) {
    const a = articles.get(slug, 'en');
    if (!a) continue;
    const first = a.books[0] && dataUri(`images/books/${a.books[0]}/cover.jpg`);
    jobs.push({ file: `article-${slug}.png`, html: card({ eyebrow: TOPICS[a.topic] || 'For parents and teachers', title: a.title, cover: first, accent: '#0E7C7B' }) });
  }
  const todo = jobs.filter((j) => all || !fs.existsSync(path.join(OUT, j.file)));
  if (!todo.length) { console.log('Share pictures: nothing to make.'); return; }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const j of todo) {
    await page.setContent(j.html);
    await page.screenshot({ path: path.join(OUT, j.file) });
    console.log('made', j.file);
  }
  await browser.close();
})();
