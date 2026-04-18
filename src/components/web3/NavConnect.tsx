import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';
import Web3Providers from './Web3Providers';
import { BASESCAN_URL } from '../../web3/abi';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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

  const visibleConnectors = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
  );

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
          {visibleConnectors.map((c) => (
            <button
              key={c.uid}
              type="button"
              role="menuitem"
              className="nav-wallet-menu-item"
              onClick={() => {
                connect({ connector: c });
                setOpen(false);
              }}
            >
              {c.name}
            </button>
          ))}
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
