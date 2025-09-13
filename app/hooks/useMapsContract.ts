import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { MapPosition, ScoringPosition } from "../types/types";

// Contract instance configuration
export const mapsContractConfig = {
  address: CONTRACT_ADDRESSES.MAPS as `0x${string}`,
  abi: CONTRACT_ABIS.MAPS,
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

export function useGetPresetMap(mapId: number) {
  return useMapsRead("getPresetMap", [BigInt(mapId)], {
    query: { enabled: mapId > 0 },
  });
}

export function useGetPresetScoringMap(mapId: number) {
  return useMapsRead("getPresetScoringMap", [BigInt(mapId)], {
    query: { enabled: mapId > 0 },
  });
}

export function useMapExists(mapId: number) {
  return useMapsRead("mapExists", [BigInt(mapId)], {
    query: { enabled: mapId > 0 },
  });
}
