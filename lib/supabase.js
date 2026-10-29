// Saves sign-ups and enquiries to the Supabase project through its REST API.
// The publishable key can only add rows (row-level security blocks reading them back).
// If Supabase isn't set up or doesn't answer, the row goes to data/<table>.jsonl so nothing is lost.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function backup(table, row) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, table + '.jsonl'), JSON.stringify({ ...row, saved_at: new Date().toISOString() }) + '\n');
  } catch (err) {
    console.error('Could not write backup', table, err.message);
  }
}

async function insert(table, row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    backup(table, row);
    return { ok: true, stored: 'file' };
  }
  try {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) return { ok: true, stored: 'supabase' };
    const text = await res.text();
    console.error(`Supabase ${table} ${res.status}: ${text}`);
    // 400/409/422 = the row itself was rejected (bad email etc.): tell the visitor.
    if (res.status >= 400 && res.status < 500) return { ok: false, reason: 'invalid' };
  } catch (err) {
    console.error(`Supabase ${table} failed:`, err.message);
  }
  backup(table, row);
  return { ok: true, stored: 'file' };
}

module.exports = { insert };
