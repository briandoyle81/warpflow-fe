import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";

export function useSpecialRange(special: number) {
  const {
    data: specialRange,
    isLoading,
    error,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIP_ATTRIBUTES,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
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
