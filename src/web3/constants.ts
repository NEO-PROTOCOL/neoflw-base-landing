/**
 * Single source of truth para metadata do token NEOFLW e URLs derivadas.
 *
 * Fonte primária: variáveis `PUBLIC_*` do `.env`. Fallbacks em código
 * existem apenas para garantir build determinístico em CI sem env.
 *
 * Toda string de endereço/URL hardcoded em componentes Astro/React deve
 * vir DAQUI. Drift entre arquivos foi a principal dor identificada na
 * issue #1 — não reintroduzir.
 */

import { BASESCAN_URL, NEOFLW_ADDRESS } from './abi';

export { BASE_CHAIN_ID, BASESCAN_URL, NEOFLW_ABI, NEOFLW_ADDRESS } from './abi';

function env(key: string, fallback: string): string {
  const raw = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  return (raw ?? '').trim() || fallback;
}

/**
 * Valida e normaliza referência de pool em um DEX agregador.
 *
 * Aceita dois formatos porque GeckoTerminal/DexScreener consomem ambos:
 * - Address EVM (0x + 40 hex) — Uniswap V2/V3, Aerodrome, etc.
 * - Pool ID (0x + 64 hex)     — Uniswap V4 (PoolManager singleton).
 *
 * Falhar cedo aqui evita silent breakage em fetch de price/volume.
 */
function envPoolRef(key: string, fallback: string): string {
  const value = env(key, fallback).toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(value) || /^0x[a-f0-9]{64}$/.test(value)) {
    return value;
  }
  throw new Error(
    `Invalid ${key}: expected 0x-prefixed 20-byte address or 32-byte pool ID, got "${value}".`,
  );
}

// ─── On-chain refs ──────────────────────────────────────────────

/**
 * Pool reference no DEX agregador (Uniswap V4 PoolManager singleton no
 * caso atual — daí o formato 32 bytes em vez de address EVM).
 */
export const NEOFLW_POOL_ID = envPoolRef(
  'PUBLIC_POOL_ADDRESS',
  '0xba6f7f1d429c61e1714bd94a1c74414289fe52f1c14473ba005edfd042d3f014',
);

/** Hard cap do contrato (em wei). 1B * 1e18. */
export const MAX_SUPPLY_WEI = 1_000_000_000n * 10n ** 18n;

/** Hard cap em unidades humanas — para UI/labels. */
export const MAX_SUPPLY_TOKENS = 1_000_000_000;

/**
 * Supply cunhado / em circulação — referência explícita para UI (hero + tokenomics)
 * sem depender da API do explorer. Atualizar quando o número real mudar.
 */
export const KNOWN_CIRCULATING_TOKENS = 2000;

// ─── Public URLs (canonical) ────────────────────────────────────

/**
 * Origin canônica (sem barra final). Usado em OG/canonical/deep links.
 * Trailing slashes são removidas para evitar `//og-image.png` quando
 * concatenando paths a esta URL.
 */
export const SITE_URL = env('PUBLIC_SITE_URL', 'https://neoflw.xyz').replace(/\/+$/, '');

export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

// ─── Explorer / DEX / market URLs (derivadas) ───────────────────

const ADDR_LC = NEOFLW_ADDRESS.toLowerCase();

export const BASESCAN_TOKEN_URL = `${BASESCAN_URL}/token/${ADDR_LC}`;
export const BASESCAN_TOKEN_CODE_URL = `${BASESCAN_TOKEN_URL}#code`;
export const BASESCAN_ADDRESS_URL = `${BASESCAN_URL}/address/${NEOFLW_ADDRESS}`;

export const UNISWAP_BUY_URL =
  `https://app.uniswap.org/swap?chain=base&inputCurrency=USDC&outputCurrency=${ADDR_LC}`;

export const GECKOTERMINAL_POOL_URL =
  `https://www.geckoterminal.com/base/pools/${NEOFLW_POOL_ID}`;

/** Embed parametrizado usado no ChartSection. */
export const GECKOTERMINAL_POOL_EMBED_URL =
  `${GECKOTERMINAL_POOL_URL}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=market_cap&resolution=5m`;

// ─── Read-only data APIs ────────────────────────────────────────

/**
 * Origin da API do explorer derivado de `BASESCAN_URL`. Se alguém
 * setar `PUBLIC_BASESCAN_URL` para um mirror/testnet (ex.
 * `https://sepolia.basescan.org`), a API URL acompanha automaticamente
 * (vira `https://api-sepolia.basescan.org`). Sem essa derivação,
 * havia drift garantido entre explorer e API.
 */
const BASESCAN_API_ORIGIN = (() => {
  try {
    const url = new URL(BASESCAN_URL);
    url.hostname = url.hostname.startsWith('api.')
      ? url.hostname
      : `api.${url.hostname}`;
    return url.origin;
  } catch {
    return 'https://api.basescan.org';
  }
})();

export const GECKOTERMINAL_POOL_API_URL =
  `https://api.geckoterminal.com/api/v2/networks/base/pools/${NEOFLW_POOL_ID}`;

export const DEXSCREENER_PAIR_API_URL =
  `https://api.dexscreener.com/latest/dex/pairs/base/${NEOFLW_POOL_ID}`;

export const BASESCAN_TOKENSUPPLY_API_URL =
  `${BASESCAN_API_ORIGIN}/api?module=stats&action=tokensupply&contractaddress=${NEOFLW_ADDRESS}`;

// ─── Cross-repo source-of-truth (issue #1 metadata) ─────────────

/**
 * Repos vinculados — referenciados na issue #1 do roadmap.
 * Mantém a landing como ponto público que aponta para a fonte real.
 */
export const SOURCE_REPOS = {
  tokenContract: 'https://github.com/NEO-FlowOFF/neoflw-token',
  tokenPage: 'https://github.com/NEO-PROTOCOL/neoflw-token-page',
  orchestrator: 'https://github.com/NEO-PROTOCOL/neobot-orchestrator',
} as const;
