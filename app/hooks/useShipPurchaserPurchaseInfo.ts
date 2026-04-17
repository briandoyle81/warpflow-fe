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

export function useShipPurchaserPurchaseInfo() {
  const chainId = useSelectedChainId();
  const purchaserAddr = getContractAddresses(chainId).SHIP_PURCHASER as `0x${string}`;
  const purchaserDeployed =
    Boolean(purchaserAddr) &&
    purchaserAddr.toLowerCase() !== ZERO.toLowerCase();

  const [reloadKey, setReloadKey] = React.useState(0);

  const fromCache = React.useMemo(() => {
    if (!purchaserDeployed) return null;
    return readValidShipPurchaseInfoCache(chainId, "shipPurchaser");
  }, [chainId, purchaserDeployed, reloadKey]);

  const shouldFetch = purchaserDeployed && fromCache === null;

  const { data, isLoading, error, refetch } = useReadContract({
    address: purchaserAddr,
    abi: CONTRACT_ABIS.SHIP_PURCHASER,
    chainId,
    functionName: "getPurchaseInfo",
    query: { enabled: shouldFetch },
  });

  React.useEffect(() => {
    if (!data || !purchaserDeployed) return;
    const normalized = normalizeGetPurchaseInfoTuple(data);
    if (normalized && normalized.tierCount > 0) {
      writeShipPurchaseInfoCache(chainId, "shipPurchaser", normalized);
    }
  }, [data, chainId, purchaserDeployed]);

  const normalized = React.useMemo(() => {
    if (fromCache) return fromCache;
    return normalizeGetPurchaseInfoTuple(data);
  }, [fromCache, data]);

  const refetchFromChain = React.useCallback(() => {
    invalidateShipPurchaseInfoCache(chainId, "shipPurchaser");
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
    purchaserDeployed,
  };
}
