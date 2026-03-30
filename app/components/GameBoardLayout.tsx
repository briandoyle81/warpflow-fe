"use client";

import React from "react";

interface GameBoardLayoutProps {
  isCurrentPlayerTurn: boolean;
  children: React.ReactNode;
  rightControls?: React.ReactNode;
  containerRef?: React.Ref<HTMLDivElement>;
}

export const GameBoardLayout: React.FC<GameBoardLayoutProps> = ({
  isCurrentPlayerTurn,
  children,
  rightControls,
  containerRef,
}) => {
  return (
    <div
      ref={containerRef}
      className="p-2 w-full border border-solid"
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

