"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTutorialContext } from "./OnboardingTutorial";

interface TutorialStepOverlayProps {
  // Called to close the tutorial and return to the Info tab.
  onQuit?: () => void;
}

export function TutorialStepOverlay({ onQuit }: TutorialStepOverlayProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const { isConnected } = useAccount();
  const {
    currentStepIndex,
    displayStepNumber,
    displayTotalSteps,
    isVisibleLastStep,
    currentStep,
    isStepComplete,
    nextStep,
    previousStep,
    resetTutorial,
  } = useTutorialContext();

  const step = currentStep;
  const canAdvance = !isVisibleLastStep && (debugEnabled || isStepComplete);
  const nextButtonDisabled = !isVisibleLastStep ? !canAdvance : false;
  const canClaimShips = debugEnabled || isStepComplete;

  if (!step) return null;

  return (
    <div className="max-w-2xl w-full bg-gray-900/95 border-2 border-cyan-400 rounded-none p-6 shadow-lg shadow-cyan-400/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300 font-mono mb-1">
              {step.title}
            </h2>
            <p className="text-sm text-gray-400">
              Step {displayStepNumber} of {displayTotalSteps}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => resetTutorial()}
              className="px-3 py-1 text-xs bg-yellow-700 text-yellow-200 rounded-none font-mono hover:bg-yellow-600 transition-colors cursor-pointer"
            >
              Reset Tutorial
            </button>
            {onQuit && (
              <button
                type="button"
                onClick={onQuit}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 transition-colors"
              >
                Quit Tutorial
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(displayStepNumber / displayTotalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4 text-cyan-200">
          {typeof step.instructions === "string" ? (
            <p>{step.instructions}</p>
          ) : (
            step.instructions
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => previousStep()}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 bg-gray-700 text-white rounded-none font-mono hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex-1 flex items-center justify-center">
            {/* Debug override: allow advancing without meeting step requirements */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={debugEnabled}
                onChange={(e) => setDebugEnabled(e.target.checked)}
              />
              <span className="text-sm font-mono text-gray-200">Debug</span>
            </label>
          </div>

          {!isVisibleLastStep && (
            <button
              type="button"
              onClick={() => nextStep()}
              disabled={nextButtonDisabled}
              className="px-4 py-2 bg-cyan-600 text-white rounded-none font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          )}

          {isVisibleLastStep && (
            <>
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({
                    openConnectModal,
                    authenticationStatus,
                    mounted,
                  }) => {
                    const ready =
                      mounted && authenticationStatus !== "loading";
                    if (!ready) return null;

                    return (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        disabled={false}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-none font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                      >
                        Log In
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    alert("Feature not implemented");
                  }}
                  disabled={!canClaimShips}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-none font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  Claim Ships
                </button>
              )}
            </>
          )}
        </div>
      </div>
  );
}
