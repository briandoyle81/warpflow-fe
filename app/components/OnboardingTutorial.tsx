"use client";

import React, { createContext, useContext } from "react";
import { useOnboardingTutorial } from "../hooks/useOnboardingTutorial";
import { TutorialContextValue } from "../types/onboarding";
import { SimulatedTransactionDialog } from "./SimulatedTransactionDialog";
import { SimulatedGameDisplay } from "./SimulatedGameDisplay";

// Create context for tutorial
const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error(
      "useTutorialContext must be used within OnboardingTutorial",
    );
  }
  return context;
}

interface OnboardingTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTutorial({
  onComplete,
  onSkip,
}: OnboardingTutorialProps) {
  const tutorialContext = useOnboardingTutorial();

  const {
    currentStep,
    isTransactionDialogOpen,
    pendingAction,
    approveTransaction,
    rejectTransaction,
  } = tutorialContext;

  const handleSkip = () => {
    // Clear saved step index when quitting the tutorial.
    if (typeof window !== "undefined") {
      localStorage.removeItem("void-tactics-tutorial-step-index");
    }
    onSkip?.();
  };

  return (
    <TutorialContext.Provider value={tutorialContext}>
      <div className="relative w-full h-full min-h-screen">
        {!currentStep ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-cyan-300 font-mono">Loading tutorial...</div>
          </div>
        ) : (
          <>
            <SimulatedGameDisplay
              tutorialContext={tutorialContext}
              onBack={handleSkip}
            />

            <SimulatedTransactionDialog
              isOpen={isTransactionDialogOpen}
              action={pendingAction}
              onApprove={approveTransaction}
              onReject={rejectTransaction}
            />
          </>
        )}
      </div>
    </TutorialContext.Provider>
  );
}
