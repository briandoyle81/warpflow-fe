import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";

// Contract instance configuration
export const fleetsContractConfig = {
  address: CONTRACT_ADDRESSES.FLEETS as `0x${string}`,
  abi: CONTRACT_ABIS.FLEETS,
} as const;

// Hook for reading contract data
export function useFleetsContract() {
  return {
    address: fleetsContractConfig.address,
    abi: fleetsContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useFleetsRead<TData>(
  functionName: string,
  args?: readonly unknown[]
) {
  return useReadContract({
    ...fleetsContractConfig,
    functionName,
    args,
  });
}

// Hook for writing to contract with proper typing
export function useFleetsWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type FleetsReadFunction =
  | "getFleetShipIds"
  | "getFleet"
  | "getFleetCount"
  | "getFleetIdsOwned"
  | "getFleetIdsInLobby";

export type FleetsWriteFunction = "createFleet" | "withdrawFleet";
