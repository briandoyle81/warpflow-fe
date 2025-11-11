"use client";

import React from "react";
import { TutorialStep } from "../types/onboarding";
import { Position } from "../types/types";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Warpflow",
    description: "Learn the basics of strategic spaceship combat",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Welcome to Warpflow!</p>
        <p>This tutorial will teach you the core mechanics of the game.</p>
        <p className="text-yellow-300">Look at the game map below:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><span className="text-purple-400">Purple borders</span> = Blocked tiles (line of sight blockers)</li>
          <li><span className="text-yellow-400">Yellow tiles</span> = Scoring positions (reusable)</li>
          <li><span className="text-blue-400">Blue tiles</span> = Scoring positions (once only)</li>
          <li><span className="text-gray-300">Gray tiles</span> = Empty space</li>
        </ul>
        <p className="text-sm">Your ships are on the left (columns 0-4), enemy ships are on the right (columns 20-24).</p>
      </div>
    ),
    allowedActions: {},
    highlightElements: {
      mapPositions: [
        { row: 3, col: 10 }, // Example blocked tile
        { row: 6, col: 12 }, // Example scoring tile
      ],
    },
  },
  {
    id: "goals",
    title: "Game Goals & Victory",
    description: "Learn how to win the game",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">How to Win</p>
        <p>There are two ways to win:</p>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li><span className="text-yellow-300">Score Points:</span> Move your ships to scoring tiles to earn points. First player to reach the max score wins!</li>
          <li><span className="text-red-300">Destroy Enemies:</span> Destroy all enemy ships to win immediately.</li>
        </ol>
        <p className="text-sm">Current max score: <span className="text-yellow-300 font-bold">10 points</span></p>
        <p className="text-sm">Your score: <span className="text-green-300 font-bold">0</span> | Enemy score: <span className="text-red-300 font-bold">0</span></p>
      </div>
    ),
    allowedActions: {},
    highlightElements: {
      uiElements: ["score-display"],
    },
  },
  {
    id: "select-ship",
    title: "Ship Selection",
    description: "Learn to view ship information",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Select a Ship</p>
        <p>Click on one of your ships (on the left side) to view its details.</p>
        <p className="text-sm">You&apos;ll see:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Hull Points (health)</li>
          <li>Movement range</li>
          <li>Weapon range and damage</li>
          <li>Equipment (weapon, armor, shields, special ability)</li>
        </ul>
        <p className="text-yellow-300 font-bold">Try clicking on a ship now!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1001n, 1002n, 1003n], // All player ships
    },
    highlightElements: {
      ships: [1001n, 1002n, 1003n],
    },
    onStepComplete: (actionData) => {
      return actionData?.type === "selectShip" && actionData?.shipId !== undefined;
    },
  },
  {
    id: "move-ship",
    title: "Moving Ships",
    description: "Learn to move your ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Move Your Ship</p>
        <p>With a ship selected, click on a highlighted tile to move it.</p>
        <p className="text-sm">The highlighted tiles show your ship&apos;s movement range.</p>
        <p className="text-yellow-300 font-bold">Select ship 1001 and move it forward!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1001n],
      moveShip: {
        shipId: 1001n,
        allowedPositions: [
          { row: 5, col: 2 },
          { row: 6, col: 3 },
          { row: 6, col: 4 },
          { row: 7, col: 2 },
        ],
      },
    },
    highlightElements: {
      ships: [1001n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "moveShip" && actionData?.shipId === 1001n;
    },
  },
  {
    id: "score-points",
    title: "Scoring Points",
    description: "Learn to claim points from scoring tiles",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Claim Points</p>
        <p>Move your ship to a scoring tile (yellow or blue) to automatically claim points!</p>
        <p className="text-sm">Points are claimed when you end your turn on a scoring tile.</p>
        <p className="text-yellow-300 font-bold">Move ship 1001 to the highlighted scoring tile!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1001n],
      moveShip: {
        shipId: 1001n,
        allowedPositions: [
          { row: 6, col: 12 }, // Scoring tile
        ],
      },
    },
    highlightElements: {
      ships: [1001n],
      mapPositions: [{ row: 6, col: 12 }],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "moveShip" &&
             actionData?.position?.row === 6 &&
             actionData?.position?.col === 12;
    },
  },
  {
    id: "shoot",
    title: "Firing Weapons",
    description: "Learn to shoot at enemy ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Shoot at Enemy</p>
        <p>With a ship selected, click on an enemy ship within range to shoot it.</p>
        <p className="text-sm">The highlighted area shows your weapon range. Ships can always shoot adjacent enemies (1 tile away).</p>
        <p className="text-yellow-300 font-bold">Select ship 1001, then click on enemy ship 2001 to shoot!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1001n],
      shoot: {
        shipId: 1001n,
        allowedTargets: [2001n],
      },
    },
    highlightElements: {
      ships: [1001n, 2001n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "shoot" &&
             actionData?.shipId === 1001n &&
             actionData?.targetShipId === 2001n;
    },
  },
  {
    id: "special-emp",
    title: "Special Ability: EMP",
    description: "Learn to use EMP to disable enemies",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Use EMP</p>
        <p>EMP disables enemy ships, preventing them from acting.</p>
        <p className="text-sm">Select ship 1002 (has EMP), switch to Special mode, then target an enemy.</p>
        <p className="text-yellow-300 font-bold">Use EMP on enemy ship 2001!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1002n],
      useSpecial: {
        shipId: 1002n,
        allowedTargets: [2001n],
        specialType: 1, // EMP
      },
    },
    highlightElements: {
      ships: [1002n, 2001n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "useSpecial" &&
             actionData?.shipId === 1002n &&
             actionData?.targetShipId === 2001n;
    },
  },
  {
    id: "special-repair",
    title: "Special Ability: Repair",
    description: "Learn to repair friendly ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Repair Friendly Ship</p>
        <p>Repair restores hull points to friendly ships.</p>
        <p className="text-sm">Select ship 1003 (has Repair), switch to Special mode, then target ship 1001.</p>
        <p className="text-yellow-300 font-bold">Repair ship 1001!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1003n],
      useSpecial: {
        shipId: 1003n,
        allowedTargets: [1001n],
        specialType: 2, // Repair
      },
    },
    highlightElements: {
      ships: [1003n, 1001n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "useSpecial" &&
             actionData?.shipId === 1003n &&
             actionData?.targetShipId === 1001n;
    },
  },
  {
    id: "rescue",
    title: "Rescuing Disabled Ships",
    description: "Learn to assist disabled friendly ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Assist Disabled Ship</p>
        <p>Disabled ships (0 HP) will be destroyed unless assisted.</p>
        <p className="text-sm">Move next to a disabled friendly ship and assist it to prevent destruction.</p>
        <p className="text-yellow-300 font-bold">First, we&apos;ll disable ship 1001, then assist it with ship 1003!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1003n],
      assist: {
        shipId: 1003n,
        allowedTargets: [1001n], // Will be disabled first
      },
    },
    highlightElements: {
      ships: [1003n, 1001n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "assist" &&
             actionData?.shipId === 1003n &&
             actionData?.targetShipId === 1001n;
    },
  },
  {
    id: "destroy-disabled",
    title: "Destroying Disabled Enemies",
    description: "Learn to finish off disabled enemy ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Destroy Disabled Enemy</p>
        <p>Shooting a disabled enemy ship (0 HP) will destroy it and increase reactor overload.</p>
        <p className="text-sm">Enemy ship 2002 is already disabled. Shoot it to destroy it!</p>
        <p className="text-yellow-300 font-bold">Select ship 1001 and shoot enemy ship 2002!</p>
      </div>
    ),
    allowedActions: {
      selectShip: [1001n],
      shoot: {
        shipId: 1001n,
        allowedTargets: [2002n], // Disabled enemy
      },
    },
    highlightElements: {
      ships: [1001n, 2002n],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return actionData?.type === "shoot" &&
             actionData?.shipId === 1001n &&
             actionData?.targetShipId === 2002n;
    },
  },
  {
    id: "completion",
    title: "Tutorial Complete!",
    description: "You've learned the basics",
    instructions: (
      <div className="space-y-3">
        <p className="text-2xl font-bold text-green-300">🎉 Congratulations! 🎉</p>
        <p className="text-lg">You&apos;ve completed the tutorial!</p>
        <p className="text-sm">You&apos;ve learned:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>✓ How to read the game map</li>
          <li>✓ How to move ships</li>
          <li>✓ How to score points</li>
          <li>✓ How to shoot weapons</li>
          <li>✓ How to use special abilities (EMP, Repair)</li>
          <li>✓ How to rescue disabled ships</li>
          <li>✓ How to destroy disabled enemies</li>
        </ul>
        <p className="text-yellow-300 font-bold">Ready to play a real game? Head to the Lobbies tab!</p>
      </div>
    ),
    allowedActions: {},
  },
];
