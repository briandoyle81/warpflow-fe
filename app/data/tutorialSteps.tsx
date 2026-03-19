"use client";

import React from "react";
import { TutorialStep } from "../types/onboarding";
import { Position } from "../types/types";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Void Tactics",
    description: "Learn the basics of strategic spaceship combat",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">
          Welcome to Void Tactics!
        </p>
        <p>This tutorial will teach you the core mechanics of the game.</p>
        <p className="text-yellow-300">Look at the game map below:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <span className="text-purple-400">Purple borders</span> = Blocked
            tiles (line of sight blockers)
          </li>
          <li>
            <span className="text-yellow-400">Yellow tiles</span> = Scoring
            positions (reusable)
          </li>
          <li>
            <span className="text-blue-400">Blue tiles</span> = Scoring
            positions (once only)
          </li>
          <li>
            <span className="text-gray-300">Gray tiles</span> = Empty space
          </li>
        </ul>
        <p className="text-sm">
          Your ships are on the left (columns 0-3), enemy ships are on the right
          (columns 13-16).
        </p>
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
          <li>
            <span className="text-yellow-300">Score Points:</span> At the end of
            each round, non-disabled ships on scoring zones score points. First
            player to reach the max score wins!
          </li>
          <li>
            <span className="text-red-300">Destroy Enemies:</span> Destroy all
            enemy ships to win immediately.
          </li>
        </ol>
        <p className="text-sm">
          Current max score:{" "}
          <span className="text-yellow-300 font-bold">10 points</span>
        </p>
        <p className="text-sm">
          Your score: <span className="text-green-300 font-bold">0</span> |
          Enemy score: <span className="text-red-300 font-bold">0</span>
        </p>
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
        <p>
          Click on one of your ships (on the left side) to view its details.
        </p>
        <p className="text-sm">You&apos;ll see:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Hull Points (health)</li>
          <li>Movement range</li>
          <li>Weapon range and damage</li>
          <li>Equipment (weapon, armor, shields, special ability)</li>
        </ul>
        <p className="text-yellow-300 font-bold">
          Try clicking on one of your ships now
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1001", "1002", "1003"], // All player ships
    },
    highlightElements: {
      ships: ["1001", "1002", "1003"],
    },
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "selectShip" && actionData?.shipId !== undefined
      );
    },
  },
  {
    id: "view-enemy",
    title: "Viewing Enemy Ships",
    description: "Learn to inspect enemy ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Inspect Enemy Ships</p>
        <p>
          Click on an enemy ship (on the right side) to view their capabilities.
        </p>
        <p className="text-sm">
          When you select an enemy ship, you&apos;ll see:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <span className="text-green-400">Green tiles</span> = Their movement
            range (where they can move)
          </li>
          <li>
            <span className="text-orange-400">Orange tiles</span> = Their threat
            range (where they can shoot to)
          </li>
          <li>Their ship stats (hull, weapons, equipment)</li>
          <li>
            Disabled ships 💀 with 0 hull points do not show movement or threat
            tiles, just like your own disabled ships.
          </li>
        </ul>
        <p className="text-yellow-300 font-bold">
          Try clicking on one of the enemy ships now.
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["2001", "2002", "2003"], // All enemy ships
    },
    highlightElements: {
      ships: ["2001", "2002", "2003"],
    },
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "selectShip" &&
        actionData?.shipId !== undefined &&
        (actionData.shipId === "2001" ||
          actionData.shipId === "2002" ||
          actionData.shipId === "2003")
      );
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
        <p className="text-sm">
          The highlighted tiles show your ship&apos;s movement range.
        </p>
        <p className="text-sm">
          In a nebula, ships can only shoot or be shot from 1 square away.
        </p>
        <p className="text-yellow-300 font-bold">
          Select the Tutorial Fighter and move it to the highlighted tile
          at (6, 7)!
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1003"],
      moveShip: {
        shipId: "1003",
        allowedPositions: [{ row: 6, col: 7 }],
      },
    },
    highlightElements: {
      ships: ["1003"],
      mapPositions: [{ row: 6, col: 7 }],
    },
    requiresTransaction: true,
    showTransactionAfter: true, // Show transaction dialog after moving the ship
    onStepComplete: (actionData) => {
      return actionData?.type === "moveShip" && actionData?.shipId === "1003";
    },
  },
  {
    id: "wait-for-opponent",
    title: "Waiting for Your Opponent",
    description: "See your last move and wait for the enemy response",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Previous Position</p>
        <p>
          After you move, both you and your opponent can still see the{" "}
          <span className="text-yellow-300 font-bold">previous position</span>{" "}
          of your ship on the map and in the Last Move display.
        </p>
        <p className="text-sm">
          This helps you track how ships moved during the turn so you can
          understand what changed.
        </p>
        <p className="text-yellow-300 font-bold">
          You have finished your move for this step. Now you must wait for your
          opponent to move.
        </p>
        <p>
          Click <strong>Next</strong> to see your opponent&apos;s response.
        </p>
      </div>
    ),
    // No actions required in this step, it is informational only.
    allowedActions: {},
    highlightElements: {},
  },
  {
    id: "score-points",
    title: "Scoring Points",
    description: "Learn how points are scored at end of round",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Move Your Ship in Response</p>
        <p className="text-red-300 font-bold">
          The Enemy Destroyer moved to a scoring position (9, 13) and scored a
          point.
        </p>
        <p>
          Race to the middle of the map and get your ships onto scoring zones
          before end of round so they score points.
        </p>
        <p className="text-sm">
          Points are scored at the end of each round by non-disabled ships on
          scoring zones.
        </p>
        <p className="text-yellow-300 font-bold">
          Move the Tutorial EMP onto the central scoring tile at (5, 8)!
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1001"],
      moveShip: {
        shipId: "1001",
        allowedPositions: [
          { row: 5, col: 8 }, // Central scoring tile
        ],
      },
    },
    highlightElements: {
      ships: ["1001"],
      mapPositions: [{ row: 5, col: 8 }],
    },
    requiresTransaction: true,
    // Apply the move immediately, then show the simulated transaction dialog,
    // so the grid and Last Move UI reflect the new position before approval.
    showTransactionAfter: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "moveShip" &&
        actionData?.position?.row === 5 &&
        actionData?.position?.col === 8
      );
    },
  },
  {
    id: "shoot",
    title: "Firing Weapons",
    description: "Learn to shoot at enemy ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Shoot at Enemy</p>
        <p>
          Before this step, the Enemy Fighter advanced to (4, 8) and fired on
          your Tutorial EMP in the center, dealing damage based on its weapon
          damage and your armor.
        </p>
        <p className="text-sm">
          With a ship selected, click on an enemy ship within range to shoot it.
          The highlighted area shows your weapon range. Ships can always shoot
          adjacent enemies (1 tile away).
        </p>
        <p className="text-yellow-300 font-bold">
          Select the Tutorial Sniper, move it to the highlighted tile at (1,
          3), then fire on the Enemy Fighter that just attacked you.
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1002"],
      moveShip: {
        shipId: "1002",
        allowedPositions: [
          { row: 1, col: 3 },
        ],
      },
      shoot: {
        shipId: "1002",
        allowedTargets: ["2001"],
      },
    },
    highlightElements: {
      ships: ["1002", "2001"],
      mapPositions: [
        { row: 1, col: 3 },
        { row: 4, col: 8 },
      ],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "shoot" &&
        actionData?.shipId === "1002" &&
        actionData?.targetShipId === "2001"
      );
    },
  },
  {
    id: "special-emp",
    title: "Special Ability: EMP",
    description: "Learn to use EMP to overload enemy reactors",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">Use EMP</p>
        <p>
          Before this step, the Heavy Enemy moved to (5, 9) and fired on your
          Tutorial EMP, dealing damage.
        </p>
        <p>
          EMP bypasses armor, shields, and hull points and damages the{" "}
          <span className="font-semibold text-purple-300">reactor directly</span>.
        </p>
        <p className="text-sm">
          When an enemy ship already has{" "}
          <span className="font-semibold text-yellow-300">2 points of reactor damage</span>,
          hitting it with EMP will push its reactor over the limit and{" "}
          <span className="font-semibold text-red-300">destroy the ship instantly</span>.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            Select the <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
          </li>
          <li>
            In the top action bar, change the dropdown from{" "}
            <span className="font-semibold">Weapons</span> to{" "}
            <span className="font-semibold">Special</span>, exactly the same way
            you would in a normal game.
          </li>
          <li>
            Choose the <span className="font-semibold">Heavy Enemy</span> as your target
            by either clicking its ship on the map or selecting it in the top UI.
          </li>
          <li>
            Click the <span className="font-semibold">Submit</span> button to propose the EMP attack.
          </li>
          <li>Approve the simulated transaction to fire the EMP.</li>
        </ol>
        <p className="text-yellow-300 font-bold">
          Use EMP on the Heavy Enemy that already has 2 points of reactor damage to
          destroy it with a reactor overload!
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1001"],
      useSpecial: {
        shipId: "1001",
        allowedTargets: ["2002"],
        specialType: 1, // EMP
      },
    },
    highlightElements: {
      ships: ["1001", "2002"],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "useSpecial" &&
        actionData?.shipId === "1001" &&
        actionData?.targetShipId === "2002"
      );
    },
  },
  {
    id: "ship-destruction",
    title: "Ship Destruction & Repair",
    description:
      "Learn what happens when a ship is destroyed by reactor overload, then repair your own",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">
          Aftermath of Reactor Overload
        </p>
        <p>
          Your EMP attack pushed the Heavy Enemy&apos;s reactor to{" "}
          <span className="font-semibold text-yellow-300">
            3 overload points
          </span>
          , instantly and permanently destroying the ship.
        </p>
        <p className="text-sm">
          When a ship reaches{" "}
          <span className="font-semibold text-yellow-300">
            3 points of reactor overload
          </span>
          , it is destroyed. The **owner** can recycle the NFT and receive{" "}
          <span className="font-semibold text-green-300">
            half of the normal UTC recycle value
          </span>
          , and the **destroyer** also receives{" "}
          <span className="font-semibold text-green-300">
            half of the normal UTC recycle value
          </span>
          as a payout.
        </p>
        <p className="text-lg font-bold text-cyan-300">Repair Friendly Ship</p>
        <p>Repair restores hull points to your own damaged ships.</p>
        <p className="text-sm">
          Select the Tutorial Sniper (has Repair), switch to Special mode,
          then target the Tutorial EMP.
        </p>
        <p className="text-yellow-300 font-bold">Repair the Tutorial EMP!</p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1002"],
      useSpecial: {
        shipId: "1002",
        allowedTargets: ["1001"],
        specialType: 2, // Repair
      },
    },
    highlightElements: {
      ships: ["1002", "1001"],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "useSpecial" &&
        actionData?.shipId === "1002" &&
        actionData?.targetShipId === "1001"
      );
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
        <p className="text-sm">
          Move next to a disabled friendly ship and assist it to prevent
          destruction.
        </p>
        <p className="text-yellow-300 font-bold">
          First, we&apos;ll disable the Tutorial EMP, then assist it with the
          Tutorial Sniper!
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1002"],
      assist: {
        shipId: "1002",
        allowedTargets: ["1001"], // Will be disabled first
      },
    },
    highlightElements: {
      ships: ["1002", "1001"],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "assist" &&
        actionData?.shipId === "1002" &&
        actionData?.targetShipId === "1001"
      );
    },
  },
  {
    id: "destroy-disabled",
    title: "Destroying Disabled Enemies",
    description: "Learn to finish off disabled enemy ships",
    instructions: (
      <div className="space-y-3">
        <p className="text-lg font-bold text-cyan-300">
          Destroy Disabled Enemy
        </p>
        <p>
          Shooting a disabled enemy ship (0 HP) will destroy it and increase
          reactor overload.
        </p>
        <p className="text-sm">
          The Heavy Enemy is already disabled. Shoot it to destroy it!
        </p>
        <p className="text-yellow-300 font-bold">
          Select the Tutorial EMP and shoot the Heavy Enemy!
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1001"],
      shoot: {
        shipId: "1001",
        allowedTargets: ["2002"], // Disabled enemy
      },
    },
    highlightElements: {
      ships: ["1001", "2002"],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      return (
        actionData?.type === "shoot" &&
        actionData?.shipId === "1001" &&
        actionData?.targetShipId === "2002"
      );
    },
  },
  {
    id: "completion",
    title: "Tutorial Complete!",
    description: "You've learned the basics",
    instructions: (
      <div className="space-y-3">
        <p className="text-2xl font-bold text-green-300">
          🎉 Congratulations! 🎉
        </p>
        <p className="text-lg">You&apos;ve completed the tutorial!</p>
        <p className="text-sm">You&apos;ve learned:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>✓ How to read the game map</li>
          <li>✓ How to move ships</li>
          <li>✓ How points are scored at end of round</li>
          <li>✓ How to shoot weapons</li>
          <li>✓ How to use special abilities (EMP, Repair)</li>
          <li>✓ How to rescue disabled ships</li>
          <li>✓ How to destroy disabled enemies</li>
        </ul>
        <p className="text-yellow-300 font-bold">
          Ready to play a real game? Head to the Lobbies tab!
        </p>
      </div>
    ),
    allowedActions: {},
  },
];
