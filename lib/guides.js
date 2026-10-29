// Teacher guides: built from the book briefs in content/engine/books/<slug>.md.
// Only our own summary, the questions, the key moments and the theme line are used (never the book's text).
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'content', 'engine', 'books');

function sections(md) {
  const out = {};
  let key = null;
  md.replace(/^---[\s\S]*?\n---\n/, '').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^## (.+)/);
    if (m) { key = m[1].trim(); out[key] = []; } else if (key) out[key].push(line);
  });
  return out;
}
const numbered = (lines) => (lines || []).map((l) => (l.match(/^\d+\.\s+(.*)/) || [])[1]).filter(Boolean);
const clean = (s) => s.replace(/\s*\((check[^)]*)\)/gi, '').trim();

const cache = {};
function get(slug) {
  if (slug in cache) return cache[slug];
  const f = path.join(DIR, slug + '.md');
  let g = null;
  if (/^[a-z0-9-]+$/.test(slug) && !slug.startsWith('_') && fs.existsSync(f)) {
    const s = sections(fs.readFileSync(f, 'utf8'));
    const value = (s['The value'] || []).join('\n').match(/^For a child:\s*(.*)$/m);
    const theme = (s['Refrain and theme line'] || []).join('\n').match(/Theme line:\s*[“"](.+?)[”"]/);
    const questions = numbered(s['Questions to ask']);
    const moments = numbered(s['Key moments']).map(clean);
    if (questions.length && moments.length) {
      g = {
        slug,
        summary: (clean((s['Story in short'] || []).join(' ').trim()).match(/[^.!?]+[.!?]+(\s|$)/g) || []).slice(0, 3).join('').trim(),
        childValue: value ? value[1].split(/\s*(?:For grown-ups?|For a grown-up|For adults?)\b/i)[0].trim().replace(/^./, (c) => c.toUpperCase()) : '',
        theme: theme ? theme[1] : '',
        questions,
        moments
      };
    }
  }
  return (cache[slug] = g);
}

module.exports = { get };
