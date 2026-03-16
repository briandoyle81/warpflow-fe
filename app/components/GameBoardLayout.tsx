"use client";

import React from "react";

interface GameBoardLayoutProps {
  isCurrentPlayerTurn: boolean;
  children: React.ReactNode;
  rightControls?: React.ReactNode;
}

export const GameBoardLayout: React.FC<GameBoardLayoutProps> = ({
  isCurrentPlayerTurn,
  children,
  rightControls,
}) => {
  return (
    <div
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

      {/* Legend and optional controls row (shared between game and tutorial) */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border border-gray-700"></div>
            <span className="text-gray-300">Creator Ships</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 border border-gray-700"></div>
            <span className="text-gray-300">Joiner Ships</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-green-400 bg-green-500/20"></div>
            <span className="text-gray-300">Movement Range</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-orange-400 bg-orange-500/20"></div>
            <span className="text-gray-300">Shooting Range</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-600 border border-gray-700"></div>
            <span className="text-gray-300">Moved This Round</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-400 bg-blue-900"></div>
            <span className="text-gray-300">Your Ship (Movable)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-purple-400 bg-purple-900"></div>
            <span className="text-gray-300">Opponent Ship (View Only)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-1 border-orange-400 bg-orange-900/50"></div>
            <span className="text-gray-300">Valid Target</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-red-400 bg-red-900"></div>
            <span className="text-gray-300">Selected Target</span>
          </div>
        </div>

        {rightControls}
      </div>
    </div>
  );
};

