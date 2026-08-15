/**
 * Cloudflare D1 client for the Express server.
 *
 * Express runs in a Container / external host, not inside a Worker, so it cannot
 * use the native `env.DB` binding. This client talks to D1 through Cloudflare's
 * REST API instead.
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID  (falls back to R2_ACCOUNT_ID)
 *   CLOUDFLARE_API_TOKEN   (token with D1:Edit permission)
 *   D1_DATABASE_ID         (UUID printed by `wrangler d1 create ripoma-db`)
 *
 * Usage:
 *   const d1 = require('../utils/d1');
 *   const rows = await d1.all('SELECT * FROM products WHERE status = ?', ['active']);
 *   const row  = await d1.first('SELECT * FROM products WHERE id = ?', [id]);
 *   await d1.run('UPDATE products SET stock = ? WHERE id = ?', [qty, id]);
 *   await d1.batch([{ sql: '...', params: [...] }, { sql: '...', params: [...] }]);
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

const getConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;

  const missing = Object.entries({
    'CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID)': accountId,
    CLOUDFLARE_API_TOKEN: apiToken,
    D1_DATABASE_ID: databaseId
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`[D1] Missing configuration: ${missing.join(', ')}`);
  }

  return { accountId, apiToken, databaseId };
};

/**
 * Execute one or more SQL statements against D1.
 * Accepts a single { sql, params } or an array of them (executed as a batch).
 * Returns the array of raw D1 result objects ({ results, success, meta }).
 */
const query = async (statements) => {
  const { accountId, apiToken, databaseId } = getConfig();
  const list = Array.isArray(statements) ? statements : [statements];

  const results = [];
  for (const { sql, params = [] } of list) {
    const res = await fetch(
      `${API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      const message = data.errors?.map((e) => e.message).join('; ') || res.statusText;
      throw new Error(`[D1] Query failed: ${message}`);
    }
    results.push(...data.result);
  }
  return results;
};

const all = async (sql, params = []) => {
  const [result] = await query({ sql, params });
  return result?.results || [];
};

const first = async (sql, params = []) => {
  const rows = await all(sql, params);
  return rows[0] || null;
};

const run = async (sql, params = []) => {
  const [result] = await query({ sql, params });
  return result?.meta || {};
};

const batch = (statements) => query(statements);

module.exports = { query, all, first, run, batch };
