"use client";

import React from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";
import { normalizeGetPurchaseInfoTuple } from "../utils/normalizePurchaseInfo";
import {
  readValidShipPurchaseInfoCache,
  writeShipPurchaseInfoCache,
  invalidateShipPurchaseInfoCache,
} from "../utils/shipPurchaseInfoCache";

const ZERO = "0x0000000000000000000000000000000000000000";

export function useShipsPurchaseInfo() {
  const chainId = useSelectedChainId();
  const shipsAddr = getContractAddresses(chainId).SHIPS as `0x${string}`;
  const shipsDeployed =
    Boolean(shipsAddr) && shipsAddr.toLowerCase() !== ZERO.toLowerCase();

  const [reloadKey, setReloadKey] = React.useState(0);

  const fromCache = React.useMemo(() => {
    if (!shipsDeployed) return null;
    return readValidShipPurchaseInfoCache(chainId, "ships");
  }, [chainId, shipsDeployed, reloadKey]);

  const shouldFetch = shipsDeployed && fromCache === null;

  const { data, isLoading, error, refetch } = useReadContract({
    address: shipsAddr,
    abi: CONTRACT_ABIS.SHIPS,
    chainId,
    functionName: "getPurchaseInfo",
    query: { enabled: shouldFetch },
  });

  React.useEffect(() => {
    if (!data || !shipsDeployed) return;
    const normalized = normalizeGetPurchaseInfoTuple(data);
    if (normalized && normalized.tierCount > 0) {
      writeShipPurchaseInfoCache(chainId, "ships", normalized);
    }
  }, [data, chainId, shipsDeployed]);

  const normalized = React.useMemo(() => {
    if (fromCache) return fromCache;
    return normalizeGetPurchaseInfoTuple(data);
  }, [fromCache, data]);

  const refetchFromChain = React.useCallback(() => {
    invalidateShipPurchaseInfoCache(chainId, "ships");
    setReloadKey((k) => k + 1);
    void refetch();
  }, [chainId, refetch]);

  return {
    tierCount: normalized?.tierCount ?? 0,
    tiers: normalized?.tiers ?? [],
    shipsPerTier: normalized?.shipsPerTier ?? [],
    pricesWei: normalized?.pricesWei ?? [],
    normalized,
    isLoading: shouldFetch && isLoading,
    error,
    isFromCache: fromCache !== null,
    refetch: refetchFromChain,
  };
}
