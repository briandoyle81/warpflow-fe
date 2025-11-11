"use client";

import React from "react";
import { TutorialStep } from "../types/onboarding";

interface TutorialStepOverlayProps {
  step: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

export function TutorialStepOverlay({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
}: TutorialStepOverlayProps) {
  return (
    <div className="fixed inset-0 z-[150] pointer-events-none">
      {/* Instruction Panel */}
      <div className="absolute top-4 left-4 right-4 max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-gray-900/95 border-2 border-cyan-400 rounded-lg p-6 shadow-lg shadow-cyan-400/20">
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
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded font-mono hover:bg-gray-600 transition-colors"
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
              onClick={onPrevious}
              disabled={currentStepIndex === 0}
              className="px-4 py-2 bg-gray-700 text-white rounded font-mono hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={onNext}
              disabled={currentStepIndex === totalSteps - 1}
              className="px-4 py-2 bg-cyan-600 text-white rounded font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {currentStepIndex === totalSteps - 1 ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
