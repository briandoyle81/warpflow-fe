import React from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { Attributes } from "../types/types";

interface CachedAttributes {
  data: Attributes[];
  timestamp: number;
  shipIds: string[];
}

const CACHE_KEY = "ship-attributes-cache";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export function useShipAttributesByIds(shipIds: bigint[]) {
  // Convert shipIds to strings for caching
  const shipIdsString = React.useMemo(
    () =>
      shipIds
        .map((id) => id.toString())
        .sort()
        .join(","),
    [shipIds]
  );

  // Check cache first - memoized to prevent repeated calls
  const getCachedData = React.useCallback((): Attributes[] | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CachedAttributes = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid (within 1 week and same ship IDs)
      if (
        now - parsed.timestamp < CACHE_DURATION &&
        parsed.shipIds.join(",") === shipIdsString
      ) {
        console.log("Using cached ship attributes");
        return parsed.data;
      }

      // Cache expired or different ship IDs, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.warn("Failed to read ship attributes cache:", error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, [shipIdsString]);

  // Get cached data
  const cachedData = React.useMemo(() => getCachedData(), [getCachedData]);

  // Only call contract if we don't have valid cached data
  const shouldCallContract = !cachedData && shipIds.length > 0;

  const {
    data: contractData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
    functionName: "calculateShipAttributesByIds",
    args: shouldCallContract ? [shipIds] : undefined,
  });

  // Cache the contract data when it's received
  React.useEffect(() => {
    if (contractData && typeof window !== "undefined") {
      try {
        const cacheData: CachedAttributes = {
          data: contractData as Attributes[],
          timestamp: Date.now(),
          shipIds: shipIds.map((id) => id.toString()).sort(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log("Cached ship attributes for 1 week");
      } catch (error) {
        console.warn("Failed to cache ship attributes:", error);
      }
    }
  }, [contractData, shipIds]);

  // Return cached data if available, otherwise contract data
  const data = cachedData || (contractData as Attributes[]);

  return {
    attributes: data || [],
    isLoading: shouldCallContract ? isLoading : false,
    error,
    refetch,
    isFromCache: !!cachedData,
  };
}
