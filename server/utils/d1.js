/**
 * Cloudflare D1 client for Express.
 *
 * Prefers the Worker /internal/d1 gateway (D1_QUERY_URL + D1_INTERNAL_SECRET)
 * so Express can use the Worker's native D1 binding. Falls back to the
 * Cloudflare REST API when CLOUDFLARE_API_TOKEN is set instead.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

const getWorkerConfig = () => {
  const url = String(process.env.D1_QUERY_URL || '').replace(/\/+$/, '');
  const secret = process.env.D1_INTERNAL_SECRET;
  if (url && secret) return { url, secret };
  return null;
};

const getRestConfig = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;
  if (accountId && apiToken && databaseId) {
    return { accountId, apiToken, databaseId };
  }
  return null;
};

const queryViaWorker = async (list) => {
  const { url, secret } = getWorkerConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-D1-Secret': secret
    },
    body: JSON.stringify({ batch: list })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(`[D1] Worker query failed: ${data.error || res.statusText}`);
  }
  return data.result || [];
};

const queryViaRest = async (list) => {
  const { accountId, apiToken, databaseId } = getRestConfig();
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

const query = async (statements) => {
  const list = Array.isArray(statements) ? statements : [statements];
  if (getWorkerConfig()) return queryViaWorker(list);
  if (getRestConfig()) return queryViaRest(list);
  throw new Error(
    '[D1] Missing configuration. Set D1_QUERY_URL + D1_INTERNAL_SECRET (Worker gateway) or CLOUDFLARE_API_TOKEN + D1_DATABASE_ID.'
  );
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

const ping = async () => {
  const row = await first('SELECT 1 AS ok');
  return Boolean(row && row.ok === 1);
};

module.exports = { query, all, first, run, batch, ping };
