import type { Hex } from 'viem';
import { Attribution } from 'ox/erc8021';

const builderCode =
  (import.meta.env.PUBLIC_BUILDER_CODE ?? import.meta.env.BUILDER_CODE ?? '').trim();

/**
 * ERC-8021 data suffix for Base Builder Code attribution.
 * Falls back to `undefined` when the builder code is not configured.
 */
export const DATA_SUFFIX: Hex | undefined = (() => {
  if (!builderCode) return undefined;
  try {
    return Attribution.toDataSuffix({ codes: [builderCode] }) as Hex;
  } catch {
    return undefined;
  }
})();

/**
 * Appends the ERC-8021 attribution suffix to calldata when available.
 */
export function withBuilderCode(data: Hex): Hex {
  if (!DATA_SUFFIX) return data;
  return `${data}${DATA_SUFFIX.slice(2)}` as Hex;
}
