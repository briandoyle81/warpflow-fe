"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { UTCPurchaseButton } from "./UTCPurchaseButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { getNativeTokenSymbol, getSelectedChainId } from "../config/networks";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import type { Abi } from "viem";
import { formatEther } from "viem";

interface UTCPurchaseModalProps {
  onClose: () => void;
}

const UTCPurchaseModal: React.FC<UTCPurchaseModalProps> = ({ onClose }) => {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const nativeTokenSymbol = getNativeTokenSymbol(activeChainId);

  const {
    tiers,
    pricesWei,
    tierCount,
    isLoading: isLoadingTiers,
    purchaserDeployed,
  } = useShipPurchaserPurchaseInfo();

  const { data: utcBalance, refetch: refetchUTCBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

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

        <div className="mb-5 p-4 bg-cyan-400/10 border border-cyan-400/40 rounded-none">
          <div className="flex justify-between items-center mb-2">
            <p className="text-cyan-200 text-sm font-mono">Current UTC balance</p>
            <p className="text-cyan-300 text-sm font-mono font-bold">
              {utcBalance
                ? `${formatEther(utcBalance as bigint)} UTC`
                : "0.00 UTC"}
            </p>
          </div>
          <p className="text-cyan-100/85 text-xs font-mono leading-relaxed">
            Universal Credits (UTC) are the in-game balance token. Buy UTC with
            TOKENS at a 1:1 rate, then spend UTC when you reserve games or
            check out ship packs elsewhere. This purchase only adds UTC to your
            wallet.
          </p>
        </div>

        <header className="mb-5 border-b border-cyan-400/25 pb-4">
          <h3
            className="text-lg font-black uppercase tracking-[0.1em] text-cyan-300 sm:text-xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            Choose an amount
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300 font-mono">
            Each option is a fixed {nativeTokenSymbol} payment. You receive the
            same amount in UTC. Larger options are for convenience only, not a
            different product.
          </p>
        </header>

        {!purchaserDeployed ? (
          <p className="text-center text-red-400 font-mono py-6">
            ShipPurchaser is not deployed on this network.
          </p>
        ) : isLoadingTiers && tierCount === 0 ? (
          <p className="text-center text-gray-400 font-mono py-6">
            Loading UTC purchase options…
          </p>
        ) : tierCount === 0 ? (
          <p className="text-center text-red-400 font-mono py-6">
            No UTC purchase tiers from ShipPurchaser.
          </p>
        ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => {
            const flowCost = pricesWei[index] ?? 0n;
            const flowCostFormatted = formatEther(flowCost);
            const colors = getTierColors(tier);
            const utcDisplay = flowCostFormatted;

            return (
              <UTCPurchaseButton
                key={index}
                tier={tier}
                flowCost={flowCost}
                utcAmount={flowCostFormatted}
                className={`relative min-h-0 px-4 py-4 rounded-none border-2 ${colors.border} ${colors.text} ${colors.hoverBorder} ${colors.hoverText} ${colors.hoverBg} font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                refetch={refetchUTCBalance}
                onSuccess={handlePurchaseSuccess}
              >
                <div className="flex flex-col gap-3">
                  <div className="text-base font-extrabold leading-tight">
                    {utcDisplay} UTC
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
                      <div className="opacity-75 text-[10px] uppercase tracking-wide">
                        You pay
                      </div>
                      <div className="font-bold">
                        {flowCostFormatted} {nativeTokenSymbol}
                      </div>
                    </div>
                    <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
                      <div className="opacity-75 text-[10px] uppercase tracking-wide">
                        You receive
                      </div>
                      <div className="font-bold">{utcDisplay} UTC</div>
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.08em] opacity-80">
                    [Click to buy with {nativeTokenSymbol}]
                  </div>
                </div>
              </UTCPurchaseButton>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

export default UTCPurchaseModal;
