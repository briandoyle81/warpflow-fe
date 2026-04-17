import type { PublicClient } from "viem";
import {
  applyLegacyGasPriceFloor,
  isRoninSaigonChain,
} from "../config/networks";

/** Optional `gasPrice` for wagmi `writeContract` when the chain enforces a legacy minimum. */
export async function getLegacyGasPriceOverridesForWrite(
  chainId: number,
  publicClient: Pick<PublicClient, "getGasPrice"> | null | undefined,
): Promise<{ gasPrice?: bigint }> {
  if (!publicClient || !isRoninSaigonChain(chainId)) return {};
  const quoted = await publicClient.getGasPrice();
  return { gasPrice: applyLegacyGasPriceFloor(chainId, quoted) };
}

/** +50% over network quote, with Ronin Saigon minimum applied. */
export function bumpedLegacyGasPriceForRetry(
  chainId: number,
  baseGasPriceWei: bigint,
): bigint {
  return applyLegacyGasPriceFloor(chainId, (baseGasPriceWei * 3n) / 2n);
}
