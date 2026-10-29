// Share pictures (1200×630) made by scripts/make-share-images.js: public/images/share/<kind>-<slug>.png
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'public', 'images', 'share');
module.exports = (kind, slug, fallback) =>
  /^[a-z0-9-]+$/.test(slug) && fs.existsSync(path.join(DIR, `${kind}-${slug}.png`)) ? `/images/share/${kind}-${slug}.png` : (fallback || '');
