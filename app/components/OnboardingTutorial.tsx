"use client";

import React, { createContext, useContext } from "react";
import { useOnboardingTutorial } from "../hooks/useOnboardingTutorial";
import {
  TutorialContextValue,
  TUTORIAL_STEP_STORAGE_KEY,
  getTutorialAnalyticsRewardPath,
} from "../types/onboarding";
import { SimulatedTransactionDialog } from "./SimulatedTransactionDialog";
import { SimulatedGameDisplay } from "./SimulatedGameDisplay";
import posthog from "posthog-js";

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
    displayStepNumber,
    rescueCompletionBranch,
    isTransactionDialogOpen,
    pendingAction,
    approveTransaction,
    rejectTransaction,
  } = tutorialContext;

  const handleSkip = () => {
    const stepId = currentStep?.id ?? "unknown";
    const rewardPath = getTutorialAnalyticsRewardPath(
      stepId,
      rescueCompletionBranch,
    );
    posthog.capture("tutorial_abandoned", {
      step_id: stepId,
      step_index: currentStepIndex,
      display_step_number: displayStepNumber,
      rescue_branch: rescueCompletionBranch,
      reward_path: rewardPath,
    });
    // Clear saved step index when quitting the tutorial.
    if (typeof window !== "undefined") {
      localStorage.removeItem(TUTORIAL_STEP_STORAGE_KEY);
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
