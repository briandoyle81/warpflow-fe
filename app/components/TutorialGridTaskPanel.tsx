"use client";

import React, { useState, type ReactNode } from "react";

export interface TutorialGridTaskPanelProps {
  /** Step title shown in the panel header */
  title: string;
  /** Narrative or tactical context (string with \\n paragraphs, or rich JSX) */
  brief: string | ReactNode;
  /** Numbered tasks (omit or pass [] to hide the section); strings or rich JSX per item */
  tasks?: ReactNode[];
  /** Label above the numbered list (default "Orders") */
  tasksSectionLabel?: string;
  displayStepNumber: number;
  displayTotalSteps: number;
  currentStepIndex: number;
  isVisibleLastStep: boolean;
  isStepComplete: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onQuit?: () => void;
  /** Optional conversion-style CTA (full-width button below supporting copy). */
  primaryCta?: {
    eyebrow: string;
    headline: string;
    supporting: ReactNode;
    buttonLabel: string;
    onClick: () => void;
  };
  /**
   * Panel height as a fraction of the grid (default 4 → ~4/11 of board height).
   * When `panelFitToContent` is false, this sets a fixed panel height.
   * When true, this is only a max-height cap; the panel grows with content.
   */
  panelBottomRowExclusive?: number;
  /** If true, height follows content up to the max implied by `panelBottomRowExclusive`. */
  panelFitToContent?: boolean;
}

const mono = {
  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
} as const;

/** Grid row count (must match SimulatedGameDisplay / GameGrid board rows). */
const GRID_ROW_COUNT = 11;
/** Default: panel bottom aligns with the bottom of row index 3 (fourth row). */
const DEFAULT_PANEL_BOTTOM_ROW_EXCLUSIVE = 4;

/**
 * In-grid tutorial panel (top-right over the map): narrative plus optional numbered
 * orders, same chrome (progress, nav; reset and quit in header).
 */
export function TutorialGridTaskPanel({
  title,
  brief,
  tasks,
  tasksSectionLabel = "Orders",
  displayStepNumber,
  displayTotalSteps,
  currentStepIndex,
  isVisibleLastStep,
  isStepComplete,
  onNext,
  onPrevious,
  onReset,
  onQuit,
  primaryCta,
  panelBottomRowExclusive: panelBottomRowExclusiveProp,
  panelFitToContent = false,
}: TutorialGridTaskPanelProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);

  const panelBottomRowExclusive = Math.min(
    GRID_ROW_COUNT,
    Math.max(
      1,
      panelBottomRowExclusiveProp ?? DEFAULT_PANEL_BOTTOM_ROW_EXCLUSIVE,
    ),
  );

  const maxHeightFromGrid = `calc(100% * ${panelBottomRowExclusive} / ${GRID_ROW_COUNT} - 0.5rem)`;

  const canAdvance = !isVisibleLastStep && (debugEnabled || isStepComplete);
  const nextDisabled = !isVisibleLastStep ? !canAdvance : false;

  return (
    <div
      className={`pointer-events-auto absolute top-2 right-2 z-[190] flex w-[min(94%,23rem)] flex-col border-2 border-cyan-400/90 p-3 shadow-lg shadow-cyan-500/15 ${
        panelFitToContent
          ? "overflow-y-auto overflow-x-hidden"
          : "overflow-hidden"
      }`}
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        borderRadius: 0,
        ...(panelFitToContent
          ? {
              maxHeight: maxHeightFromGrid,
              height: "auto",
            }
          : {
              height: maxHeightFromGrid,
            }),
      }}
      role="region"
      aria-label={`Tutorial briefing, step ${displayStepNumber} of ${displayTotalSteps}`}
    >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="text-base font-bold uppercase tracking-wide text-cyan-300 leading-tight"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            {title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            className="px-2 py-0.5 text-[10px] bg-yellow-800/90 text-yellow-100 rounded-none font-mono hover:bg-yellow-700 whitespace-nowrap"
          >
            Reset
          </button>
          {onQuit && (
            <button
              type="button"
              onClick={onQuit}
              className="px-2 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 whitespace-nowrap"
            >
              Quit
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 h-1 w-full shrink-0 bg-gray-700">
        <div
          className="h-1 bg-cyan-400 transition-all duration-300"
          style={{
            width: `${(displayStepNumber / displayTotalSteps) * 100}%`,
          }}
        />
      </div>

      <div
        className={
          panelFitToContent
            ? "space-y-2 overflow-x-hidden pr-0.5"
            : "min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5"
        }
      >
        {typeof brief === "string" ? (
          <p
            className="text-[11px] sm:text-xs leading-relaxed text-gray-200 whitespace-pre-line"
            style={mono}
          >
            {brief}
          </p>
        ) : (
          <div
            className="space-y-2 text-[11px] sm:text-xs leading-relaxed text-gray-200"
            style={mono}
          >
            {brief}
          </div>
        )}

        {tasks && tasks.length > 0 ? (
          <div>
            <p
              className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
              style={mono}
            >
              {tasksSectionLabel}
            </p>
            <ol
              className="list-decimal list-outside pl-4 space-y-1 text-[11px] sm:text-xs leading-snug text-gray-200"
              style={mono}
            >
              {tasks.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {primaryCta ? (
          <div
            className="mt-2 overflow-hidden border-2 border-cyan-400/70 bg-gradient-to-b from-cyan-950/50 to-slate-950/80 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
            style={{ borderRadius: 0 }}
          >
            <div className="space-y-1.5 px-2.5 pb-2 pt-2.5">
              <p
                className="text-[9px] uppercase tracking-[0.22em] text-cyan-300/95"
                style={mono}
              >
                {primaryCta.eyebrow}
              </p>
              <p
                className="text-sm font-bold uppercase tracking-wide leading-tight text-white"
                style={{
                  fontFamily:
                    "var(--font-rajdhani), 'Arial Black', sans-serif",
                }}
              >
                {primaryCta.headline}
              </p>
              <div
                className="text-[11px] leading-snug text-gray-100"
                style={mono}
              >
                {primaryCta.supporting}
              </div>
            </div>
            <button
              type="button"
              onClick={primaryCta.onClick}
              className="w-full border-t-2 border-cyan-400/50 bg-cyan-600 py-3.5 px-3 text-center text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-cyan-500 active:bg-cyan-700"
              style={{
                fontFamily:
                  "var(--font-rajdhani), 'Arial Black', sans-serif",
                borderRadius: 0,
              }}
            >
              {primaryCta.buttonLabel}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentStepIndex === 0}
          className="px-2.5 py-1 text-[10px] sm:text-xs bg-gray-700 text-white rounded-none font-mono hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={debugEnabled}
            onChange={(e) => setDebugEnabled(e.target.checked)}
          />
          <span className="text-[10px] font-mono text-gray-300">Debug</span>
        </label>
        {!isVisibleLastStep && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="ml-auto px-2.5 py-1 text-[10px] sm:text-xs bg-cyan-600 text-white rounded-none font-mono hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
