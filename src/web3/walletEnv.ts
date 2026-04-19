/**
 * Detecção de ambiente de wallet — pura, sem React, sem Wagmi.
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
};

export function detectInjectedFlavor(): InjectedFlavor | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as { ethereum?: Eip1193Like }).ethereum;
  if (!eth) return null;

  if (eth.isBraveWallet) return { id: 'brave', name: 'Brave Wallet' };
  if (eth.isRabby) return { id: 'rabby', name: 'Rabby' };
  if (eth.isPhantom) return { id: 'phantom', name: 'Phantom' };
  if (eth.isFrame) return { id: 'frame', name: 'Frame' };
  if (eth.isTrust || eth.isTrustWallet) return { id: 'trust', name: 'Trust Wallet' };
  if (eth.isOkxWallet) return { id: 'okx', name: 'OKX Wallet' };
  if (eth.isZerion) return { id: 'zerion', name: 'Zerion' };
  if (eth.isRainbow) return { id: 'rainbow', name: 'Rainbow' };
  if (eth.isCoinbaseWallet || eth.isCoinbaseBrowser) {
    return { id: 'coinbase-extension', name: 'Coinbase Extension' };
  }
  if (eth.isMetaMask) return { id: 'metamask', name: 'MetaMask' };
  return { id: 'injected', name: 'Browser Wallet' };
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

export const mobileDeeplinks = {
  coinbase(targetUrl = currentUrlSafe()): string {
    return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(targetUrl)}`;
  },
  metamask(targetUrl = currentUrlSafe()): string {
    const stripped = targetUrl.replace(/^https?:\/\//, '');
    return `https://metamask.app.link/dapp/${stripped}`;
  },
  trust(targetUrl = currentUrlSafe()): string {
    return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(targetUrl)}`;
  },
  rainbow(targetUrl = currentUrlSafe()): string {
    return `https://rnbwapp.com/${targetUrl.replace(/^https?:\/\//, '')}`;
  },
};
