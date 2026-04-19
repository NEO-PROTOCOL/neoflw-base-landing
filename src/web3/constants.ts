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

// ─── On-chain refs ──────────────────────────────────────────────

/** Aerodrome/V3 pool address (Base) — fonte de price/volume. */
export const NEOFLW_POOL = env(
  'PUBLIC_POOL_ADDRESS',
  '0xba6f7f1d429c61e1714bd94a1c74414289fe52f1c14473ba005edfd042d3f014',
);

/** Hard cap do contrato (em wei). 1B * 1e18. */
export const MAX_SUPPLY_WEI = 1_000_000_000n * 10n ** 18n;

/** Hard cap em unidades humanas — para UI/labels. */
export const MAX_SUPPLY_TOKENS = 1_000_000_000;

// ─── Public URLs (canonical) ────────────────────────────────────

/** Origin canônica (sem barra final). Usado em OG/canonical/deep links. */
export const SITE_URL = env('PUBLIC_SITE_URL', 'https://neoflw.vercel.app');

export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

// ─── Explorer / DEX / market URLs (derivadas) ───────────────────

const ADDR_LC = NEOFLW_ADDRESS.toLowerCase();

export const BASESCAN_TOKEN_URL = `${BASESCAN_URL}/token/${ADDR_LC}`;
export const BASESCAN_TOKEN_CODE_URL = `${BASESCAN_TOKEN_URL}#code`;
export const BASESCAN_ADDRESS_URL = `${BASESCAN_URL}/address/${NEOFLW_ADDRESS}`;

export const UNISWAP_BUY_URL =
  `https://app.uniswap.org/swap?chain=base&inputCurrency=USDC&outputCurrency=${ADDR_LC}`;

export const GECKOTERMINAL_POOL_URL =
  `https://www.geckoterminal.com/base/pools/${NEOFLW_POOL}`;

/** Embed parametrizado usado no ChartSection. */
export const GECKOTERMINAL_POOL_EMBED_URL =
  `${GECKOTERMINAL_POOL_URL}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=market_cap&resolution=5m`;

// ─── Read-only data APIs ────────────────────────────────────────

export const GECKOTERMINAL_POOL_API_URL =
  `https://api.geckoterminal.com/api/v2/networks/base/pools/${NEOFLW_POOL}`;

export const DEXSCREENER_PAIR_API_URL =
  `https://api.dexscreener.com/latest/dex/pairs/base/${NEOFLW_POOL}`;

export const BASESCAN_TOKENSUPPLY_API_URL =
  `https://api.basescan.org/api?module=stats&action=tokensupply&contractaddress=${NEOFLW_ADDRESS}`;

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
