/**
 * Detecção de ambiente de wallet — pura, sem React.
 * Acopla-se a Wagmi apenas por tipo (`Connector`), sem runtime.
 * Tudo que precisa de `window` é guardado por SSR-safe checks.
 */

import type { Connector } from 'wagmi';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type InjectedFlavor = {
  id: string;
  name: string;
  rdns?: string;
};

export type ConnectorKind =
  | 'coinbase-smart-wallet'
  | 'eip6963'
  | 'injected-generic'
  | 'walletconnect'
  | 'unknown';

// ─────────────────────────────────────────────────────────────
// Device / viewport
// ─────────────────────────────────────────────────────────────

const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i;

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  if (MOBILE_UA_RE.test(navigator.userAgent || '')) return true;
  return (
    window.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches ?? false
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

// ─────────────────────────────────────────────────────────────
// Provider injection (window.ethereum)
// ─────────────────────────────────────────────────────────────

type Eip1193Like = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isBraveWallet?: boolean;
  isFrame?: boolean;
  isPhantom?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
  isOkxWallet?: boolean;
  isZerion?: boolean;
  isRainbow?: boolean;
  // Legacy multi-provider pattern — deprecated em favor de EIP-6963,
  // mas ainda presente em builds antigos de MetaMask/Coinbase Wallet.
  providers?: Eip1193Like[];
};

// Ordem: flags específicas antes de MetaMask porque vários wallets
// setam `isMetaMask: true` além da própria flag (ex: Brave, Coinbase).
function classifyProvider(p: Eip1193Like): InjectedFlavor {
  if (p.isBraveWallet) return { id: 'brave', name: 'Brave Wallet' };
  if (p.isRabby) return { id: 'rabby', name: 'Rabby' };
  if (p.isPhantom) return { id: 'phantom', name: 'Phantom' };
  if (p.isFrame) return { id: 'frame', name: 'Frame' };
  if (p.isTrust || p.isTrustWallet) return { id: 'trust', name: 'Trust Wallet' };
  if (p.isOkxWallet) return { id: 'okx', name: 'OKX Wallet' };
  if (p.isZerion) return { id: 'zerion', name: 'Zerion' };
  if (p.isRainbow) return { id: 'rainbow', name: 'Rainbow' };
  if (p.isCoinbaseWallet || p.isCoinbaseBrowser) {
    return { id: 'coinbase-extension', name: 'Coinbase Extension' };
  }
  if (p.isMetaMask) return { id: 'metamask', name: 'MetaMask' };
  return { id: 'injected', name: 'Browser Wallet' };
}

export function detectInjectedFlavor(): InjectedFlavor | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as { ethereum?: Eip1193Like }).ethereum;
  if (!eth) return null;

  // Multi-provider pattern legado: quando várias wallets coexistem
  // sem EIP-6963, expõem-se em `ethereum.providers[]`. Preferimos o
  // provider mais específico (não-MetaMask genérico).
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    const specific = eth.providers.find((p) => {
      const f = classifyProvider(p);
      return f.id !== 'metamask' && f.id !== 'injected';
    });
    if (specific) return classifyProvider(specific);
    return classifyProvider(eth.providers[0]);
  }

  return classifyProvider(eth);
}

// ─────────────────────────────────────────────────────────────
// Wagmi connector taxonomy
// ─────────────────────────────────────────────────────────────

export function classifyConnector(c: Connector): ConnectorKind {
  const id = c.id ?? '';
  const type = (c.type ?? '') as string;
  if (id === 'coinbaseWalletSDK' || id === 'coinbaseWallet' || type === 'coinbaseWallet') {
    return 'coinbase-smart-wallet';
  }
  if (type === 'walletConnect' || id === 'walletConnect') return 'walletconnect';
  // EIP-6963 connectors usam reverse-DNS rdns como id (io.metamask, app.phantom, …)
  if (/^[a-z0-9-]+\.[a-z0-9.-]+$/i.test(id)) return 'eip6963';
  if (id === 'injected' || type === 'injected') return 'injected-generic';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────
// Mobile deep links (universal links)
// ─────────────────────────────────────────────────────────────

function currentUrlSafe(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

/**
 * Sanitiza URL para uso em deep links cujo formato oficial espera
 * o host/path cru (MetaMask `/dapp/`, Rainbow). `encodeURIComponent`
 * no path quebraria esses providers. Remove apenas caracteres que
 * jamais fazem parte de um host/path válido.
 */
function safeDappPath(targetUrl: string): string {
  const stripped = targetUrl.replace(/^https?:\/\//, '');
  // Remove caracteres de controle, espaços, aspas — preserva `/`, `?`, `#`, `&`
  // porque providers aceitam path + query completos.
  return stripped.replace(/[\s"'<>\\^`{|}]+/g, '');
}

export const mobileDeeplinks = {
  // Coinbase exige o URL completo como query param → encodeURIComponent OK.
  coinbase(targetUrl = currentUrlSafe()): string {
    return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(targetUrl)}`;
  },
  // MetaMask universal link: host cru no path, sem schema, sem encoding adicional.
  // Docs: https://docs.metamask.io/wallet/how-to/use-mobile/
  metamask(targetUrl = currentUrlSafe()): string {
    return `https://metamask.app.link/dapp/${safeDappPath(targetUrl)}`;
  },
  // Trust aceita URL completa em query param → encodeURIComponent OK.
  trust(targetUrl = currentUrlSafe()): string {
    return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(targetUrl)}`;
  },
  // Rainbow universal link: host cru no path, mesmo padrão do MetaMask.
  rainbow(targetUrl = currentUrlSafe()): string {
    return `https://rnbwapp.com/${safeDappPath(targetUrl)}`;
  },
};
