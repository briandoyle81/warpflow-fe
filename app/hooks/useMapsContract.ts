import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

// Contract instance configuration
export const mapsContractConfig = {
  address: CONTRACT_ADDRESSES.MAPS as `0x${string}`,
  abi: CONTRACT_ABIS.MAPS as Abi,
} as const;

// Hook for reading contract data
export function useMapsContract() {
  return {
    address: mapsContractConfig.address,
    abi: mapsContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useMapsRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    ...mapsContractConfig,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useMapsWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type MapsReadFunction =
  | "mapCount"
  | "getAllPresetMaps"
  | "getPresetMap"
  | "getPresetScoringMap"
  | "mapExists";

// Specific hooks for common functions
export function useMapCount() {
  return useMapsRead("mapCount");
}

export function useGetAllPresetMaps() {
  return useMapsRead("getAllPresetMaps");
}

function isValidPositiveInt(n: number) {
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export function useGetPresetMap(mapId: number) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("getPresetMap", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
  });
}

export function useGetPresetScoringMap(mapId: number) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead(
    "getPresetScoringMap",
    enabled ? [BigInt(mapId)] : undefined,
    {
      query: { enabled },
    }
  );
}

export function useMapExists(mapId: number) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("mapExists", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
  });
}

const gameIdCallCounts: Record<number, number> = {};

export function useGetGameMapState(gameId: number) {
  gameIdCallCounts[gameId] = (gameIdCallCounts[gameId] || 0) + 1;

  const result = useMapsRead("getGameMapState", [BigInt(gameId)], {
    query: {
      enabled: gameId > 0,
      // Note: staleTime and gcTime may not be supported by wagmi's useReadContract
      // The caching is handled by React Query internally
    },
  });

  return result;
}
