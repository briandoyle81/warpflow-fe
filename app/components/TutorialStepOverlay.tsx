"use client";

import React from "react";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
import { useTutorialContext } from "./OnboardingTutorial";

interface TutorialStepOverlayProps {
  onSkip?: () => void;
}

export function TutorialStepOverlay({ onSkip }: TutorialStepOverlayProps) {
  const {
    currentStepIndex,
    currentStep,
    isStepComplete,
    nextStep,
    previousStep,
    resetTutorial,
  } = useTutorialContext();

  const step = currentStep;
  const totalSteps = TUTORIAL_STEPS.length;
  const canAdvance =
    currentStepIndex < totalSteps - 1 && isStepComplete;

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute top-4 left-4 right-4 max-w-2xl mx-auto pointer-events-auto z-10">
        <div className="bg-gray-900/95 border-2 border-cyan-400 rounded-none p-6 shadow-lg shadow-cyan-400/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300 font-mono mb-1">
                {step.title}
              </h2>
              <p className="text-sm text-gray-400">
                Step {currentStepIndex + 1} of {totalSteps}
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
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 transition-colors"
                >
                  Skip Tutorial
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => previousStep()}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 bg-gray-700 text-white rounded-none font-mono hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => nextStep()}
              disabled={!canAdvance}
              className="px-4 py-2 bg-cyan-600 text-white rounded-none font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {currentStepIndex === totalSteps - 1 ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
