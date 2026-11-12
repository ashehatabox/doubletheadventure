// Adds YouTube read-aloud IDs to data/readalouds.js from a JSON file of {"<lang>:<slug>": "<videoId>"}.
// Usage: node scripts/add-readalouds.js results.json
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'readalouds.js');
const current = require(file);
const add = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [key, id] of Object.entries(add)) {
  const [lang, slug] = key.split(':');
  if (!/^[\w-]{11}$/.test(id) || !lang || !slug) { console.log('skipped', key, id); continue; }
  current[slug] = current[slug] || {};
  current[slug][lang] = { ...(current[slug][lang] || {}), youtube: id };
}
const head = fs.readFileSync(file, 'utf8').split('module.exports')[0];
const body = Object.keys(current).sort().map((s) => `  '${s}': {\n` + Object.keys(current[s]).map((l) => `    ${l}: ${JSON.stringify(current[s][l]).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'")}`).join(',\n') + '\n  }').join(',\n');
fs.writeFileSync(file, head + 'module.exports = {\n' + body + '\n};\n');
console.log('read-alouds now for', Object.keys(current).length, 'books');
