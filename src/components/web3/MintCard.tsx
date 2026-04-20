import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { encodeFunctionData, formatEther, type Hex } from 'viem';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
} from '@coinbase/onchainkit/transaction';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import Web3Providers from './Web3Providers';
import {
  BASE_CHAIN_ID,
  BASESCAN_URL,
  MAX_SUPPLY_TOKENS,
  NEOFLW_ABI,
  NEOFLW_ADDRESS,
} from '../../web3/constants';
import { withBuilderCode } from '../../web3/attribution';

type Call = { to: Hex; data?: Hex; value?: bigint };

const MAX_SUPPLY = BigInt(MAX_SUPPLY_TOKENS);

type Props = {
  pt?: boolean;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mint-stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function MintInner({ pt }: Props) {
  const { address, isConnected } = useAccount();

  const info = useReadContract({
    address: NEOFLW_ADDRESS,
    abi: NEOFLW_ABI,
    functionName: 'getContractInfo',
    chainId: BASE_CHAIN_ID,
  });

  const hasMinted = useReadContract({
    address: NEOFLW_ADDRESS,
    abi: NEOFLW_ABI,
    functionName: 'hasPublicMinted',
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const data = info;
  const priceWei = data?.[2] ?? 0n;
  const supplyWei = data?.[0] ?? 0n;
  const amountWei = data?.[3] ?? 0n;
  const mintEnabled = data?.[4] ?? false;

  const priceEth = data ? formatEther(priceWei) : '—';
  const amountFmt = data ? Number(formatEther(amountWei)).toLocaleString() : '—';
  const supplyFmt = data
    ? `${Number(formatEther(supplyWei)).toLocaleString()} / ${MAX_SUPPLY.toLocaleString()}`
    : '—';

  const calls = useMemo<Call[]>(() => {
    if (!data || !mintEnabled) return [];
    return [
      {
        to: NEOFLW_ADDRESS,
        data: withBuilderCode(
          encodeFunctionData({
            abi: NEOFLW_ABI,
            functionName: 'publicMint',
          }),
        ),
        value: priceWei,
      },
    ];
  }, [data, mintEnabled, priceWei]);

  const labels = pt
    ? {
        network: 'Rede',
        price: 'Preço',
        receive: 'Você recebe',
        minted: 'Mintado',
        connectFirst: 'Conectar Wallet',
        mintBtn: 'Mint $NEOFLW',
        already: 'Mint já realizado ✓',
        success: 'Mint concluído ✓',
        confirming: 'Confirmando...',
        viewTx: 'Ver transação na Basescan ↗',
        disabled: 'Mint desabilitado',
      }
    : {
        network: 'Network',
        price: 'Mint Price',
        receive: 'You Receive',
        minted: 'Minted',
        connectFirst: 'Connect Wallet',
        mintBtn: 'Mint $NEOFLW',
        already: 'Already Minted ✓',
        success: 'Minted ✓',
        confirming: 'Confirming...',
        viewTx: 'View transaction on Basescan ↗',
        disabled: 'Mint disabled',
      };

  return (
    <>
      <div className="mint-grid">
        <Stat label={labels.network} value="Base Mainnet" />
        <Stat label={labels.price} value={`${priceEth} ETH`} />
        <Stat label={labels.receive} value={`${amountFmt} $NEOFLW`} />
        <Stat label={labels.minted} value={supplyFmt} />
      </div>

      <div className="mint-action-slot">
        {!isConnected ? (
          <Wallet>
            <ConnectWallet className="mint-btn">
              <span>{labels.connectFirst}</span>
            </ConnectWallet>
          </Wallet>
        ) : hasMinted.data ? (
          <button className="mint-btn" disabled>
            {labels.already}
          </button>
        ) : !mintEnabled ? (
          <button className="mint-btn" disabled>
            {labels.disabled}
          </button>
        ) : (
          <Transaction
            chainId={BASE_CHAIN_ID}
            calls={calls}
            isSponsored
            onSuccess={() => {
              info.refetch();
              hasMinted.refetch();
            }}
          >
            <TransactionButton text={labels.mintBtn} className="mint-btn" />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
            <TransactionToast>
              <TransactionToastIcon />
              <TransactionToastLabel />
              <TransactionToastAction />
            </TransactionToast>
          </Transaction>
        )}
      </div>

      <noscript>
        <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: '0.6rem' }}>
          {pt
            ? 'JavaScript é necessário para mintar.'
            : 'JavaScript is required to mint.'}{' '}
          <a href={`${BASESCAN_URL}/address/${NEOFLW_ADDRESS}`}>{labels.viewTx}</a>
        </p>
      </noscript>
    </>
  );
}

export default function MintCard({ pt = false }: Props) {
  return (
    <Web3Providers>
      <MintInner pt={pt} />
    </Web3Providers>
  );
}
