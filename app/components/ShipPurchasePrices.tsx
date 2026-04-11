"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { getNativeTokenSymbol } from "../config/networks";
import { TransactionButton } from "./TransactionButton";
import { useShipPurchasePricesAccess } from "../hooks/useShipPurchasePricesAccess";
import { useShipsPurchaseInfo } from "../hooks/useShipsPurchaseInfo";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import { invalidateShipPurchaseInfoCache } from "../utils/shipPurchaseInfoCache";

function emptyTxArgs(n: number): [number[], bigint[]] {
  return [
    Array.from({ length: n }, () => 0),
    Array.from({ length: n }, () => 0n),
  ];
}

function buildArgs(
  ships: number[],
  priceStrings: string[],
): { ok: true; args: [number[], bigint[]] } | { ok: false; error: string } {
  const n = ships.length;
  if (n === 0 || n !== priceStrings.length) {
    return { ok: false, error: "Ship and price rows must match and be non-empty" };
  }
  const tierShips: number[] = [];
  const tierPrices: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const num = Math.floor(Number(ships[i]));
    if (!Number.isFinite(num) || num < 0 || num > 255) {
      return { ok: false, error: `Tier ${i}: ship count must be 0 to 255` };
    }
    tierShips.push(num);
    try {
      tierPrices.push(parseEther(priceStrings[i]?.trim() || "0"));
    } catch {
      return { ok: false, error: `Tier ${i}: invalid price` };
    }
  }
  return { ok: true, args: [tierShips, tierPrices] };
}

const ShipPurchasePrices: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const nativeSymbol = getNativeTokenSymbol(chainId);
  const shipsAddress = getContractAddresses(chainId).SHIPS as `0x${string}`;
  const purchaserAddress = getContractAddresses(chainId).SHIP_PURCHASER as `0x${string}`;
  const {
    isShipsOwner,
    isPurchaserOwner,
    canAdminShipPurchasePrices,
    purchaserDeployed,
    shipsOwner,
    purchaserOwner,
  } = useShipPurchasePricesAccess();

  const shipsInfo = useShipsPurchaseInfo();
  const utcInfo = useShipPurchaserPurchaseInfo();

  const [nativeShips, setNativeShips] = useState<number[]>([]);
  const [nativeEth, setNativeEth] = useState<string[]>([]);
  const [utcShips, setUtcShips] = useState<number[]>([]);
  const [utcTokens, setUtcTokens] = useState<string[]>([]);

  useEffect(() => {
    if (shipsInfo.tierCount === 0) return;
    setNativeShips([...shipsInfo.shipsPerTier]);
    setNativeEth(shipsInfo.pricesWei.map((w) => formatEther(w)));
  }, [
    shipsInfo.tierCount,
    shipsInfo.shipsPerTier.join(","),
    shipsInfo.pricesWei.map((x) => x.toString()).join(","),
  ]);

  useEffect(() => {
    if (utcInfo.tierCount === 0) return;
    setUtcShips([...utcInfo.shipsPerTier]);
    setUtcTokens(utcInfo.pricesWei.map((w) => formatEther(w)));
  }, [
    utcInfo.tierCount,
    utcInfo.shipsPerTier.join(","),
    utcInfo.pricesWei.map((x) => x.toString()).join(","),
  ]);

  const nativeBuilt = useMemo(
    () => buildArgs(nativeShips, nativeEth),
    [nativeShips, nativeEth],
  );
  const utcBuilt = useMemo(() => buildArgs(utcShips, utcTokens), [utcShips, utcTokens]);

  const nativeTxArgs = nativeBuilt.ok
    ? nativeBuilt.args
    : emptyTxArgs(nativeShips.length || shipsInfo.tierCount || 1);
  const utcTxArgs = utcBuilt.ok
    ? utcBuilt.args
    : emptyTxArgs(utcShips.length || utcInfo.tierCount || 1);

  const isReloadingFromChain =
    shipsInfo.isLoading || (purchaserDeployed && utcInfo.isLoading);

  const handleClearCacheAndReload = useCallback(() => {
    invalidateShipPurchaseInfoCache(chainId, "ships");
    invalidateShipPurchaseInfoCache(chainId, "shipPurchaser");
    shipsInfo.refetch();
    if (purchaserDeployed) {
      utcInfo.refetch();
    }
    toast.success("Purchase price cache cleared. Reloading from chain.");
  }, [
    chainId,
    purchaserDeployed,
    shipsInfo.refetch,
    utcInfo.refetch,
  ]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Connect your wallet to open this tab.</p>
      </div>
    );
  }

  if (!canAdminShipPurchasePrices) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-red-400">
          Access denied. Only the Ships or ShipPurchaser contract owner can view
          this admin tab.
        </p>
        <p className="text-gray-400 text-sm font-mono">
          Ships owner: {shipsOwner ?? "…"}
        </p>
        <p className="text-gray-400 text-sm font-mono">
          ShipPurchaser owner:{" "}
          {purchaserDeployed ? (purchaserOwner ?? "…") : "not deployed"}
        </p>
        <p className="text-gray-400 text-sm font-mono">You: {address}</p>
      </div>
    );
  }

  const btnClass =
    "px-4 py-2 rounded-none border-2 border-cyan-400 text-cyan-400 font-mono font-bold text-sm tracking-wider transition-colors hover:bg-cyan-400/10 disabled:opacity-50";

  const renderSection = (config: {
    title: string;
    subtitle: string;
    canEdit: boolean;
    tierIndices: number[];
    ships: number[];
    setShips: React.Dispatch<React.SetStateAction<number[]>>;
    prices: string[];
    setPrices: React.Dispatch<React.SetStateAction<string[]>>;
    priceLabel: string;
    contractAddress: `0x${string}`;
    abi: Abi;
    transactionId: string;
    saveLabel: string;
    built: ReturnType<typeof buildArgs>;
    txArgs: [number[], bigint[]];
    isLoading: boolean;
    emptyMessage: string;
    onAfterSuccess: () => void;
  }) => {
    if (config.isLoading && config.tierIndices.length === 0) {
      return (
        <div className="bg-gray-800 rounded-none p-4 border border-gray-700">
          <h3 className="text-lg font-mono text-white mb-1">{config.title}</h3>
          <p className="text-gray-400 text-sm font-mono">Loading…</p>
        </div>
      );
    }
    if (config.tierIndices.length === 0) {
      return (
        <div className="bg-gray-800 rounded-none p-4 border border-gray-700">
          <h3 className="text-lg font-mono text-white mb-1">{config.title}</h3>
          <p className="text-red-400 text-sm font-mono">{config.emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 rounded-none p-4 border border-gray-700">
        <h3 className="text-lg font-mono text-white mb-1">{config.title}</h3>
        <p className="text-sm text-gray-400 mb-4">{config.subtitle}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-600 text-gray-400">
                <th className="py-2 pr-4">Tier</th>
                <th className="py-2 pr-4">Ships / pack</th>
                <th className="py-2">Price ({config.priceLabel})</th>
              </tr>
            </thead>
            <tbody>
              {config.tierIndices.map((tier, i) => (
                <tr key={tier} className="border-b border-gray-700/80">
                  <td className="py-2 pr-4 text-cyan-300">{tier}</td>
                  <td className="py-2 pr-4">
                    {config.canEdit ? (
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={config.ships[i] ?? 0}
                        onChange={(e) => {
                          const v = e.target.value;
                          config.setShips((prev) => {
                            const next = [...prev];
                            next[i] = v === "" ? 0 : Number(v);
                            return next;
                          });
                        }}
                        className="w-24 px-2 py-1 bg-gray-900 border border-gray-600 text-white rounded-none"
                      />
                    ) : (
                      <span className="text-white">{config.ships[i]}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {config.canEdit ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={config.prices[i] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          config.setPrices((prev) => {
                            const next = [...prev];
                            next[i] = v;
                            return next;
                          });
                        }}
                        className="w-full max-w-[14rem] px-2 py-1 bg-gray-900 border border-gray-600 text-white rounded-none"
                      />
                    ) : (
                      <span className="text-white">{config.prices[i]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {config.canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <TransactionButton
              transactionId={config.transactionId}
              contractAddress={config.contractAddress}
              abi={config.abi}
              functionName="setPurchaseInfo"
              args={config.txArgs}
              allowWhenOtherPending
              disabled={!config.built.ok}
              className={btnClass}
              style={{ borderRadius: 0 }}
              validateBeforeTransaction={() =>
                config.built.ok ? true : config.built.error
              }
              onSuccess={() => {
                toast.success("Purchase info updated");
                config.onAfterSuccess();
              }}
              onError={() => toast.error("Update failed")}
            >
              {config.saveLabel}
            </TransactionButton>
          </div>
        ) : (
          <p className="mt-3 text-amber-200/90 text-xs font-mono">
            Connect as this contract&apos;s owner to submit updates.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-none p-4 border border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-mono text-white mb-2">
              Ship pack purchase prices
            </h2>
            <p className="text-sm text-gray-400">
              Data loads from the chain and is cached in your browser for one
              week. Native purchases use{" "}
              <span className="text-gray-300">Ships.purchaseWithFlow</span>. UTC
              pack purchases use{" "}
              <span className="text-gray-300">ShipPurchaser.purchaseWithUC</span>.
              Each contract stores tier ship counts and prices with{" "}
              <span className="text-gray-300">setPurchaseInfo</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearCacheAndReload}
            disabled={isReloadingFromChain}
            className="shrink-0 px-4 py-2 rounded-none border-2 border-amber-400/90 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-amber-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReloadingFromChain
              ? "[RELOADING…]"
              : "[CLEAR CACHE & RELOAD]"}
          </button>
        </div>
      </div>

      {renderSection({
        title: "Native token packs",
        subtitle: `Prices are paid in ${nativeSymbol} (18 decimals onchain).`,
        canEdit: isShipsOwner,
        tierIndices: shipsInfo.tiers,
        ships: nativeShips,
        setShips: setNativeShips,
        prices: nativeEth,
        setPrices: setNativeEth,
        priceLabel: nativeSymbol,
        contractAddress: shipsAddress,
        abi: CONTRACT_ABIS.SHIPS as Abi,
        transactionId: `set-native-purchase-info-${chainId}`,
        saveLabel: "[SAVE NATIVE PACKS]",
        built: nativeBuilt,
        txArgs: nativeTxArgs,
        isLoading: shipsInfo.isLoading,
        emptyMessage: "No native purchase tiers from Ships.getPurchaseInfo.",
        onAfterSuccess: () => {
          shipsInfo.refetch();
        },
      })}

      {purchaserDeployed ? (
        renderSection({
          title: "UTC packs",
          subtitle: "Prices are Universal Credits (18 decimals).",
          canEdit: isPurchaserOwner,
          tierIndices: utcInfo.tiers,
          ships: utcShips,
          setShips: setUtcShips,
          prices: utcTokens,
          setPrices: setUtcTokens,
          priceLabel: "UTC",
          contractAddress: purchaserAddress,
          abi: CONTRACT_ABIS.SHIP_PURCHASER as Abi,
          transactionId: `set-utc-purchase-info-${chainId}`,
          saveLabel: "[SAVE UTC PACKS]",
          built: utcBuilt,
          txArgs: utcTxArgs,
          isLoading: utcInfo.isLoading,
          emptyMessage:
            "No UTC purchase tiers from ShipPurchaser.getPurchaseInfo.",
          onAfterSuccess: () => {
            utcInfo.refetch();
          },
        })
      ) : (
        <div className="bg-gray-800 rounded-none p-4 border border-gray-600 text-gray-400 text-sm font-mono">
          ShipPurchaser is not deployed on this network. UTC pack pricing is
          unavailable.
        </div>
      )}
    </div>
  );
};

export default ShipPurchasePrices;
