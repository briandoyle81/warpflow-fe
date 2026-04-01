"use client";

import React, { useMemo } from "react";
import { useShipPurchasing } from "../hooks";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { ShipPurchaseButton } from "./ShipPurchaseButton";
import { ShipImage } from "./ShipImage";
import type { Ship } from "../types/types";

interface ShipPurchaseInterfaceProps {
  onClose: () => void;
  paymentMethod?: "FLOW" | "UTC";
  onPaymentMethodChange?: (method: "FLOW" | "UTC") => void;
}

const ShipPurchaseInterface: React.FC<ShipPurchaseInterfaceProps> = ({
  paymentMethod: externalPaymentMethod,
}) => {
  const { tiers, prices, maxPerTier } = useShipPurchasing();
  const { refetch } = useOwnedShips();
  const previewSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);

  // Use external payment method if provided, otherwise default to FLOW.
  const paymentMethod = externalPaymentMethod ?? "FLOW";
  const paymentMethodLabel = paymentMethod === "FLOW" ? "TOKENS" : "UTC";

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
    id: BigInt(900000 + seed),
    equipment: {
      mainWeapon: seed % 4,
      armor: (seed % 3) + 1,
      shields: 0,
      special: (seed + 1) % 4,
    },
    traits: {
      serialNumber: BigInt(900000 + seed),
      colors: {
        h1: (seed * 47) % 360,
        s1: 70,
        l1: 52,
        h2: (seed * 47 + 68) % 360,
        s2: 62,
        l2: 46,
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
      shiny: seed % 7 === 0,
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

  return (
    <div className="w-full">
      <header className="mb-6 border-b border-cyan-400/25 pb-5">
        <h3
          className="text-xl font-black uppercase tracking-[0.12em] text-cyan-300 sm:text-2xl"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          Expand your fleet
        </h3>
        <p
          className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          }}
        >
          Each pack mints a full roster at once. Larger packs stack more
          guaranteed veteran slots so your navy hits the field ready for combat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier: number, index: number) => {
          const price = prices[index];
          const shipsCount = maxPerTier[index];
          const priceFormatted = price
            ? (Number(price) / 1e18).toFixed(2)
            : "0.00";
          const colors = getTierColors(tier);
          const guaranteedRanks = getGuaranteedRanks(tier);
          const tierCallout = getTierCallout(tier);
          const badge = getTierBadge(tier);
          const previewShips = getPreviewShipsForTier(tier);

          return (
            <ShipPurchaseButton
              key={index}
              tier={tier}
              price={price || BigInt(0)}
              paymentMethod={paymentMethod}
              className={`relative min-h-[420px] px-4 py-3 border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              refetch={refetch}
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
                    <div className="opacity-75">PRICE</div>
                    <div className="font-bold">
                      {priceFormatted} {paymentMethodLabel}
                    </div>
                  </div>
                  <div className="border border-solid border-current/30 bg-black/20 px-2 py-1">
                    <div className="opacity-75">FLEET SIZE</div>
                    <div className="font-bold">{shipsCount} SHIPS</div>
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
                            <ShipImage ship={ship} showLoadingState={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] leading-tight opacity-90">
                  Guaranteed ranks: {guaranteedRanks.join(" + ")}
                </div>
              </div>
            </ShipPurchaseButton>
          );
        })}
      </div>
      <p
        className="mt-4 text-[11px] uppercase tracking-[0.08em] text-slate-400"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        {paymentMethod === "UTC"
          ? "Click to approve UTC. After approval, click to purchase."
          : "Click to purchase."}
      </p>
      <p
        className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-400"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        Preview ships are examples only. Final minted ships may differ in loadout
        and visuals.
      </p>
    </div>
  );
};

export default ShipPurchaseInterface;
