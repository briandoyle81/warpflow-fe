"use client";

import React, { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { UTCPurchaseButton } from "./UTCPurchaseButton";
import { ShipImage } from "./ShipImage";
import {
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
  SHIP_PURCHASE_TIERS,
} from "../config/contracts";
import type { Ship } from "../types/types";
import type { Abi } from "viem";
import { formatEther } from "viem";

interface UTCPurchaseModalProps {
  onClose: () => void;
}

const UTCPurchaseModal: React.FC<UTCPurchaseModalProps> = ({ onClose }) => {
  const { address } = useAccount();
  const previewSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);

  // Read UTC balance to show current balance
  const { data: utcBalance, refetch: refetchUTCBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get color classes based on tier (0-based: 0-4)
  const getTierColors = (tier: number) => {
    switch (tier) {
      case 0:
        return {
          border: "border-amber-400",
          text: "text-amber-400",
          hoverBorder: "hover:border-amber-300",
          hoverText: "hover:text-amber-300",
          hoverBg: "hover:bg-amber-400/10",
        };
      case 1:
        return {
          border: "border-gray-400",
          text: "text-gray-400",
          hoverBorder: "hover:border-gray-300",
          hoverText: "hover:text-gray-300",
          hoverBg: "hover:bg-gray-400/10",
        };
      case 2:
        return {
          border: "border-green-400",
          text: "text-green-400",
          hoverBorder: "hover:border-green-300",
          hoverText: "hover:text-green-300",
          hoverBg: "hover:bg-green-400/10",
        };
      case 3:
        return {
          border: "border-blue-400",
          text: "text-blue-400",
          hoverBorder: "hover:border-blue-300",
          hoverText: "hover:text-blue-300",
          hoverBg: "hover:bg-blue-400/10",
        };
      case 4:
        return {
          border: "border-purple-400",
          text: "text-purple-400",
          hoverBorder: "hover:border-purple-300",
          hoverText: "hover:text-purple-300",
          hoverBg: "hover:bg-purple-400/10",
        };
      default:
        return {
          border: "border-amber-400",
          text: "text-amber-400",
          hoverBorder: "hover:border-amber-300",
          hoverText: "hover:text-amber-300",
          hoverBg: "hover:bg-amber-400/10",
        };
    }
  };

  const getGuaranteedRanks = (tier: number): string[] => {
    switch (tier) {
      case 0:
        return ["R1"];
      case 1:
        return ["R2", "R1"];
      case 2:
        return ["R3", "R2", "R1"];
      case 3:
        return ["R4", "R3", "R2", "R1"];
      case 4:
        return ["R5", "R4", "R3", "R2", "R1"];
      default:
        return ["R1"];
    }
  };

  const getTierCallout = (tier: number): string => {
    switch (tier) {
      case 4:
        return "FLAGSHIP PACK";
      case 3:
        return "VETERAN CORE";
      case 2:
        return "BALANCED VALUE";
      case 1:
        return "STARTER BOOST";
      default:
        return "ENTRY PACK";
    }
  };

  const getTierBadge = (tier: number): string | null => {
    if (tier === 4) return "BEST VALUE";
    if (tier === 3) return "MOST POPULAR";
    return null;
  };

  const createPreviewShip = (seed: number, shipsDestroyed: number): Ship => ({
    name: `Preview ${seed}`,
    id: BigInt(910000 + seed),
    equipment: {
      mainWeapon: seed % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: (seed + 1) % 4,
    },
    traits: {
      serialNumber: BigInt(910000 + seed),
      colors: {
        h1: (seed * 53) % 360,
        s1: 68,
        l1: 50,
        h2: (seed * 53 + 84) % 360,
        s2: 60,
        l2: 44,
      },
      variant: 1,
      accuracy: seed % 3,
      hull: (seed + 1) % 3,
      speed: (seed + 2) % 3,
    },
    shipData: {
      shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny: seed % 8 === 0,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0n,
    },
    owner: "0x0000000000000000000000000000000000000000",
  });

  const shipsDestroyedForRank = (rank: number): number => {
    switch (rank) {
      case 5:
        return 350;
      case 4:
        return 120;
      case 3:
        return 45;
      case 2:
        return 15;
      default:
        return 5;
    }
  };

  const getPreviewShipsForTier = (tier: number): Ship[] => {
    const base = previewSeed + tier * 20 + 1;
    const rankStacks: Record<number, number[]> = {
      0: [1],
      1: [2, 1],
      2: [3, 2, 1],
      3: [4, 3, 2, 1],
      4: [5, 4, 3, 2, 1],
    };
    const ranks = rankStacks[tier] ?? [1];
    return ranks.map((rank, idx) =>
      createPreviewShip(base + idx, shipsDestroyedForRank(rank))
    );
  };

  const handlePurchaseSuccess = () => {
    refetchUTCBalance();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-2 border-cyan-400 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-none">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-300 font-mono tracking-wider">
            [PURCHASE UTC]
          </h2>
          <button
            onClick={onClose}
            className="text-cyan-300 hover:text-cyan-200 transition-all duration-200 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-cyan-400/10 border border-cyan-400/40 rounded-none">
          <div className="flex justify-between items-center mb-2">
            <p className="text-cyan-200 text-sm font-mono">
              Current UTC Balance:
            </p>
            <p className="text-cyan-300 text-sm font-mono font-bold">
              {utcBalance
                ? `${formatEther(utcBalance as bigint)} UTC`
                : "0.00 UTC"}
            </p>
          </div>
          <p className="text-cyan-100/85 text-xs font-mono mt-2">
            Purchase Universal Credits (UTC) using FLOW at a 1:1 rate (e.g., 4.99 FLOW → 4.99 UTC).
            UTC can be used to reserve games and purchase ships.
          </p>
        </div>

        <header className="mb-5 border-b border-cyan-400/25 pb-4">
          <h3
            className="text-lg font-black uppercase tracking-[0.1em] text-cyan-300 sm:text-xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            Top up for fleet purchases
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300 font-mono">
            Each bundle matches a fleet pack size. Bigger bundles fund larger rosters with more guaranteed veteran slots.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SHIP_PURCHASE_TIERS.prices.map((flowCost, index) => {
            const flowCostFormatted = formatEther(flowCost);
            const tier = index;
            const colors = getTierColors(tier);
            const utcAmount = flowCostFormatted;
            const shipsCount = SHIP_PURCHASE_TIERS.shipsPerTier[tier] ?? 0;
            const guaranteedRanks = getGuaranteedRanks(tier);
            const tierCallout = getTierCallout(tier);
            const badge = getTierBadge(tier);
            const previewShips = getPreviewShipsForTier(tier);

            return (
              <UTCPurchaseButton
                key={index}
                tier={tier}
                flowCost={flowCost}
                utcAmount={utcAmount}
                className={`relative min-h-[420px] px-4 py-3 rounded-none border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                refetch={refetchUTCBalance}
                onSuccess={handlePurchaseSuccess}
              >
                <div className="flex h-full flex-col gap-2 text-left">
                  {badge && (
                    <div className="absolute right-2 top-2 border border-solid border-cyan-300 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-cyan-300">
                      {badge}
                    </div>
                  )}
                  <div className="pr-20">
                    <div className="text-lg font-extrabold leading-tight">
                      {tierCallout}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
                      <div className="opacity-75">FLOW COST</div>
                      <div className="font-bold">
                        {parseFloat(flowCostFormatted).toFixed(2)} FLOW
                      </div>
                    </div>
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
                      <div className="opacity-75">UTC RECEIVED</div>
                      <div className="font-bold">
                        {parseFloat(utcAmount).toFixed(2)} UTC
                      </div>
                    </div>
                  </div>

                  <div className="border border-solid border-current/35 bg-black/20 p-2">
                    <div className="mb-1 text-[10px] opacity-75">
                      Pack preview
                    </div>
                    {tier === 0 ? (
                      <div className="flex justify-center">
                        <div className="h-64 w-64 shrink-0">
                          <ShipImage
                            ship={previewShips[0]}
                            showLoadingState={false}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end justify-center gap-2">
                        <div className="h-64 w-64 shrink-0">
                          <ShipImage
                            ship={previewShips[0]}
                            showLoadingState={false}
                          />
                        </div>
                        <div className="flex shrink-0 flex-col items-start justify-end gap-0.5 pb-0.5">
                          {previewShips.slice(1).map((ship) => (
                            <div
                              key={ship.id.toString()}
                              className="h-16 w-16 shrink-0"
                            >
                              <ShipImage
                                ship={ship}
                                showLoadingState={false}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] leading-tight opacity-90">
                    Covers a {shipsCount}-ship fleet purchase at checkout.
                  </div>
                  <div className="text-[11px] leading-tight opacity-90">
                    Guaranteed ranks when you buy that fleet:{" "}
                    {guaranteedRanks.join(" + ")}
                  </div>
                </div>
              </UTCPurchaseButton>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.08em] text-slate-400 font-mono">
          Preview ships are examples only. Final minted ships may differ in
          loadout and visuals.
        </p>
      </div>
    </div>
  );
};

export default UTCPurchaseModal;
