"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useOnboardingTutorial } from "../hooks/useOnboardingTutorial";
import { TutorialContextValue } from "../types/onboarding";
import { SimulatedTransactionDialog } from "./SimulatedTransactionDialog";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
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
    currentStepIndex,
    isStepHydrated,
    isTransactionDialogOpen,
    pendingAction,
    approveTransaction,
    rejectTransaction,
  } = tutorialContext;

  // Handle completion
  useEffect(() => {
    if (
      currentStepIndex === TUTORIAL_STEPS.length - 1 &&
      currentStep?.id === "completion"
    ) {
      // Tutorial is complete
      const completionTimer = setTimeout(() => {
        // Store completion in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("void-tactics-tutorial-completed", "true");
          // Clear the step index since tutorial is complete
          localStorage.removeItem("void-tactics-tutorial-step-index");
        }
        onComplete?.();
      }, 5000); // Wait 5 seconds on completion screen

      return () => clearTimeout(completionTimer);
    }
  }, [currentStepIndex, currentStep, onComplete]);

  const handleSkip = () => {
    // Clear saved step index when quitting the tutorial.
    if (typeof window !== "undefined") {
      localStorage.removeItem("void-tactics-tutorial-step-index");
    }
    onSkip?.();
  };

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-300 font-mono">Loading tutorial...</div>
      </div>
    );
  }

  // Avoid rendering the board for a new step until its state has been
  // fully hydrated from either a cached snapshot or the scripted setup,
  // so we don't momentarily show the previous step's positions.
  if (!isStepHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-300 font-mono">Preparing tutorial step...</div>
      </div>
    );
  }

  return (
    <TutorialContext.Provider value={tutorialContext}>
      <div className="relative w-full h-full min-h-screen">
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
      </div>
    </TutorialContext.Provider>
  );
}
