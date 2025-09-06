import React from "react";
import { useShipPurchasing } from "../hooks";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { ShipPurchaseButton } from "./ShipPurchaseButton";

interface ShipPurchaseInterfaceProps {
  onClose: () => void;
}

const ShipPurchaseInterface: React.FC<ShipPurchaseInterfaceProps> = () => {
  const { tiers, prices, maxPerTier } = useShipPurchasing();
  const { refetch } = useOwnedShips();

  // Get color classes based on tier
  const getTierColors = (tier: number) => {
    switch (tier) {
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

  // Simple tier-based purchase interface
  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((tier: number, index: number) => {
        const price = prices[index];
        const shipsCount = maxPerTier[index];
        const priceInFlow = price ? (Number(price) / 1e18).toFixed(2) : "0.00";
        const colors = getTierColors(tier);

        return (
          <ShipPurchaseButton
            key={index}
            tier={tier}
            price={price || BigInt(0)}
            className={`flex-1 min-w-[200px] px-4 py-2 rounded-lg border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            onSuccess={() => {
              // Refetch ships data after successful purchase
              setTimeout(() => refetch(), 2000);
            }}
          >
            <div className="flex flex-col items-center space-y-1">
              <span>TIER {tier}</span>
              <span>{priceInFlow} FLOW</span>
              <span>{shipsCount} SHIPS</span>
            </div>
          </ShipPurchaseButton>
        );
      })}
    </div>
  );
};

export default ShipPurchaseInterface;
