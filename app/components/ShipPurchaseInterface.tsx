import React, { useState } from "react";
import { useShipPurchasing } from "../hooks";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";

interface ShipPurchaseInterfaceProps {
  onClose: () => void;
}

const ShipPurchaseInterface: React.FC<ShipPurchaseInterfaceProps> = ({
  onClose,
}) => {
  const [selectedTier, setSelectedTier] = useState(0);

  const {
    tiers,
    prices,
    maxPerTier,
    flowBalance,
    canAfford,
    purchaseShips,
    isPending: isPurchasePending,
  } = useShipPurchasing();

  // Alias for better readability
  const shipsPerTier = maxPerTier;

  const {
    canClaimFreeShips,
    freeShipCount,
    claimFreeShips,
    isPending: isClaimPending,
  } = useFreeShipClaiming();

  const handlePurchase = () => {
    purchaseShips(selectedTier);
  };

  const handleClaim = () => {
    claimFreeShips();
  };

  const canAffordCurrent = canAfford(selectedTier, 1);

  // If eligible for free ships, show claiming interface instead
  if (canClaimFreeShips) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <h5 className="text-lg font-bold text-green-400 mb-2">
            🎁 FREE SHIP CLAIMING AVAILABLE!
          </h5>
          <p className="text-green-300">
            You&apos;re eligible for {freeShipCount.toString()} free ships
          </p>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={isClaimPending}
          className="px-8 py-4 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {isClaimPending
            ? "[CLAIMING...]"
            : `[CLAIM ${freeShipCount.toString()} FREE SHIPS]`}
        </button>

        <div className="mt-4 text-xs text-yellow-400/80">
          ⚠️ This is a one-time offer. Claim wisely!
        </div>
      </div>
    );
  }

  // Regular purchase interface
  return (
    <div className="space-y-6">
      {/* Market Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-cyan-400 bg-black/40 rounded-lg p-4 text-center">
          <h5 className="text-lg font-bold text-cyan-400 mb-2">
            💰 TIER {selectedTier} PRICE
          </h5>
          <p className="text-2xl font-bold">
            {prices[selectedTier]
              ? `${(Number(prices[selectedTier]) / 1e18).toFixed(2)} FLOW`
              : "Loading..."}
          </p>
        </div>
        <div className="border border-green-400 bg-black/40 rounded-lg p-4 text-center">
          <h5 className="text-lg font-bold text-green-400 mb-2">
            🎯 MAX PER TIER
          </h5>
          <p className="text-2xl font-bold">
            {maxPerTier[selectedTier]?.toString() || "Loading..."}
          </p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4 text-center">
          <h5 className="text-lg font-bold text-purple-400 mb-2">
            💎 YOUR FLOW BALANCE
          </h5>
          <p className="text-2xl font-bold">
            {flowBalance
              ? `${(Number(flowBalance.value) / 1e18).toFixed(2)} FLOW`
              : "Loading..."}
          </p>
        </div>
      </div>

      {/* Tier Selection */}
      <div className="flex items-center justify-center gap-4">
        <label className="text-sm font-bold text-cyan-400">SELECT TIER:</label>
        <select
          value={selectedTier}
          onChange={(e) => {
            setSelectedTier(parseInt(e.target.value));
          }}
          className="bg-black/60 border border-cyan-400 text-cyan-300 px-3 py-2 rounded font-mono text-sm"
        >
          {tiers.map((tier: number, index: number) => (
            <option key={index} value={index}>
              TIER {tier} ({shipsPerTier[index]} ships)
            </option>
          ))}
        </select>
      </div>

      {/* Purchase Controls */}
      <div className="space-y-4">
        {/* Cost and Affordability */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-4">
            <span className="text-sm opacity-80">Tier Cost:</span>
            <span className="text-lg font-bold text-amber-400">
              {prices[selectedTier]
                ? `${(Number(prices[selectedTier]) / 1e18).toFixed(2)} FLOW`
                : "Loading..."}
            </span>
          </div>
          <div className="flex justify-center items-center gap-4">
            <span className="text-sm opacity-80">Can Afford:</span>
            <span
              className={`text-sm font-bold ${
                canAffordCurrent ? "text-green-400" : "text-red-400"
              }`}
            >
              {canAffordCurrent ? "YES" : "NO"}
            </span>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isPurchasePending || !canAffordCurrent}
          className="w-full px-6 py-3 rounded-lg border-2 border-amber-400 text-amber-400 hover:border-amber-300 hover:text-amber-300 hover:bg-amber-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPurchasePending
            ? "[PURCHASING...]"
            : `[PURCHASE TIER ${selectedTier} SHIPS]`}
        </button>
      </div>

      {/* Quick Purchase Options */}
      <div className="space-y-4">
        <h5 className="text-lg font-bold text-amber-400 text-center">
          QUICK PURCHASE
        </h5>
        <div className="grid grid-cols-2 gap-3">
          {[1, 3, 5, 10].map((count) => (
            <button
              key={count}
              onClick={() => purchaseShips(selectedTier)}
              disabled={isPurchasePending || !canAfford(selectedTier, count)}
              className="px-4 py-3 rounded-lg border border-amber-400 text-amber-400 hover:border-amber-300 hover:text-amber-300 hover:bg-amber-400/10 font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="font-bold">{count}</div>
                <div className="text-xs opacity-80">
                  {prices[selectedTier]
                    ? `${(
                        Number(prices[selectedTier] * BigInt(count)) / 1e18
                      ).toFixed(2)} FLOW`
                    : "FLOW"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShipPurchaseInterface;
