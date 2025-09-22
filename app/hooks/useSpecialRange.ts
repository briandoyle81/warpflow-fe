import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

export function useSpecialRange(special: number) {
  const {
    data: specialRange,
    isLoading,
    error,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi,
    functionName: "getSpecialRange",
    args: [special],
    query: {
      enabled: special > 0, // Only fetch if special is not "None"
    },
  });

  return {
    specialRange: specialRange as number | undefined,
    isLoading,
    error,
  };
}
