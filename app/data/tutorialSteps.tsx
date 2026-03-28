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
    title: "Welcome aboard",
    description: "Fleet briefing and map orientation",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Welcome aboard</p>
        <p>
          <span className="font-bold text-cyan-300">Admiral</span>, you&apos;re
          late. We&apos;ve traded losses with the{" "}
          <span className="font-semibold text-red-300">enemy</span>, and
          we&apos;re still{" "}
          <span className="font-semibold text-amber-300">
            behind on the board
          </span>
          , but with{" "}
          <span className="font-bold text-cyan-300">you on station</span> we can
          turn this around.
        </p>
        <p>
          We&apos;re fighting through the{" "}
          <span className="font-semibold text-amber-200">outer dust belts</span>{" "}
          over{" "}
          <span className="font-semibold text-yellow-300">
            sparse resources
          </span>
          . Whoever exploits a site first keeps it under{" "}
          <span className="font-semibold text-orange-300">space law</span>. Out
          here, that&apos;s the rule that matters.
        </p>
        <p className="text-sm text-gray-300">
          On the map: purple blocks line of sight, yellow and blue mark scoring
          zones, gray is open space. Your ships start on the left, enemy on the
          right.
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
    title: "How we win",
    description: "Victory conditions and scoring",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">How we win</p>
        <p>
          Each round, ships can mine the resources they control.{" "}
          <span className="font-semibold text-cyan-300">Central</span> has set
          the claim minimum at{" "}
          <span className="font-bold text-yellow-300">100</span> for this{" "}
          <span className="font-semibold text-amber-200">resource cluster</span>
          .{"  "}
          Whoever gets there first gets{" "}
          <span className="font-semibold text-orange-300">legal claim</span> on
          the site.
        </p>
        <p>
          Current tally:{" "}
          <span className="font-semibold text-cyan-300">60</span> us,{" "}
          <span className="font-semibold text-red-300">70</span> them. You&apos;re{" "}
          <span className="font-semibold text-amber-300">in the hole</span>, but{" "}
          <span className="font-bold text-cyan-300">
            the fight is still yours to take
          </span>
          .
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
          Our <span className="font-semibold text-cyan-300">fleet</span>, or{" "}
          <span className="font-semibold text-amber-300">what&apos;s left of it</span>
          , is ready for your{" "}
          <span className="font-semibold text-yellow-300">inspection</span>.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Hover over your ships to view their stats and abilities.
            </li>
            <li>
              Click on your ships to see their{" "}
              <span className="font-semibold text-green-400">movement</span>
              {" and "}
              <span className="font-semibold text-orange-400">threat range</span>
              .
            </li>
            <li>
              Click a ship again to see its{" "}
              <span className="font-semibold text-orange-400">weapons range</span>{" "}
              from the current position.
            </li>
          </ol>
        </div>
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
          The <span className="font-semibold text-red-300">enemy</span> holds
          the <span className="font-semibold text-amber-200">right side</span> of
          the map. Select one of their ships to see what they can do.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Hover over enemy ships to view their stats and abilities.
            </li>
            <li>
              Click on enemy ships to see their{" "}
              <span className="font-semibold text-green-400">movement</span>
              {" and "}
              <span className="font-semibold text-orange-400">threat range</span>
              .
            </li>
            <li>
              Click an enemy ship again to see its{" "}
              <span className="font-semibold text-orange-400">weapons range</span>{" "}
              from the current position.
            </li>
          </ol>
        </div>
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
        <p className="text-sm text-gray-400">
          Nebula tiles block line of sight. Inside a nebula, ships can only
          shoot or be shot by ships exactly{" "}
          <span className="font-semibold text-gray-300">1 tile</span> away
          (orthogonal). A diagonal step counts as{" "}
          <span className="font-semibold text-gray-300">2</span> tiles, not 1.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>Select the Tutorial Fighter.</li>
            <li>
              With it selected, click a highlighted tile to stage a move.{" "}
              <span className="font-semibold text-green-400">Green</span> tiles
              show{" "}
              <span className="font-semibold text-green-400">movement</span>{" "}
              range.
            </li>
            <li>
              Confirm the move to the highlighted tile at row{" "}
              <span className="font-semibold text-yellow-300">6</span>, column{" "}
              <span className="font-semibold text-yellow-300">7</span> (
              <span className="font-semibold text-green-400">submit</span> when
              prompted).
            </li>
          </ol>
        </div>
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
          <span className="font-semibold text-yellow-300">previous position</span>{" "}
          of your ship on the map and in the Last Move display.
        </p>
        <p className="text-sm text-gray-400">
          This helps you track how ships moved during the turn so you can see what
          changed.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Your move is in. In a live match you wait on the opponent. Click{" "}
              <span className="font-semibold text-cyan-300">Next</span> to advance
              and see their response.
            </li>
          </ol>
        </div>
      </div>
    ),
    // No actions required in this step, it is informational only.
    allowedActions: {},
    highlightElements: {},
  },
  {
    id: "score-points",
    title: "Scoring Points",
    description: "End-of-round scoring and zone control",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Scoring zones</p>
        <p className="text-sm">
          At round end, each scoring zone you{" "}
          <span className="font-semibold">control</span> with a{" "}
          <span className="font-semibold">functioning</span> ship (not disabled)
          on the tile counts toward points.
        </p>
        <p className="text-sm">
          Their destroyer is already contesting a zone. Respond by moving the{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span> to
          capture one for us.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Select the{" "}
              <span className="font-semibold text-cyan-300">Tutorial EMP</span>{" "}
              and move it to the highlighted central scoring tile.
            </li>
            <li>
              Confirm the move to the highlighted central scoring tile at row{" "}
              <span className="font-semibold text-yellow-300">5</span>, column{" "}
              <span className="font-semibold text-yellow-300">8</span> (
              <span className="font-semibold text-green-400">submit</span> when
              prompted).
            </li>
          </ol>
        </div>
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
    description: "Weapon range and firing on targets",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Return fire</p>
        <p className="text-sm">
          Their <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
          just hit your EMP in the center. Answer with the{" "}
          <span className="font-semibold text-cyan-300">Tutorial Sniper</span>:
          move into position, then shoot back.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          With a ship selected, click an enemy in range. The overlay shows weapon
          range. Ships can always shoot adjacent enemies (1 tile away).
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Select the{" "}
              <span className="font-semibold text-cyan-300">Tutorial Sniper</span>{" "}
              and stage a move to the highlighted tile at row{" "}
              <span className="font-semibold text-yellow-300">1</span>, column{" "}
              <span className="font-semibold text-yellow-300">3</span> (
              <span className="font-semibold text-green-400">green</span> shows
              movement range).
            </li>
            <li>
              Click the{" "}
              <span className="font-semibold text-red-300">Enemy Fighter</span> to
              select your shot (it pulses after you stage the move).
            </li>
            <li>
              <span className="font-semibold text-green-400">Submit</span> to
              confirm move and shot together.
            </li>
          </ol>
        </div>
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
    description: "Round boundaries, markers, and turn order",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">End of round</p>
        <p className="text-sm">
          When{" "}
          <span className="font-semibold text-yellow-300">both sides</span> have
          finished moving every ship, the round ends.
        </p>
        <p className="text-sm">
          At the start of the next round, movement markers clear so each ship
          can move again.{" "}
          <span className="font-semibold text-cyan-300">First player</span>{" "}
          swaps: whoever went second last round leads this one.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              The header shows whose turn it is. Here the opponent opens the new
              round. Click{" "}
              <span className="font-semibold text-cyan-300">Next</span> when you
              are ready.
            </li>
          </ol>
        </div>
      </div>
    ),
    allowedActions: {},
    highlightElements: {},
  },
  {
    id: "special-emp",
    title: "Special Ability: EMP",
    description: "EMP special and reactor overload",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">EMP</p>
        <p className="text-sm">
          The <span className="font-semibold text-red-300">Heavy Enemy</span> just
          shot your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
        </p>
        <p className="text-sm">
          We have a powerful gun, but the enemy has{" "}
          <span className="font-semibold text-amber-200">heavy armor</span>. We
          cannot knock it out in one hit.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          It already took{" "}
          <span className="font-semibold text-purple-300">reactor damage</span>{" "}
          earlier in the fight. We can bypass its defenses and kill it instantly
          with an <span className="font-semibold text-cyan-300">EMP</span>.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Select the{" "}
              <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
            </li>
            <li>
              In the top action bar, switch from{" "}
              <span className="font-semibold text-gray-200">Weapons</span> to{" "}
              <span className="font-semibold text-gray-200">Special</span>.
            </li>
            <li>
              Target the{" "}
              <span className="font-semibold text-red-300">Heavy Enemy</span> on
              the map or from the header roster (it pulses after Special is
              selected).
            </li>
            <li>
              <span className="font-semibold text-green-400">Submit</span>, then
              confirm in the transaction dialog.
            </li>
          </ol>
        </div>
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
    description: "Reactor overload, hull loss, and recycle payouts",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Aftermath</p>
        <p className="text-sm">
          Your EMP rammed the{" "}
          <span className="font-semibold text-red-300">Heavy Enemy</span>
          &apos;s reactor past{" "}
          <span className="font-semibold text-yellow-300">
            three overload points
          </span>
          . The stack detonates from the inside. One blinding flash, then the
          hull splits open and the ship is gone.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          No ship survives once its reactor reaches three overload points. The{" "}
          <span className="font-semibold text-cyan-300">owner</span> may recycle
          the NFT and take half the usual UTC recycle value. The player who{" "}
          <span className="font-semibold text-cyan-300">destroyed it</span> gets
          the matching half.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Click{" "}
              <span className="font-semibold text-cyan-300">Next</span> when you
              are ready.
            </li>
          </ol>
        </div>
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
    description: "Disabled EMP: flee or trade for the shot",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Hard choice</p>
        <p className="text-sm">
          The <span className="font-semibold text-red-300">Enemy Sniper</span>{" "}
          railgunned your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>. It
          is disabled at zero hull.
        </p>
        <p className="text-sm">
          You would normally repair or flee. Your{" "}
          <span className="font-semibold text-cyan-300">Tutorial Sniper</span>{" "}
          is too far to patch the EMP in time. If the EMP flees, the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span> can
          take the center and close you out.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          Or hold the sniper, shoot the fighter, lose the EMP, and contest the
          center on the next beat.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Make your decision
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              <span className="font-semibold text-cyan-300">Save the EMP:</span>{" "}
              select the Tutorial EMP and{" "}
              <span className="font-semibold text-green-400">submit</span>{" "}
              Retreat to leave the map.
            </li>
            <li>
              <span className="font-semibold text-cyan-300">
                Sacrifice for tempo:
              </span>{" "}
              select the Tutorial Sniper, target the{" "}
              <span className="font-semibold text-red-300">Enemy Fighter</span>,
              then <span className="font-semibold text-green-400">submit</span>{" "}
              the shot.
            </li>
          </ol>
        </div>
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
    description: "You saved your EMP, but yielded initiative on the center",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Making Tough Decisions</p>
        <p className="text-sm">
          The <span className="font-semibold text-yellow-300">Last move</span>{" "}
          shows your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>{" "}
          retreating off the map. You spent your action to save the hull.
        </p>
        <p className="text-sm">
          The center scoring tile at row{" "}
          <span className="font-semibold text-yellow-300">5</span>, column{" "}
          <span className="font-semibold text-yellow-300">8</span> is undefended.
          The{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span> can
          step in next (it pulses on the map).
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          You kept the ship, but you yielded initiative on that resource.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Click <span className="font-semibold text-cyan-300">Next</span>{" "}
              when you are ready to see the opponent&apos;s response.
            </li>
          </ol>
        </div>
      </div>
    ),
    allowedActions: {},
    highlightElements: {
      ships: ["2001"],
      mapPositions: [{ row: 5, col: 8 }],
    },
  },
  {
    id: "rescue-outcome-sniper",
    title: "Accepting a Sacrifice",
    description: "You lost the EMP but can fight for the center again",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-cyan-300">Accepting a Sacrifice</p>
        <p className="text-sm">
          The last move shows the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
          destroying your{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span>. You
          traded that ship for the ability to retake the center resource. That
          point is open now. Move the{" "}
          <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
          in to claim it.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          You may line up a shot on the Enemy Fighter before you commit the move.
        </p>
        <div>
          <p
            className="text-[9px] uppercase tracking-widest text-cyan-400/90 mb-1"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Orders
          </p>
          <ol className="list-decimal list-outside pl-5 space-y-1 text-sm text-gray-200">
            <li>
              Select the{" "}
              <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
              and stage a move to the highlighted tile at row{" "}
              <span className="font-semibold text-yellow-300">5</span>, column{" "}
              <span className="font-semibold text-yellow-300">8</span> (
              <span className="font-semibold text-green-400">green</span> shows
              movement range).
            </li>
            <li>
              Optionally click the{" "}
              <span className="font-semibold text-red-300">Enemy Fighter</span> to
              stage a shot (it pulses after you stage the move).
            </li>
            <li>
              <span className="font-semibold text-green-400">Submit</span> to
              confirm the move, with or without the shot.
            </li>
          </ol>
        </div>
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
    description:
      "Enemy Fighter took the center; you kept your strongest ship for the long run",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-amber-300">Planning Ahead</p>
        <p className="text-sm">
          <span className="font-semibold text-amber-400">Live to fight again.</span>{" "}
          The <span className="font-semibold text-yellow-300">Last move</span> on
          the map shows the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span> on the
          center resource at row{" "}
          <span className="font-semibold text-yellow-300">5</span>, column{" "}
          <span className="font-semibold text-yellow-300">8</span>. They claimed it
          after your retreat.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          You lost this engagement, but you kept your most powerful ship. Every
          match asks you to weigh short-term map control against long-term fleet
          power.
        </p>
        <div
          className="overflow-hidden border-2 border-cyan-400/70 bg-gradient-to-b from-cyan-950/50 to-slate-950/80 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
          style={{ borderRadius: 0 }}
        >
          <div className="space-y-2 p-3 pb-2">
            <p
              className="text-[9px] uppercase tracking-[0.22em] text-cyan-300/95"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              Ready for more
            </p>
            <p
              className="text-base font-bold uppercase tracking-wide text-white leading-tight"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              Take your fleet live
            </p>
            <p
              className="text-sm leading-snug text-gray-100"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              You banked power in the sim when it mattered.{" "}
              <span className="font-semibold text-cyan-300">Log in</span> to claim{" "}
              <span className="font-semibold text-yellow-300">3 free ships</span>
              , fight real admirals, and log this loss on your record.
            </p>
          </div>
          <button
            type="button"
            className="w-full border-t-2 border-cyan-400/50 bg-cyan-600 py-3.5 px-3 text-center text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-cyan-500 active:bg-cyan-700"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderRadius: 0,
            }}
            onClick={() => {
              alert("Feature not implemented");
            }}
          >
            Log in & claim 3 free ships
          </button>
        </div>
      </div>
    ),
    allowedActions: {},
  },
  {
    id: "completion-sniper",
    title: "Victory Achieved!",
    description: "You traded the EMP for the center and closed out the win",
    instructions: (
      <div className="space-y-3">
        {TUTORIAL_INCOMPLETE_SUBHEADING}
        <p className="text-lg font-bold text-green-400">Victory Achieved!</p>
        <p className="text-sm">
          <span className="font-semibold text-green-400">Victory.</span> The{" "}
          <span className="font-semibold text-yellow-300">Last move</span> on the
          map shows your{" "}
          <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
          on the center resource at row{" "}
          <span className="font-semibold text-yellow-300">5</span>, column{" "}
          <span className="font-semibold text-yellow-300">8</span>, firing on the{" "}
          <span className="font-semibold text-red-300">Enemy Fighter</span>.
        </p>
        <p className="text-[10px] text-gray-400 leading-snug">
          You gave up the{" "}
          <span className="font-semibold text-cyan-300">Tutorial EMP</span> to
          earn that opening. Every match will ask you to judge trades like that
          one.
        </p>
        <div
          className="overflow-hidden border-2 border-cyan-400/70 bg-gradient-to-b from-cyan-950/50 to-slate-950/80 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
          style={{ borderRadius: 0 }}
        >
          <div className="space-y-2 p-3 pb-2">
            <p
              className="text-[9px] uppercase tracking-[0.22em] text-cyan-300/95"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              Ready for more
            </p>
            <p
              className="text-base font-bold uppercase tracking-wide text-white leading-tight"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              Take your fleet live
            </p>
            <p
              className="text-sm leading-snug text-gray-100"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              You held the line in the sim. Claim{" "}
              <span className="font-semibold text-yellow-300">3 free ships</span>
              , fight real admirals, and put this win on your record.
            </p>
          </div>
          <button
            type="button"
            className="w-full border-t-2 border-cyan-400/50 bg-cyan-600 py-3.5 px-3 text-center text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-cyan-500 active:bg-cyan-700"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderRadius: 0,
            }}
            onClick={() => {
              alert("Feature not implemented");
            }}
          >
            Log in & claim 3 free ships
          </button>
        </div>
      </div>
    ),
    allowedActions: {},
  },
];
