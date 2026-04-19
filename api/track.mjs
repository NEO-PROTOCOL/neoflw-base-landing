/**
 * POST /api/track
 * Registra conexões de wallet no Turso para remarketing / follow-up.
 * Usa Web Request/Response API — zero dependências externas.
 *
 * Env vars (definir no Vercel Dashboard → Settings → Environment Variables):
 *   TURSO_DATABASE_URL  = libsql://your-db-your-org.turso.io
 *   TURSO_AUTH_TOKEN    = eyJ...
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const TURSO_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2_048;
const RATE_LIMIT_BUCKET = new Map();
let schemaReadyPromise = null;

function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const candidate = fwd.split(',')[0]?.trim();
  return candidate || 'unknown';
}

function rateLimitExceeded(key) {
  const now = Date.now();
  const hit = RATE_LIMIT_BUCKET.get(key);
  if (!hit || now - hit.windowStart > RATE_LIMIT_WINDOW_MS) {
    RATE_LIMIT_BUCKET.set(key, { windowStart: now, count: 1 });
    return false;
  }
  hit.count += 1;
  return hit.count > RATE_LIMIT_MAX_REQUESTS;
}

function cleanRateLimitBucket() {
  const now = Date.now();
  for (const [key, value] of RATE_LIMIT_BUCKET.entries()) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      RATE_LIMIT_BUCKET.delete(key);
    }
  }
}

function getCorsHeaders(origin) {
  const allowed = new Set(
    (
      process.env.TRACK_ALLOWED_ORIGINS ??
      'https://neoflw.xyz,https://www.neoflw.xyz,https://neoflw.vercel.app'
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const safeOrigin = origin && allowed.has(origin) ? origin : 'https://neoflw.xyz';
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function safePath(input) {
  if (!input || typeof input !== 'string') return '/';
  return input.startsWith('/') ? input.slice(0, 100) : '/';
}

function safeUrl(input) {
  if (!input || typeof input !== 'string') return '';
  try {
    const url = new URL(input);
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
  } catch {
    return '';
  }
}

function makeTimeoutSignal(ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

export default async function handler(req) {
  const origin = req.headers.get('origin');
  const CORS = getCorsHeaders(origin);
  cleanRateLimitBucket();

  // ── Preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS });
  }

  const clientIp = getClientIp(req);
  if (rateLimitExceeded(clientIp)) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: CORS });
  }

  // ── Input ────────────────────────────────────────────────────────────
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 413, headers: CORS });
  }

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
  const pg    = safePath(page);
  const ref   = safeUrl(referrer);
  const ua    = (req.headers.get('user-agent') || '').slice(0, 250);
  const chain = (chainId  || '0x2105').slice(0, 20);

  // Helper tipado para Turso HTTP API v2
  const txt = (v) => ({ type: 'text', value: String(v ?? '') });

  // ── Pipeline Turso ────────────────────────────────────────────────────
  const createSchemaPipeline = {
    requests: [
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
      { type: 'close' },
    ],
  };

  const upsertPipeline = {
    requests: [
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
    if (!schemaReadyPromise) {
      schemaReadyPromise = (async () => {
        const { controller, timeoutId } = makeTimeoutSignal(TURSO_TIMEOUT_MS);
        try {
          const schemaRes = await fetch(`${dbUrl}/v2/pipeline`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createSchemaPipeline),
            signal: controller.signal,
          });
          if (!schemaRes.ok) {
            const errText = await schemaRes.text();
            throw new Error(`Schema pipeline failed (${schemaRes.status}): ${errText}`);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      })().catch((error) => {
        schemaReadyPromise = null;
        throw error;
      });
    }

    await schemaReadyPromise;

    const { controller, timeoutId } = makeTimeoutSignal(TURSO_TIMEOUT_MS);
    const r = await fetch(`${dbUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upsertPipeline),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[track] Turso HTTP error:', r.status, errText);
      return Response.json({ error: 'DB error' }, { status: 502, headers: CORS });
    }

    return Response.json({ ok: true }, { status: 200, headers: CORS });
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Turso request timeout' : e.message;
    console.error('[track] Fetch failed:', msg);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS });
  }
}
