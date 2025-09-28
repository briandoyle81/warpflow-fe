"use client";

import React, { useState } from "react";
import { TransactionButton } from "./TransactionButton";
import { gameContractConfig } from "../hooks/useGameContract";
import { toast } from "react-hot-toast";

interface FleeSafetySwitchProps {
  gameId: bigint;
  onFlee?: () => void;
}

export function FleeSafetySwitch({ gameId, onFlee }: FleeSafetySwitchProps) {
  const [isLeverOpen, setIsLeverOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLeverToggle = () => {
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
    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-lg border border-red-600">
      {/* Safety Lever */}
      <div className="flex flex-col items-center space-y-1">
        <button
          onClick={handleLeverToggle}
          className={`w-12 h-6 rounded-full border-2 transition-all duration-300 ${
            isLeverOpen
              ? "bg-red-600 border-red-400 shadow-lg shadow-red-600/50"
              : "bg-gray-700 border-gray-500 hover:border-gray-400"
          }`}
          title={isLeverOpen ? "Close safety lever" : "Open safety lever"}
        >
          <div
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isLeverOpen
                ? "bg-red-200 translate-x-6"
                : "bg-gray-400 translate-x-1"
            }`}
          />
        </button>
        <div className="text-xs text-gray-500 font-mono">
          {isLeverOpen ? "UNLOCKED" : "LOCKED"}
        </div>
      </div>

      {/* Flee Button - Always visible but disabled when lever is locked */}
      <button
        onClick={isLeverOpen ? handleFleeClick : undefined}
        disabled={!isLeverOpen}
        className={`px-4 py-2 font-mono font-bold rounded border-2 transition-all duration-200 ${
          isLeverOpen
            ? "bg-red-700 hover:bg-red-600 text-white border-red-500 hover:shadow-lg hover:shadow-red-600/50 cursor-pointer"
            : "bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed"
        }`}
      >
        FLEE BATTLE
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md mx-4">
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
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-mono rounded border border-gray-500 transition-colors"
              >
                CANCEL
              </button>

              <TransactionButton
                transactionId={`flee-game-${gameId}`}
                contractAddress={gameContractConfig.address}
                abi={gameContractConfig.abi}
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
                className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-mono font-bold rounded border border-red-500 transition-colors"
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
