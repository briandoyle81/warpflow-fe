import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

// Contract instance configuration
export const fleetsContractConfig = {
  address: CONTRACT_ADDRESSES.FLEETS as `0x${string}`,
  abi: CONTRACT_ABIS.FLEETS as Abi,
} as const;

// Hook for reading contract data
export function useFleetsContract() {
  return {
    address: fleetsContractConfig.address,
    abi: fleetsContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useFleetsRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    ...fleetsContractConfig,
    functionName,
    args,
    query: options?.query,
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

export function useFleetShipIdsAndPositions(
  fleetId?: bigint,
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    ...fleetsContractConfig,
    functionName: "getFleetShipIdsAndPositions",
    args: fleetId ? [fleetId] : undefined,
    query: options?.query,
  });
}
