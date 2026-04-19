import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';
import type { Connector } from 'wagmi';
import Web3Providers from './Web3Providers';
import { BASESCAN_URL } from '../../web3/abi';
import {
  classifyConnector,
  detectInjectedFlavor,
  isMobile,
  mobileDeeplinks,
} from '../../web3/walletEnv';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Auto-pick policy (issue: simplificar UX do nav).
 *
 * Em vez de mostrar dropdown com 3+ wallets, escolhemos uma sozinha:
 *
 *   1. EIP-6963 announced → primeira da lista (browser ordena por preferência
 *      do usuário; Wagmi preserva essa ordem). Cobre MetaMask, Rabby, etc.
 *   2. Injected-generic com flavor detectado → fallback para wallets que ainda
 *      não anunciam EIP-6963.
 *   3. Coinbase Smart Wallet → onboarding default (passkey, no install). É o
 *      caminho oficial para Base Mainnet, então faz sentido como rota padrão
 *      de quem chega sem nenhuma extensão.
 *
 * Se o usuário já tem extensão e quer escolher OUTRA, ele troca pela própria
 * UI da extensão (popup do MetaMask permite ver outras contas/redes). Não
 * precisamos duplicar wallet picker no app — isso só adiciona um clique e
 * paralisia de decisão no funil de mint.
 */
function pickConnector(connectors: readonly Connector[]): Connector | null {
  const eip6963 = connectors.filter((c) => classifyConnector(c) === 'eip6963');
  if (eip6963.length > 0) return eip6963[0];

  if (detectInjectedFlavor()) {
    const injected = connectors.find((c) => classifyConnector(c) === 'injected-generic');
    if (injected) return injected;
  }

  const cb = connectors.find((c) => classifyConnector(c) === 'coinbase-smart-wallet');
  if (cb) return cb;

  return null;
}

function NavConnectInner() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  function handleConnect() {
    const picked = pickConnector(connectors);
    if (picked) {
      connect({ connector: picked });
      return;
    }
    // Mobile sem injected e sem Coinbase connector → empurra para o app oficial.
    // (No desktop esse galho não é alcançado: Coinbase Smart Wallet sempre existe
    // como connector configurado em wagmi.config.)
    if (isMobile()) {
      window.open(mobileDeeplinks.coinbase(), '_blank', 'noopener,noreferrer');
    }
  }

  if (isConnected && address) {
    const label = ensName ?? shortAddr(address);
    return (
      <div className="nav-wallet-wrapper" ref={wrapperRef}>
        <button
          type="button"
          className="nav-wallet-btn active"
          onClick={() => setOpen((o: boolean) => !o)}
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
        onClick={handleConnect}
        disabled={isPending}
      >
        <span className="dot" />
        <span className="addr-txt">{isPending ? 'Connecting…' : 'Connect Wallet'}</span>
      </button>
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
