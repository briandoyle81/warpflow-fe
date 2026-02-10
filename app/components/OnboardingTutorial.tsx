"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useOnboardingTutorial } from "../hooks/useOnboardingTutorial";
import { TutorialContextValue } from "../types/onboarding";
import { TutorialStepOverlay } from "./TutorialStepOverlay";
import { SimulatedTransactionDialog } from "./SimulatedTransactionDialog";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
import { SimulatedGameDisplay } from "./SimulatedGameDisplay";

// Create context for tutorial
const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorialContext must be used within OnboardingTutorial");
  }
  return context;
}

interface OnboardingTutorialProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const tutorialContext = useOnboardingTutorial();

  const {
    currentStep,
    currentStepIndex,
    isTransactionDialogOpen,
    pendingAction,
    approveTransaction,
    rejectTransaction,
  } = tutorialContext;

  // Handle completion
  useEffect(() => {
    if (currentStepIndex === TUTORIAL_STEPS.length - 1 && currentStep?.id === "completion") {
      // Tutorial is complete
      const completionTimer = setTimeout(() => {
        // Store completion in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("warpflow-tutorial-completed", "true");
          // Clear the step index since tutorial is complete
          localStorage.removeItem("warpflow-tutorial-step-index");
        }
        onComplete?.();
      }, 5000); // Wait 5 seconds on completion screen

      return () => clearTimeout(completionTimer);
    }
  }, [currentStepIndex, currentStep, onComplete]);

  const handleSkip = () => {
    if (window.confirm("Are you sure you want to skip the tutorial? You can always access it again from the Info tab.")) {
      // Clear saved step index when skipping
      if (typeof window !== "undefined") {
        localStorage.removeItem("warpflow-tutorial-step-index");
      }
      onSkip?.();
    }
  };

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-cyan-300 font-mono">Loading tutorial...</div>
      </div>
    );
  }

  return (
    <TutorialContext.Provider value={tutorialContext}>
      <div className="relative w-full h-full min-h-screen">
        <SimulatedGameDisplay tutorialContext={tutorialContext} />

        <TutorialStepOverlay onSkip={handleSkip} />

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
