"use client";

import React from "react";
import { TutorialStep } from "../types/onboarding";
import { ActionType } from "../types/types";

const TUTORIAL_INCOMPLETE_SUBHEADING = (
  <h4 className="text-base font-bold text-red-500">
    Tutorial experience is incomplete. This is a partial placeholder.
  </h4>
);

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Void Tactics",
    description: "Learn the basics of strategic spaceship combat",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
          In this tutorial match, max score is{" "}
          <span className="text-yellow-300 font-bold">100 points</span> (each
          gold scoring zone on the map is worth{" "}
          <span className="text-yellow-300 font-bold">10 points</span>).
        </p>
        <p className="text-sm">
          Scores here start at{" "}
          <span className="text-green-300 font-bold">60</span> (you) vs{" "}
          <span className="text-red-300 font-bold">70</span> (enemy), as if you
          are mid-game.
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Move Your Ship</p>
        <p>
          The{" "}
          <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
          is damaged. You can protect it by moving it into a{" "}
          <span className="font-semibold text-purple-300">nebula</span>.
        </p>
        <p className="text-sm">
          Nebula tiles block line of sight. Ships inside a nebula tile can only
          shoot or be shot by ships that are exactly{" "}
          <span className="font-semibold">1 tile</span> away (orthogonal
          adjacency). A diagonal step counts as{" "}
          <span className="font-semibold">2</span> tiles, so it does not count
          as 1 tile away.
        </p>
        <p className="text-sm">
          With a ship selected, click on a highlighted tile to move it. The
          highlighted tiles show your ship&apos;s movement range.
        </p>
        <p className="text-yellow-300 font-bold">
          Select the Tutorial Fighter and move it to the highlighted tile at (6,
          7)!
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">
          Move Your Ship in Response
        </p>
        <p className="text-sm">
          Scoring happens at the{" "}
          <span className="font-semibold">end of the round</span>. You earn
          points for each scoring zone you{" "}
          <span className="font-semibold">control</span> by having a{" "}
          <span className="font-semibold">functioning</span> ship (not disabled)
          on that tile when the round ends.
        </p>
        <p className="text-red-300 font-bold">
          The Enemy Destroyer moved to a scoring position at (9, 13) to contest
          that zone for end-of-round scoring.
        </p>
        <p>
          Race to the middle of the map and get your ships onto scoring zones
          you want to control before the round ends.
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
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
          Select the Tutorial Sniper, move it to the highlighted tile at (1, 3),
          then fire on the Enemy Fighter that just attacked you.
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1002"],
      moveShip: {
        shipId: "1002",
        allowedPositions: [{ row: 1, col: 3 }],
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
    id: "end-of-round",
    title: "End of Round",
    description: "What happens when everyone has finished moving",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">End of Round</p>
        <p>
          When{" "}
          <span className="font-semibold text-yellow-300">
            all players have moved all of their ships
          </span>{" "}
          for the round, the round ends.
        </p>
        <p className="text-sm">
          At the start of the next round, every ship&apos;s movement marker is
          cleared so each ship can move again.
        </p>
        <p className="text-sm">
          Turn order also flips: whoever{" "}
          <span className="font-semibold">did not</span> go first last round
          goes first this round.
        </p>
        <p className="text-yellow-300 font-bold">
          The header shows it is your opponent&apos;s turn in the new round.
          Click <strong>Next</strong> when you are ready to continue.
        </p>
      </div>
    ),
    allowedActions: {},
    highlightElements: {},
  },
  {
    id: "special-emp",
    title: "Special Ability: EMP",
    description: "Learn to use EMP to overload enemy reactors",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Use EMP</p>
        <p>
          Before this step, the Heavy Enemy moved to (5, 9) and fired on your
          Tutorial EMP, dealing damage.
        </p>
        <p>
          EMP bypasses armor, shields, and hull points and damages the{" "}
          <span className="font-semibold text-purple-300">
            reactor directly
          </span>
          .
        </p>
        <p className="text-sm">
          When an enemy ship already has{" "}
          <span className="font-semibold text-yellow-300">
            2 points of reactor damage
          </span>
          , hitting it with EMP will push its reactor over the limit and{" "}
          <span className="font-semibold text-red-300">
            destroy the ship instantly
          </span>
          .
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            Select the{" "}
            <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
          </li>
          <li>
            In the top action bar, change the dropdown from{" "}
            <span className="font-semibold">Weapons</span> to{" "}
            <span className="font-semibold">Special</span>, exactly the same way
            you would in a normal game.
          </li>
          <li>
            Choose the <span className="font-semibold">Heavy Enemy</span> as
            your target by either clicking its ship on the map or selecting it
            in the top UI.
          </li>
          <li>
            Click the <span className="font-semibold">Submit</span> button to
            propose the EMP attack.
          </li>
          <li>Approve the simulated transaction to fire the EMP.</li>
        </ol>
        <p className="text-yellow-300 font-bold">
          Use EMP on the Heavy Enemy that already has 2 points of reactor damage
          to destroy it with a reactor overload!
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
    title: "Ship Destruction",
    description:
      "Learn what happens when a ship is destroyed by reactor overload",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
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
        <p className="text-yellow-300 font-bold">
          When you&apos;re ready, continue to the next step.
        </p>
      </div>
    ),
    allowedActions: {},
    highlightElements: {
      ships: ["1001", "2002"],
    },
  },
  {
    id: "rescue",
    title: "Making Tough Decisions",
    description: "Choose between saving your EMP or sacrificing it for tempo",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">
          Making Tough Decisions
        </p>
        <p>
          The <span className="font-semibold text-red-300">Enemy Sniper</span>{" "}
          has fired its railgun at your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span> and{" "}
          <span className="font-semibold">disabled</span> it (0 hull points).
        </p>
        <p className="text-sm">
          To save your leveled-up Tutorial EMP, you would normally need to{" "}
          <span className="font-semibold">repair it with repair drones</span> or{" "}
          spend its turn to <span className="font-semibold">flee</span> the
          battlefield.
        </p>
        <p className="text-sm">
          In this position, your Tutorial Sniper is too far away to repair in
          time, so the only way to save the EMP is to flee. If it flees, the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span> will
          capture the central scoring point, and without enough firepower to
          remove it, the enemy wins.
        </p>
        <p className="text-sm">
          Your alternate line is to{" "}
          <span className="font-semibold">sacrifice</span> the Tutorial EMP, let
          the enemy destroy it, then use your next turn to seize that scoring
          point yourself to secure the win.
        </p>
        <p className="text-yellow-300 font-bold">
          When you&apos;re ready, continue to the next step.
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1001", "1002"],
      // EMP can only submit a retreat/flee from its current tile in this step.
      moveShip: {
        shipId: "1001",
        allowedPositions: [{ row: 5, col: 8 }],
      },
      // Alternate line: keep sniper in place and shoot Enemy Fighter.
      shoot: {
        shipId: "1002",
        allowedTargets: ["2001"],
      },
    },
    highlightElements: {
      ships: ["1001", "2003"],
    },
    requiresTransaction: true,
    onStepComplete: (actionData) => {
      const isEmpRetreat =
        actionData?.type === "moveShip" &&
        actionData?.shipId === "1001" &&
        actionData?.actionType === ActionType.Retreat;
      const isSniperShoot =
        actionData?.type === "shoot" &&
        actionData?.shipId === "1002" &&
        actionData?.targetShipId === "2001";
      return isEmpRetreat || isSniperShoot;
    },
  },
  {
    id: "rescue-outcome-retreat",
    title: "Making Tough Decisions",
    description: "You saved your EMP, but yielded initiative",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">
          Outcome: You Retreated the Tutorial EMP
        </p>
        <p>
          You used your turn to retreat your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>. It
          is now off the battlefield, and the last move shows that retreat.
        </p>
        <p className="text-sm">
          Since you spent your action to save the ship, the center resource
          point is now undefended, and the enemy can seize it.
        </p>
        <p className="text-yellow-300 font-bold">Click Next to continue.</p>
      </div>
    ),
    allowedActions: {},
    highlightElements: {
      ships: ["2001"],
    },
  },
  {
    id: "rescue-outcome-sniper",
    title: "Accepting a Sacrifice",
    description: "You lost the EMP but kept tempo",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">
          Outcome: You Fired with the Tutorial Sniper
        </p>
        <p>
          The last move shows the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
          firing on your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>,
          destroying it.
        </p>
        <p className="text-sm">
          You lost your EMP, but it is now your turn and the center resource
          point is undefended. Move your{" "}
          <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
          to seize it.
        </p>
        <p className="text-yellow-300 font-bold">
          Move the Tutorial Fighter to (5, 8). You may also fire on the Enemy
          Fighter before submitting.
        </p>
      </div>
    ),
    allowedActions: {
      selectShip: ["1003"],
      moveShip: {
        shipId: "1003",
        allowedPositions: [{ row: 5, col: 8 }],
      },
      shoot: {
        shipId: "1003",
        allowedTargets: ["2001"],
      },
    },
    highlightElements: {
      ships: ["1003", "2001"],
      mapPositions: [{ row: 5, col: 8 }],
    },
    requiresTransaction: true,
    showTransactionAfter: false,
    onStepComplete: (actionData) => {
      const movedToCenter =
        actionData?.type === "moveShip" &&
        actionData?.shipId === "1003" &&
        actionData?.position?.row === 5 &&
        actionData?.position?.col === 8;
      const shotEnemyFighter =
        actionData?.type === "shoot" &&
        actionData?.shipId === "1003" &&
        actionData?.targetShipId === "2001";
      return movedToCenter || shotEnemyFighter;
    },
  },
  {
    id: "completion-retreat",
    title: "Planning Ahead",
    description: "You accepted defeat, but kept your most powerful ship",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-2xl font-bold text-green-300">
          Planning Ahead
        </p>
        <p className="text-lg">
          Although you accepted defeat, you saved your most powerful ship.
          That saved power should help you win many more victories in the
          future.
        </p>
        <p className="text-sm">
          In every game, you will have to choose between short-term
          control and long-term power.
        </p>
        <p className="text-yellow-300 font-bold">
          Log in to claim 3 free ships and record your first loss.
        </p>
      </div>
    ),
    allowedActions: {},
  },
  {
    id: "completion-sniper",
    title: "Victory Achieved!",
    description: "You sacrificed tempo to secure your first win",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-2xl font-bold text-green-300">
          Victory Achieved!
        </p>
        <p className="text-lg">
          You sacrificed your Tutorial EMP, but you secured your first
          victory.
        </p>
        <p className="text-sm">
          This is a tough choice you will have to make in every game.
        </p>
        <p className="text-yellow-300 font-bold">
          Great job surviving the tradeoff and taking the win. Log in to
          claim your ships and record your first win!
        </p>
      </div>
    ),
    allowedActions: {},
  },
];
