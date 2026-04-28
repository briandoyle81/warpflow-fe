"use client";

import React from "react";

interface GameBoardLayoutProps {
  isCurrentPlayerTurn: boolean;
  children: React.ReactNode;
  rightControls?: React.ReactNode;
  containerRef?: React.Ref<HTMLDivElement>;
  /** Fires on left-click directly on the board frame (e.g. padding), not on the grid or controls. */
  onBoardChromeMouseDown?: () => void;
}

export const GameBoardLayout: React.FC<GameBoardLayoutProps> = ({
  isCurrentPlayerTurn,
  children,
  rightControls,
  containerRef,
  onBoardChromeMouseDown,
}) => {
  return (
    <div
      ref={containerRef}
      className="w-full border border-solid p-0 lg:p-2"
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if (e.target !== e.currentTarget) return;
        onBoardChromeMouseDown?.();
      }}
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
        outline: `2px solid ${
          isCurrentPlayerTurn
            ? "var(--color-cyan)"
            : "var(--color-warning-red)"
        }`,
        outlineOffset: 0,
      }}
    >
      {children}

      {rightControls ? (
        <div className="mt-4 flex justify-end text-sm">{rightControls}</div>
      ) : null}
    </div>
  );
};

