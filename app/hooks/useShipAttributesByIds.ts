import React from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { Attributes } from "../types/types";
import {
  readValidShipAttributesByIdsCache,
  shipIdsToCacheKeyString,
  writeShipAttributesByIdsCache,
} from "../utils/shipAttributesLocalCache";

export function useShipAttributesByIds(shipIds: bigint[]) {
  const shipIdsString = React.useMemo(
    () => shipIdsToCacheKeyString(shipIds),
    [shipIds],
  );

  const getCachedData = React.useCallback((): Attributes[] | null => {
    return readValidShipAttributesByIdsCache(shipIdsString);
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

  React.useEffect(() => {
    if (contractData) {
      writeShipAttributesByIdsCache(shipIds, contractData as Attributes[]);
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
