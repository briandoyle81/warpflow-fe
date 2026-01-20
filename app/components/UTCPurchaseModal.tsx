"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { UTCPurchaseButton } from "./UTCPurchaseButton";
import {
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
  SHIP_PURCHASE_TIERS,
} from "../config/contracts";
import type { Abi } from "viem";
import { formatEther } from "viem";

interface UTCPurchaseModalProps {
  onClose: () => void;
}

const UTCPurchaseModal: React.FC<UTCPurchaseModalProps> = ({ onClose }) => {
  const { address } = useAccount();

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

  const handlePurchaseSuccess = () => {
    refetchUTCBalance();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-2 border-yellow-400 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400 font-mono tracking-wider">
            [PURCHASE UTC]
          </h2>
          <button
            onClick={onClose}
            className="text-yellow-400 hover:text-yellow-300 transition-all duration-200 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-yellow-400/10 border border-yellow-400/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-yellow-300 text-sm font-mono">
              Current UTC Balance:
            </p>
            <p className="text-yellow-400 text-sm font-mono font-bold">
              {utcBalance
                ? `${formatEther(utcBalance as bigint)} UTC`
                : "0.00 UTC"}
            </p>
          </div>
          <p className="text-yellow-300 text-xs font-mono mt-2">
            Purchase Universal Credits (UTC) using FLOW at a 1:1 rate (e.g., 4.99 FLOW → 4.99 UTC).
            UTC can be used to reserve games and purchase ships.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {SHIP_PURCHASE_TIERS.prices.map((flowCost, index) => {
            const flowCostFormatted = formatEther(flowCost);
            // Tiers are now 0-based (0-4), use index directly
            const tier = index;
            const colors = getTierColors(tier);
            const utcAmount = flowCostFormatted; // 1:1 FLOW → UTC

            return (
              <UTCPurchaseButton
                key={index}
                tier={tier} // contract expects 0-based tier (0-4)
                flowCost={flowCost}
                utcAmount={utcAmount}
                className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                refetch={refetchUTCBalance}
                onSuccess={handlePurchaseSuccess}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span>TIER {tier}</span>
                  <span>{parseFloat(flowCostFormatted).toFixed(2)} FLOW</span>
                  <span>{parseFloat(utcAmount).toFixed(2)} UTC</span>
                </div>
              </UTCPurchaseButton>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UTCPurchaseModal;
