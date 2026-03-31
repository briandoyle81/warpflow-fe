"use client";

import React, { useState } from "react";
import { TransactionButton } from "./TransactionButton";
import { useGameContract } from "../hooks/useGameContract";
import { toast } from "react-hot-toast";

interface FleeSafetySwitchProps {
  gameId: bigint;
  onFlee?: () => void;
  /** When true, lever cannot be toggled (e.g. tutorial). */
  locked?: boolean;
}

export function FleeSafetySwitch({
  gameId,
  onFlee,
  locked = false,
}: FleeSafetySwitchProps) {
  const gameContract = useGameContract();
  const [isLeverOpen, setIsLeverOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLeverToggle = () => {
    if (locked) return;
    setIsLeverOpen(!isLeverOpen);
    if (!isLeverOpen) {
      // Lever opened, show flee button
    } else {
      // Lever closed, hide flee button
      setShowConfirmModal(false);
    }
  };

  const handleFleeClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmFlee = () => {
    setShowConfirmModal(false);
    setIsLeverOpen(false);
    onFlee?.();
  };

  const handleCancelFlee = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="box-border flex h-full min-h-0 w-full min-w-0 items-stretch gap-3 border-2 border-solid border-red-600 bg-gray-900 px-4 py-2">
      <div className="flex min-h-0 min-w-0 shrink-0 flex-col items-center justify-between self-stretch leading-none">
        <button
          type="button"
          onClick={handleLeverToggle}
          disabled={locked}
          className={`relative flex h-5 w-10 shrink-0 items-center overflow-hidden rounded-none border-2 transition-all duration-300 ${
            locked
              ? "cursor-not-allowed border-gray-500 bg-gray-700 opacity-80"
              : isLeverOpen
                ? "border-red-400 bg-red-600 shadow-lg shadow-red-600/50"
                : "border-gray-500 bg-gray-700 hover:border-gray-400"
          }`}
          title={
            locked
              ? "Flee is disabled in tutorial"
              : isLeverOpen
                ? "Close safety lever"
                : "Open safety lever"
          }
        >
          <div
            className={`h-3 w-3 rounded-none-full transition-all duration-300 ${
              isLeverOpen
                ? "translate-x-5 bg-red-200"
                : "translate-x-0.5 bg-gray-400"
            }`}
          />
        </button>
        <span className="text-[9px] font-mono uppercase tracking-tight text-gray-500">
          {isLeverOpen ? "UNLOCKED" : "LOCKED"}
        </span>
      </div>

      <button
        type="button"
        onClick={isLeverOpen ? handleFleeClick : undefined}
        disabled={!isLeverOpen}
        className={`min-h-0 shrink-0 px-3 py-2 text-xs font-mono font-bold uppercase leading-none tracking-wider rounded-none border-2 border-solid transition-all duration-200 ${
          isLeverOpen
            ? "cursor-pointer border-red-500 bg-red-700 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/50"
            : "cursor-not-allowed border-gray-500 bg-gray-600 text-gray-400"
        }`}
      >
        FLEE BATTLE
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-600 rounded-none-lg p-6 max-w-md mx-4">
            <h2 className="text-red-400 font-mono text-xl font-bold mb-4 text-center">
              CONFIRM FLEE
            </h2>
            <p className="text-gray-300 font-mono text-sm mb-6 text-center">
              Are you sure you want to flee the battle? This action cannot be
              undone and will result in your defeat.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={handleCancelFlee}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-mono rounded-none border border-gray-500 transition-colors"
              >
                CANCEL
              </button>

              <TransactionButton
                transactionId={`flee-game-${gameId}`}
                contractAddress={gameContract.address}
                abi={gameContract.abi}
                functionName="flee"
                args={[gameId]}
                onSuccess={() => {
                  toast.success("Successfully fled the battle!");
                  handleConfirmFlee();
                }}
                onError={(error) => {
                  console.error("Error fleeing battle:", error);
                  const errorMessage = error.message || String(error);
                  if (
                    errorMessage.includes("User rejected") ||
                    errorMessage.includes("User denied")
                  ) {
                    toast.error("Transaction declined by user");
                  } else {
                    toast.error("Failed to flee battle: " + errorMessage);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-mono font-bold rounded-none border border-red-500 transition-colors"
                loadingText="FLEEING..."
                errorText="ERROR"
              >
                CONFIRM FLEE
              </TransactionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
