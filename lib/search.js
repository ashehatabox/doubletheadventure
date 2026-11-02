// Small search over books, articles, values and teacher guides (no outside service).
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');
const stem = (w) => w.replace(/(ing|ness|ers|er|es|s|ed)$/, '');

function tokens(q) {
  return norm(q).split(/\s+/).filter((w) => w.length > 1).map(stem).filter(Boolean);
}

// docs: [{ kind, title, text, href, extra }]; returns the best matches first.
function run(docs, q, limit = 30) {
  const words = tokens(q);
  if (!words.length) return [];
  const out = [];
  for (const d of docs) {
    const t = norm(d.title), body = norm(d.text);
    let score = 0, hit = 0;
    for (const w of words) {
      const inTitle = t.includes(w), inBody = body.includes(w);
      if (inTitle) score += 10;
      if (inBody) score += 3 + Math.min(3, (body.split(w).length - 1) * 0.5);
      if (inTitle || inBody) hit++;
    }
    if (hit === words.length) out.push({ ...d, score: score + (d.boost || 0) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
module.exports = { run, tokens };
