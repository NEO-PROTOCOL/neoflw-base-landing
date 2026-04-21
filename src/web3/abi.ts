import type { Address } from 'viem';

export const NEOFLW_ADDRESS = ((import.meta.env.PUBLIC_CONTRACT_ADDRESS ?? '').trim() ||
  '0x41F4ff3d45DED9C1332e4908F637B75fe83F5d6B') as Address;

export const NEOFLW_ABI = [
  {
    type: 'function',
    name: 'getContractInfo',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'currentSupply', type: 'uint256' },
      { name: 'maxSupply', type: 'uint256' },
      { name: 'mintPrice', type: 'uint256' },
      { name: 'mintAmount', type: 'uint256' },
      { name: 'mintEnabled', type: 'bool' },
      { name: 'bridge', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'publicMint',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'hasPublicMinted',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'bridgeMinter',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'publicMintEnabled',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'PROTOCOL_TREASURY',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'PROTOCOL_FEE_BPS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const BASE_CHAIN_ID = 8453;

/**
 * Basescan explorer origin (scheme + host only).
 *
 * Normaliza `PUBLIC_BASESCAN_URL` para o origin da URL, descartando
 * qualquer path residual. Protege contra env mal-formado do tipo
 * `https://basescan.org/token/0xabc...` que no passado gerou
 * duplicação de path (`/token/0x.../token/0x...`) e 404 em todos os
 * links do explorer na home. Fallback: `https://basescan.org`.
 */
export const BASESCAN_URL = (() => {
  const raw = (import.meta.env.PUBLIC_BASESCAN_URL ?? '').trim();
  try {
    return new URL(raw || 'https://basescan.org').origin;
  } catch {
    return 'https://basescan.org';
  }
})();
