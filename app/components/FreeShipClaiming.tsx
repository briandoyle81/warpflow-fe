"use client";

import React from "react";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useAccount } from "wagmi";

const FreeShipClaiming: React.FC = () => {
  const { address } = useAccount();
  const {
    isEligible,
    hasClaimed,
    isLoadingClaimStatus,
    claimFreeShips,
    isPending,
  } = useFreeShipClaiming();

  if (!address) {
    return null; // Don't show if not connected
  }

  if (hasClaimed) {
    return null; // Don't show if already claimed
  }

  if (!isEligible) {
    return null; // Don't show if not eligible
  }

  const handleClaim = () => {
    claimFreeShips();
  };

  return (
    <div className="bg-gradient-to-r from-green-400/20 to-blue-400/20 border-2 border-green-400 rounded-lg p-6 mb-8 animate-pulse">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-green-400 mb-4 tracking-wider">
          🎁 FREE SHIP CLAIMING!
        </h3>

        <div className="mb-6">
          <p className="text-lg text-green-300 mb-2">
            Claim your free ships and expand your navy!
          </p>
          <p className="text-sm text-green-400/80">
            You&apos;re eligible for free ships
          </p>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={isPending || isLoadingClaimStatus}
          className="px-8 py-4 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {isPending ? "[CLAIMING...]" : "[CLAIM FREE SHIPS]"}
        </button>

        {/* Loading States */}
        {isLoadingClaimStatus && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
            <span className="ml-3 text-green-400">Checking eligibility...</span>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-black/40 border border-green-400/30 rounded-lg">
          <h4 className="text-lg font-bold text-green-400 mb-2">
            ✨ WHAT YOU GET:
          </h4>
          <ul className="text-sm text-green-300 space-y-1 text-left max-w-md mx-auto">
            <li>• Ships generated on-chain</li>
            <li>• Unique stats and equipment combinations</li>
            <li>• Ships start unconstructed (need to be built)</li>
            <li>• Great way to expand your navy</li>
            <li>• One-time claim per wallet address</li>
          </ul>
        </div>

        {/* Warning */}
        <div className="mt-4 text-xs text-yellow-400/80">
          ⚠️ This is a one-time offer. Claim wisely!
        </div>
      </div>
    </div>
  );
};

export default FreeShipClaiming;
