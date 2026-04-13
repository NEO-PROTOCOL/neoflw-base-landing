/**
 * POST /api/track
 * Registra conexões de wallet no Turso para remarketing / follow-up.
 * Usa Web Request/Response API — zero dependências externas.
 *
 * Env vars (definir no Vercel Dashboard → Settings → Environment Variables):
 *   TURSO_DATABASE_URL  = libsql://your-db-your-org.turso.io
 *   TURSO_AUTH_TOKEN    = eyJ...
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  // ── Preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS });
  }

  // ── Input ────────────────────────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const { address, page, referrer, chainId } = body ?? {};

  if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return Response.json({ error: 'Invalid address' }, { status: 400, headers: CORS });
  }

  // ── Env vars ─────────────────────────────────────────────────────────
  const rawUrl = process.env.TURSO_DATABASE_URL ?? '';
  const token  = process.env.TURSO_AUTH_TOKEN   ?? '';

  if (!rawUrl || !token) {
    console.error('[track] Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    return Response.json({ error: 'Server misconfiguration' }, { status: 500, headers: CORS });
  }

  // libsql:// → https:// para a Turso HTTP API
  const dbUrl = rawUrl.replace(/^libsql:\/\//, 'https://');

  // ── Sanitização ───────────────────────────────────────────────────────
  const addr  = address.toLowerCase();
  const pg    = (page     || '/').slice(0, 100);
  const ref   = (referrer || '').slice(0, 500);
  const ua    = (req.headers.get('user-agent') || '').slice(0, 250);
  const chain = (chainId  || '0x2105').slice(0, 20);

  // Helper tipado para Turso HTTP API v2
  const txt = (v) => ({ type: 'text', value: String(v ?? '') });

  // ── Pipeline Turso ────────────────────────────────────────────────────
  const pipeline = {
    requests: [
      // 1. Cria tabela se não existir
      {
        type: 'execute',
        stmt: {
          sql: `CREATE TABLE IF NOT EXISTS wallets (
                  address    TEXT PRIMARY KEY,
                  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
                  last_seen  TEXT NOT NULL DEFAULT (datetime('now')),
                  visits     INTEGER NOT NULL DEFAULT 1,
                  last_page  TEXT,
                  referrer   TEXT,
                  user_agent TEXT,
                  chain_id   TEXT
                )`,
          args: [],
        },
      },
      // 2. Upsert — novo registro ou atualiza last_seen + visitas
      {
        type: 'execute',
        stmt: {
          sql: `INSERT INTO wallets
                  (address, first_seen, last_seen, visits, last_page, referrer, user_agent, chain_id)
                VALUES
                  (?, datetime('now'), datetime('now'), 1, ?, ?, ?, ?)
                ON CONFLICT(address) DO UPDATE SET
                  last_seen  = datetime('now'),
                  visits     = visits + 1,
                  last_page  = excluded.last_page,
                  chain_id   = excluded.chain_id`,
          args: [txt(addr), txt(pg), txt(ref), txt(ua), txt(chain)],
        },
      },
      { type: 'close' },
    ],
  };

  // ── Chamada HTTP ──────────────────────────────────────────────────────
  try {
    const r = await fetch(`${dbUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[track] Turso HTTP error:', r.status, errText);
      return Response.json({ error: 'DB error' }, { status: 502, headers: CORS });
    }

    return Response.json({ ok: true }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('[track] Fetch failed:', e.message);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS });
  }
}
