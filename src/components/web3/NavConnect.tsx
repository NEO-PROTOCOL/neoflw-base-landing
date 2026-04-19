import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';
import type { Connector } from 'wagmi';
import Web3Providers from './Web3Providers';
import { BASESCAN_URL } from '../../web3/abi';
import {
  classifyConnector,
  detectInjectedFlavor,
  isMobile,
  mobileDeeplinks,
  type InjectedFlavor,
} from '../../web3/walletEnv';

type WalletOption = {
  key: string;
  label: string;
  hint?: string;
  kind: 'connector' | 'deeplink';
  connector?: Connector;
  href?: string;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// SSR-safe environment snapshot. Captura uma vez após mount.
// Estado inicial neutro (mobile=false, injected=null) evita hydration mismatch:
// a primeira render client idêntica à do server, e o useEffect comita o real.
function useWalletEnv() {
  const [env, setEnv] = useState<{
    mobile: boolean;
    injected: InjectedFlavor | null;
  }>({ mobile: false, injected: null });

  useEffect(() => {
    setEnv({ mobile: isMobile(), injected: detectInjectedFlavor() });
  }, []);

  return env;
}

function buildOptions(connectors: readonly Connector[], env: ReturnType<typeof useWalletEnv>): WalletOption[] {
  const cb = connectors.find((c) => classifyConnector(c) === 'coinbase-smart-wallet');
  const eip6963 = connectors.filter((c) => classifyConnector(c) === 'eip6963');
  const injectedGeneric = connectors.find((c) => classifyConnector(c) === 'injected-generic');

  const opts: WalletOption[] = [];

  if (cb) {
    opts.push({
      key: cb.uid,
      label: 'Coinbase Smart Wallet',
      hint: 'no install · passkey',
      kind: 'connector',
      connector: cb,
    });
  }

  // Providers anunciados via EIP-6963 (MetaMask, Rabby, Phantom, …)
  // têm nome real; deduplicamos por id evitando colisão com o injected genérico.
  for (const c of eip6963) {
    opts.push({ key: c.uid, label: c.name, kind: 'connector', connector: c });
  }

  // Fallback genérico: só aparece se há provider injetado real
  // E nenhum connector EIP-6963 já cobriu a wallet.
  if (eip6963.length === 0 && injectedGeneric && env.injected) {
    opts.push({
      key: injectedGeneric.uid,
      label: env.injected.name,
      kind: 'connector',
      connector: injectedGeneric,
    });
  }

  // Mobile sem nenhuma wallet detectada → oferecer deep links de install/abrir.
  if (env.mobile && eip6963.length === 0 && !env.injected) {
    opts.push({
      key: 'dl-coinbase',
      label: 'Open in Coinbase Wallet',
      hint: 'mobile app',
      kind: 'deeplink',
      href: mobileDeeplinks.coinbase(),
    });
    opts.push({
      key: 'dl-metamask',
      label: 'Open in MetaMask',
      hint: 'mobile app',
      kind: 'deeplink',
      href: mobileDeeplinks.metamask(),
    });
  }

  return opts;
}

function NavConnectInner() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const env = useWalletEnv();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const options = useMemo(() => buildOptions(connectors, env), [connectors, env]);

  if (isConnected && address) {
    const label = ensName ?? shortAddr(address);
    return (
      <div className="nav-wallet-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className="nav-wallet-btn active"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open ? 'true' : 'false'}
          aria-haspopup="menu"
        >
          <span className="dot" style={{ background: 'var(--green)' }} />
          <span className="addr-txt">{label}</span>
        </button>
        {open && (
          <div className="nav-wallet-menu" role="menu" aria-label="Wallet actions">
            <div className="nav-wallet-menu-head" role="presentation">
              <span className="dot" style={{ background: 'var(--green)' }} />
              <span className="nav-wallet-menu-addr">{shortAddr(address)}</span>
            </div>
            <button type="button" role="menuitem" className="nav-wallet-menu-item" onClick={copyAddress}>
              {copied ? '✓ Copied' : 'Copy address'}
            </button>
            <a
              role="menuitem"
              className="nav-wallet-menu-item"
              href={`${BASESCAN_URL}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Basescan ↗
            </a>
            <button
              type="button"
              role="menuitem"
              className="nav-wallet-menu-item danger"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nav-wallet-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="nav-wallet-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="menu"
      >
        <span className="dot" />
        <span className="addr-txt">{isPending ? 'Connecting…' : 'Connect Wallet'}</span>
      </button>
      {open && (
        <div className="nav-wallet-menu" role="menu" aria-label="Choose a wallet">
          {options.map((opt) => {
            if (opt.kind === 'connector' && opt.connector) {
              const connector = opt.connector;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="menuitem"
                  className="nav-wallet-menu-item"
                  onClick={() => {
                    connect({ connector });
                    setOpen(false);
                  }}
                >
                  <span className="nav-wallet-menu-label">{opt.label}</span>
                  {opt.hint && <span className="nav-wallet-menu-hint">{opt.hint}</span>}
                </button>
              );
            }
            return (
              <a
                key={opt.key}
                role="menuitem"
                className="nav-wallet-menu-item"
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                <span className="nav-wallet-menu-label">{opt.label} ↗</span>
                {opt.hint && <span className="nav-wallet-menu-hint">{opt.hint}</span>}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NavConnect() {
  return (
    <Web3Providers>
      <NavConnectInner />
    </Web3Providers>
  );
}
