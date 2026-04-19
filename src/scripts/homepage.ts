/**
 * HomePage client script — viem-only.
 *
 * Substitui o antigo inline `<script>` que dependia de `ethers@CDN`.
 * Razões para a migração (issue #1, Done when 2 — landing como prova
 * pública coerente):
 *
 * 1. Eliminar dep externa de CDN (cdnjs/ethers.js) e o SRI hash manual
 *    que precisava ser atualizado a cada bump de versão.
 * 2. Unificar o stack web3 — wagmi/viem já são usados no MintCard
 *    React island; o tree-shake compartilha o bundle.
 * 3. Tipagem end-to-end com `NEOFLW_ABI` (typed const) — sem string
 *    ABI duplicada que poderia drift do contrato real.
 *
 * Variáveis de runtime (i18n strings, RPC URL, refs onchain) chegam
 * via `window.__NEOFLW`, populado por um pequeno `<script is:inline
 * define:vars>` em HomePage.astro. Esse split é o único caminho
 * suportado pelo Astro para passar dados Astro → módulo bundled.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  zeroAddress,
  type Address,
  type Hex,
  type WalletClient,
} from 'viem';
import { base } from 'viem/chains';
import { NEOFLW_ABI } from '../web3/abi';

// ─── Types injected via window ───────────────────────────────────

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface HomeI18n {
  connectWallet: string;
  chooseWallet: string;
  cancel: string;
  opensMetaMask: string;
  opensCoinbase: string;
  opensUniswap: string;
  opensRainbow: string;
  alreadyMinted: string;
  mintNow: string;
  connectWalletToMint: string;
  mintingDisabled: string;
  checkingBalance: string;
  processingTx: string;
  waitingConfirmation: string;
  success: string;
  txFailed: string;
  rejected: string;
  networkError: string;
  installWallet: string;
  walletNotFound: string;
  rejectedTx: string;
  lowBalance: string;
  copied: string;
}

interface HomeOnchain {
  contract: Address;
  contractLc: string;
  maxSupply: number;
  geckoApi: string;
  dexscreenerApi: string;
  basescanSupplyApi: string;
}

interface HomeVars {
  i18n: HomeI18n;
  numberLocale: string;
  baseRpcUrl: string;
  pt: boolean;
  siteHost: string;
  onchain: HomeOnchain;
}

declare global {
  interface Window {
    __NEOFLW?: HomeVars;
  }
}

function getInjectedProvider(): Eip1193Provider | undefined {
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

const vars = window.__NEOFLW;
if (!vars) {
  throw new Error('NEOFLW: window.__NEOFLW not initialized — check HomePage.astro define:vars block.');
}
const { i18n, numberLocale, baseRpcUrl, pt, siteHost, onchain } = vars;

// ─── Constants ──────────────────────────────────────────────────

const LIVE_STATS_INTERVAL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;
const STALE_WINDOW_MS = LIVE_STATS_INTERVAL_MS * 2;
const TARGET_CHAIN_ID_HEX = '0x2105'; // Base Mainnet 8453
const TURSO_CHAIN_ID_HEX = '0x2105';

// ─── viem clients (lazy) ────────────────────────────────────────

const publicClient = createPublicClient({
  chain: base,
  transport: http(baseRpcUrl),
});

let walletClient: WalletClient | null = null;

function getWalletClient(): WalletClient | null {
  if (walletClient) return walletClient;
  const eth = getInjectedProvider();
  if (!eth) return null;
  walletClient = createWalletClient({
    chain: base,
    transport: custom(eth),
  });
  return walletClient;
}

// ─── State ──────────────────────────────────────────────────────

let userAddress: Address | null = null;
let listenersBound = false;
let walletEventsBound = false;
let liveStatsIntervalId: ReturnType<typeof setInterval> | null = null;
let lastProofSyncTs = 0;

// ─── Mobile / deep link helpers ─────────────────────────────────

function isMobile(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function openWalletModal(): void {
  document.getElementById('wallet-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeWalletModal(): void {
  document.getElementById('wallet-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function openWalletDeepLink(wallet: 'metamask' | 'coinbase' | 'uniswap' | 'rainbow'): void {
  closeWalletModal();
  const encodedUrl = encodeURIComponent(`https://${siteHost}`);
  const links: Record<typeof wallet, string> = {
    metamask: `https://metamask.app.link/dapp/${siteHost}`,
    coinbase: `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`,
    uniswap: `https://wallet.uniswap.org/#/open-dapp?url=${encodedUrl}`,
    rainbow: `https://rnbwapp.com/dapp?url=${encodedUrl}`,
  };
  window.location.href = links[wallet] ?? links.metamask;
}

// ─── Wallet tracking (Turso, fire-and-forget) ───────────────────

function trackWallet(address: Address): void {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address,
      page: window.location.pathname,
      referrer: document.referrer || '',
      chainId: TURSO_CHAIN_ID_HEX,
    }),
  }).catch(() => {
    /* silent — never blocks UX */
  });
}

// ─── DOM helpers ────────────────────────────────────────────────

function setConnectButtonState(address: Address | null): void {
  const connBtn = document.getElementById('connect-btn');
  if (!connBtn) return;
  connBtn.textContent = '';
  if (!address) {
    connBtn.classList.remove('active');
    connBtn.append(document.createTextNode(i18n.connectWallet));
    return;
  }
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = 'var(--green)';
  const txt = document.createElement('span');
  txt.className = 'addr-txt';
  txt.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
  connBtn.classList.add('active');
  connBtn.append(dot, document.createTextNode(' '), txt);
}

function shortenAddress(address: Address | string): string {
  if (!address || address.toLowerCase() === zeroAddress.toLowerCase()) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type ChipVariant = 'on' | 'off' | 'warn' | 'neutral';

function setChipState(el: Element | null, stateText: string, variant: ChipVariant = 'neutral'): void {
  if (!el) return;
  el.textContent = stateText;
  el.classList.remove('is-on', 'is-off', 'is-warn');
  if (variant === 'on') el.classList.add('is-on');
  if (variant === 'off') el.classList.add('is-off');
  if (variant === 'warn') el.classList.add('is-warn');
}

// ─── Proof / Trust UI ───────────────────────────────────────────

interface ProofUI {
  ownerAddr: Address;
  mintEnabled: boolean;
  bridgeAddr: Address;
  protocolFeeBps: number;
  treasuryAddr: Address;
}

function updateProofTrustUI(p: ProofUI): void {
  const ownerChip = document.getElementById('proof-owner-chip');
  const mintChip = document.getElementById('proof-mint-chip');
  const bridgeEl = document.getElementById('proof-bridge-minter');
  const feeEl = document.getElementById('proof-fee-split');
  const treasuryEl = document.getElementById('proof-treasury-address');

  if (ownerChip) {
    const ownerSet = p.ownerAddr && p.ownerAddr.toLowerCase() !== zeroAddress.toLowerCase();
    setChipState(
      ownerChip,
      ownerSet ? (pt ? 'Owner ativo' : 'Owner active') : pt ? 'Renounced' : 'Renounced',
      ownerSet ? 'on' : 'warn',
    );
  }

  if (mintChip) {
    setChipState(
      mintChip,
      p.mintEnabled ? (pt ? 'Ativo' : 'Active') : pt ? 'Pausado' : 'Paused',
      p.mintEnabled ? 'on' : 'off',
    );
  }

  if (bridgeEl) {
    const hasBridge = p.bridgeAddr && p.bridgeAddr.toLowerCase() !== zeroAddress.toLowerCase();
    bridgeEl.textContent = `${pt ? 'Minter:' : 'Minter:'} ${hasBridge ? shortenAddress(p.bridgeAddr) : pt ? 'não configurado' : 'not configured'}`;
  }

  if (feeEl && Number.isFinite(p.protocolFeeBps)) {
    const protocolPct = p.protocolFeeBps / 100;
    const ownerPct = 100 - protocolPct;
    feeEl.textContent = `${protocolPct.toFixed(0)}% / ${ownerPct.toFixed(0)}%`;
  }

  if (treasuryEl) {
    treasuryEl.textContent = `${pt ? 'Treasury:' : 'Treasury:'} ${shortenAddress(p.treasuryAddr)}`;
  }
}

function updateProofRpcMeta(statusVariant: ChipVariant, syncedAtMs = Date.now()): void {
  const rpcChip = document.getElementById('proof-rpc-chip');
  const rpcSync = document.getElementById('proof-rpc-sync');
  if (!rpcChip && !rpcSync) return;

  const statusText =
    statusVariant === 'on'
      ? pt
        ? 'RPC Online'
        : 'RPC Online'
      : statusVariant === 'warn'
        ? pt
          ? 'RPC Fallback'
          : 'RPC Fallback'
        : pt
          ? 'RPC Stale'
          : 'RPC Stale';

  if (rpcChip) setChipState(rpcChip, statusText, statusVariant);
  if (rpcSync) {
    const formatted = new Date(syncedAtMs).toLocaleTimeString(numberLocale, { hour12: false });
    rpcSync.textContent = pt ? `Última sync: ${formatted}` : `Last sync: ${formatted}`;
  }
}

function markProofRpcStaleIfNeeded(): void {
  if (!lastProofSyncTs) return;
  if (Date.now() - lastProofSyncTs > STALE_WINDOW_MS) {
    updateProofRpcMeta('off', lastProofSyncTs);
  }
}

async function safeRead<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    return { value: await fn(), ok: true };
  } catch {
    return { value: fallback, ok: false };
  }
}

async function updateProofTrustSignals(): Promise<void> {
  const ownerChip = document.getElementById('proof-owner-chip');
  const mintChip = document.getElementById('proof-mint-chip');
  const rpcChip = document.getElementById('proof-rpc-chip');
  if (!ownerChip && !mintChip && !rpcChip) return;

  try {
    const [ownerRes, mintRes, bridgeRes, feeRes, treasuryRes] = await Promise.all([
      safeRead(
        () =>
          publicClient.readContract({
            address: onchain.contract,
            abi: NEOFLW_ABI,
            functionName: 'owner',
          }),
        zeroAddress,
      ),
      safeRead(
        () =>
          publicClient.readContract({
            address: onchain.contract,
            abi: NEOFLW_ABI,
            functionName: 'publicMintEnabled',
          }),
        true,
      ),
      safeRead(
        () =>
          publicClient.readContract({
            address: onchain.contract,
            abi: NEOFLW_ABI,
            functionName: 'bridgeMinter',
          }),
        zeroAddress,
      ),
      safeRead(
        () =>
          publicClient.readContract({
            address: onchain.contract,
            abi: NEOFLW_ABI,
            functionName: 'PROTOCOL_FEE_BPS',
          }),
        500n,
      ),
      safeRead(
        () =>
          publicClient.readContract({
            address: onchain.contract,
            abi: NEOFLW_ABI,
            functionName: 'PROTOCOL_TREASURY',
          }),
        zeroAddress,
      ),
    ]);

    updateProofTrustUI({
      ownerAddr: ownerRes.value,
      mintEnabled: mintRes.value,
      bridgeAddr: bridgeRes.value,
      protocolFeeBps: Number(feeRes.value),
      treasuryAddr: treasuryRes.value,
    });

    const hadFallback = [ownerRes, mintRes, bridgeRes, feeRes, treasuryRes].some((r) => !r.ok);
    lastProofSyncTs = Date.now();
    updateProofRpcMeta(hadFallback ? 'warn' : 'on', lastProofSyncTs);
  } catch (err) {
    console.warn('Proof trust signals unavailable:', err);
    if (ownerChip) setChipState(ownerChip, pt ? 'Indisponível' : 'Unavailable', 'off');
    if (mintChip) setChipState(mintChip, pt ? 'Indisponível' : 'Unavailable', 'off');
    lastProofSyncTs = Date.now();
    updateProofRpcMeta('off', lastProofSyncTs);
  }
}

// ─── Hero card UI ───────────────────────────────────────────────

interface ContractInfo {
  currentSupply: bigint;
  maxSupply: bigint;
  mintPrice: bigint;
  mintAmount: bigint;
  mintEnabled: boolean;
  bridge: Address;
}

function updateUI(info: ContractInfo): void {
  const currentSupply = formatEther(info.currentSupply);
  const maxSupply = formatEther(info.maxSupply);
  const price = formatEther(info.mintPrice);
  const amount = formatEther(info.mintAmount);

  const supplyCount = document.getElementById('supply-count');
  const infoAmount = document.getElementById('info-amount');
  const infoPrice = document.getElementById('info-price');
  const supplyBar = document.getElementById('supply-bar');

  if (supplyCount) supplyCount.textContent = Number(currentSupply).toLocaleString(numberLocale);
  if (infoAmount) infoAmount.textContent = `${Number(amount).toLocaleString(numberLocale)} $NEOFLW`;
  if (infoPrice) infoPrice.textContent = `${price} ETH`;
  if (supplyBar) {
    const percentage = (Number(currentSupply) / Number(maxSupply)) * 100;
    supplyBar.style.width = `${percentage}%`;
  }

  if (!info.mintEnabled) {
    const btn = document.getElementById('action-mint-btn') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = i18n.mintingDisabled;
    }
  }
}

// ─── Network ────────────────────────────────────────────────────

interface RpcError extends Error {
  code?: number | string;
  reason?: string;
  message: string;
}

async function checkNetwork(): Promise<void> {
  const eth = getInjectedProvider();
  if (!eth) return;
  const chainId = (await eth.request({ method: 'eth_chainId' })) as string;
  if (chainId === TARGET_CHAIN_ID_HEX) return;

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    const err = switchError as RpcError;
    if (err.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: TARGET_CHAIN_ID_HEX,
            chainName: 'Base Mainnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          },
        ],
      });
    } else {
      throw err;
    }
  }
  // Pequeno delay para wallet sincronizar estado interno após switch.
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

// ─── Mint button after-connect state ────────────────────────────

async function refreshMintButton(addr: Address): Promise<void> {
  const mintBtn = document.getElementById('action-mint-btn') as HTMLButtonElement | null;
  if (!mintBtn) return;
  try {
    const minted = await publicClient.readContract({
      address: onchain.contract,
      abi: NEOFLW_ABI,
      functionName: 'hasPublicMinted',
      args: [addr],
    });
    if (minted) {
      mintBtn.disabled = true;
      mintBtn.textContent = i18n.alreadyMinted;
    } else {
      mintBtn.textContent = i18n.mintNow;
      mintBtn.classList.add('connected');
    }
  } catch (err) {
    console.warn('hasPublicMinted check failed:', err);
  }
}

// ─── Auto-reconnect ─────────────────────────────────────────────

async function tryAutoReconnect(): Promise<void> {
  const saved = localStorage.getItem('neoflw_addr');
  const eth = getInjectedProvider();
  if (!saved || !eth) return;
  try {
    const accounts = (await eth.request({ method: 'eth_accounts' })) as string[];
    const first = accounts[0];
    if (first?.toLowerCase() === saved.toLowerCase()) {
      userAddress = first as Address;
      trackWallet(userAddress);
      setConnectButtonState(userAddress);
      await refreshMintButton(userAddress);
    } else {
      localStorage.removeItem('neoflw_addr');
    }
  } catch {
    localStorage.removeItem('neoflw_addr');
  }
}

// ─── Connect / Disconnect ───────────────────────────────────────

async function toggleWallet(): Promise<void> {
  if (userAddress) {
    userAddress = null;
    walletClient = null;
    localStorage.removeItem('neoflw_addr');
    setConnectButtonState(null);
    const mintBtn = document.getElementById('action-mint-btn') as HTMLButtonElement | null;
    if (mintBtn) {
      mintBtn.textContent = i18n.connectWalletToMint;
      mintBtn.classList.remove('connected');
      mintBtn.disabled = false;
      mintBtn.style.background = '';
    }
    return;
  }
  await connectWallet();
}

async function connectWallet(): Promise<void> {
  if (!getInjectedProvider()) {
    if (isMobile()) openWalletModal();
    else alert(i18n.installWallet);
    return;
  }

  try {
    const wc = getWalletClient();
    if (!wc) throw new Error('Wallet client unavailable');

    // 1) Pedir contas ANTES de switch — wallet precisa estar conectada.
    const addresses = await wc.requestAddresses();
    const addr = addresses[0];
    if (!addr) throw new Error('No account returned');

    // 2) Switch/add Base agora que wallet está conectada.
    await checkNetwork();

    userAddress = addr;
    localStorage.setItem('neoflw_addr', userAddress);
    trackWallet(userAddress);
    setConnectButtonState(userAddress);
    await refreshMintButton(userAddress);
  } catch (error) {
    console.error('Connection failed:', error);
    const err = error as RpcError;
    let msg = err.message || 'Failed to connect wallet.';
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) msg = i18n.rejected;
    if (err.code === 'BAD_DATA') msg = i18n.networkError;
    alert(msg);
  }
}

// ─── Mint ───────────────────────────────────────────────────────

async function doMint(): Promise<void> {
  if (!getInjectedProvider()) {
    if (isMobile()) openWalletModal();
    else alert(i18n.walletNotFound);
    return;
  }

  const mintBtn = document.getElementById('action-mint-btn') as HTMLButtonElement | null;

  try {
    if (!userAddress) {
      await connectWallet();
      if (!userAddress) return;
    }
    await checkNetwork();

    if (mintBtn) {
      mintBtn.textContent = i18n.checkingBalance;
      mintBtn.disabled = true;
    }

    const wc = getWalletClient();
    if (!wc) throw new Error('Wallet client unavailable');

    const [info, balance] = await Promise.all([
      publicClient.readContract({
        address: onchain.contract,
        abi: NEOFLW_ABI,
        functionName: 'getContractInfo',
      }),
      publicClient.getBalance({ address: userAddress }),
    ]);

    const price = info[2]; // mintPrice
    if (balance < price) {
      throw new Error(
        `Insufficient funds: You have ${Number(formatEther(balance)).toFixed(5)} ETH but need ${formatEther(
          price,
        )} ETH + gas.`,
      );
    }

    if (mintBtn) mintBtn.textContent = i18n.processingTx;

    const hash: Hex = await wc.writeContract({
      account: userAddress,
      chain: base,
      address: onchain.contract,
      abi: NEOFLW_ABI,
      functionName: 'publicMint',
      value: price,
    });

    if (mintBtn) mintBtn.textContent = i18n.waitingConfirmation;
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      if (mintBtn) {
        mintBtn.textContent = i18n.success;
        mintBtn.style.background = 'var(--green)';
        mintBtn.style.color = '#000';
      }
      setTimeout(() => {
        void init();
      }, 3000);
    } else {
      throw new Error('Transaction failed on-chain');
    }
  } catch (error) {
    console.error('Mint failed:', error);
    if (mintBtn) {
      mintBtn.textContent = i18n.mintNow;
      mintBtn.disabled = false;
    }

    const err = error as RpcError;
    let errorMsg: string = i18n.txFailed;
    if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
      errorMsg = i18n.rejectedTx;
    } else if (err.code === 'BAD_DATA') {
      errorMsg = i18n.networkError;
    } else if (err.message?.includes('Insufficient funds')) {
      errorMsg = err.message;
    } else if (err.message?.toLowerCase().includes('insufficient funds')) {
      errorMsg = i18n.lowBalance;
    } else if (err.reason) {
      errorMsg = `Contract error: ${err.reason}`;
    }
    alert(errorMsg);
  }
}

// ─── Live stats (off-chain APIs) ────────────────────────────────

async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function setStatsValues(price: number, vol24: number, mcap: number): void {
  const priceEl = document.getElementById('stat-price');
  const volEl = document.getElementById('stat-volume');
  const mcapEl = document.getElementById('stat-mcap');
  if (priceEl) priceEl.textContent = price < 0.01 ? '$' + price.toFixed(6) : '$' + price.toFixed(4);
  if (volEl) volEl.textContent = fmtUsd(vol24);
  if (mcapEl) mcapEl.textContent = fmtUsd(mcap);
}

interface GeckoResp {
  data: {
    attributes: {
      base_token_price_usd: string;
      volume_usd: { h24: string };
      fdv_usd?: string;
      market_cap_usd?: string;
    };
  };
}

interface DexScreenerResp {
  pairs?: Array<{
    priceUsd?: string;
    volume?: { h24?: string | number };
    marketCap?: string | number;
    fdv?: string | number;
  }>;
}

interface BasescanSupplyResp {
  status: string;
  result: string;
}

async function updateLiveStats(): Promise<void> {
  const statsBadge = document.getElementById('stats-status');
  let statsLoaded = false;

  try {
    const json = await fetchJsonWithTimeout<GeckoResp>(onchain.geckoApi, {
      headers: { Accept: 'application/json' },
    });
    const attr = json.data.attributes;
    const price = parseFloat(attr.base_token_price_usd);
    const vol24 = parseFloat(attr.volume_usd.h24);
    const mcap = parseFloat(attr.fdv_usd || attr.market_cap_usd || '0');
    setStatsValues(price, vol24, mcap);
    statsLoaded = true;
  } catch (err) {
    console.warn('GeckoTerminal stats fetch failed:', err);
  }

  if (!statsLoaded) {
    try {
      const dex = await fetchJsonWithTimeout<DexScreenerResp>(onchain.dexscreenerApi, {
        headers: { Accept: 'application/json' },
      });
      const pair = dex.pairs?.[0];
      if (pair) {
        const price = parseFloat(String(pair.priceUsd ?? 0));
        const vol24 = parseFloat(String(pair.volume?.h24 ?? 0));
        const mcap = parseFloat(String(pair.marketCap ?? pair.fdv ?? 0));
        setStatsValues(price, vol24, mcap);
        statsLoaded = true;
      }
    } catch (err) {
      console.warn('DexScreener stats fetch failed:', err);
    }
  }

  if (statsBadge) {
    statsBadge.style.opacity = '1';
    if (statsLoaded) {
      statsBadge.textContent = pt ? '● ao vivo' : '● live';
      statsBadge.style.color = 'var(--green)';
    } else {
      statsBadge.textContent = pt ? '● indisponível' : '● unavailable';
      statsBadge.style.color = 'var(--pink-soft)';
      const naLabel = pt ? 'N/D' : 'N/A';
      const priceEl = document.getElementById('stat-price');
      const volEl = document.getElementById('stat-volume');
      const mcapEl = document.getElementById('stat-mcap');
      if (priceEl) priceEl.textContent = naLabel;
      if (volEl) volEl.textContent = naLabel;
      if (mcapEl) mcapEl.textContent = naLabel;
    }
  }

  try {
    const supplyData = await fetchJsonWithTimeout<BasescanSupplyResp>(onchain.basescanSupplyApi);
    if (supplyData.status === '1') {
      const supply = parseInt(supplyData.result, 10) / 1e18;
      const pct = Math.round((supply / onchain.maxSupply) * 100);
      const supplyEl = document.getElementById('supply-count');
      if (supplyEl) supplyEl.textContent = supply.toLocaleString(numberLocale);
      const bar = document.getElementById('supply-bar');
      if (bar) bar.style.width = `${pct}%`;
      const hcPct = document.getElementById('hc-circ-pct');
      if (hcPct) hcPct.textContent = pct + '%';
      const hcFill = document.getElementById('hc-bar-fill');
      if (hcFill) hcFill.style.width = pct + '%';
    }
  } catch (err) {
    console.warn('Supply fetch failed:', err);
  }

  try {
    await updateProofTrustSignals();
  } catch (err) {
    console.warn('Proof trust refresh failed:', err);
    markProofRpcStaleIfNeeded();
  }
}

// ─── Setup / boot ───────────────────────────────────────────────

function copyAddr(): void {
  const addrEl = document.getElementById('addr');
  if (!addrEl) return;
  const addr = addrEl.textContent?.trim() ?? '';
  void navigator.clipboard.writeText(addr).then(() => {
    const btn = document.querySelector<HTMLElement>('.chip-copy');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = i18n.copied;
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = '';
    }, 2000);
  });
}

function setupEventListeners(): void {
  if (!listenersBound) {
    document.getElementById('connect-btn')?.addEventListener('click', () => void toggleWallet());
    document.getElementById('action-mint-btn')?.addEventListener('click', () => void doMint());
    document.querySelector('.chip-copy')?.addEventListener('click', copyAddr);

    // Mobile wallet modal
    document.getElementById('wallet-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeWalletModal();
    });
    document.querySelectorAll<HTMLElement>('[data-wallet]').forEach((el) => {
      el.addEventListener('click', () => {
        const w = el.dataset.wallet as 'metamask' | 'coinbase' | 'uniswap' | 'rainbow';
        openWalletDeepLink(w);
      });
    });
    document.querySelector('[data-close-wallet-modal]')?.addEventListener('click', () => closeWalletModal());

    listenersBound = true;
  }

  const eth = getInjectedProvider();
  if (eth && !walletEventsBound) {
    eth.on?.('chainChanged', () => window.location.reload());
    eth.on?.('accountsChanged', () => window.location.reload());
    walletEventsBound = true;
  }

  void updateLiveStats();
  if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
  liveStatsIntervalId = setInterval(() => void updateLiveStats(), LIVE_STATS_INTERVAL_MS);
}

async function init(): Promise<void> {
  setupEventListeners();

  try {
    const info = await publicClient.readContract({
      address: onchain.contract,
      abi: NEOFLW_ABI,
      functionName: 'getContractInfo',
    });
    updateUI({
      currentSupply: info[0],
      maxSupply: info[1],
      mintPrice: info[2],
      mintAmount: info[3],
      mintEnabled: info[4],
      bridge: info[5],
    });
  } catch (e) {
    console.error('Failed to load contract info:', e);
    // Fallback: BaseScan supply chega via updateLiveStats().
  }

  await updateProofTrustSignals();
  await tryAutoReconnect();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}
