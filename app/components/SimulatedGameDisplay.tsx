"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import defaultMap from "../../public/default_map.json";
import {
  TutorialContextValue,
  TutorialShipId,
  TutorialAction,
} from "../types/onboarding";
import {
  ALL_TUTORIAL_SHIPS,
  TUTORIAL_PLAYER_ADDRESS,
} from "../data/tutorialShips";
import {
  buildMapGridsFromDefaultMap,
  type DefaultMapShape,
} from "../utils/mapGridUtils";
import { toast } from "react-hot-toast";
import {
  ActionType,
  ShipPosition,
  Attributes,
  Ship,
  LastMove,
  getMainWeaponName,
  getSpecialName,
} from "../types/types";
import { GameGrid } from "./GameGrid";
import { TutorialGridTaskPanel } from "./TutorialGridTaskPanel";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameEvents } from "./GameEvents";
import { getScriptedStateForTutorialStepId } from "../data/tutorialScriptedStates";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import ShipCard from "./ShipCard";
import {
  GAME_VIEW_SIDE_ROOT_CLASS,
  useGameViewChromeLayout,
} from "../hooks/useGameViewChromeLayout";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";
import {
  computeMovementRange,
  computeShootingRange,
} from "../utils/gameGridRanges";

interface SimulatedGameDisplayProps {
  tutorialContext: TutorialContextValue;
  /** Called when user clicks back; exits tutorial and returns to Info tab. */
  onBack?: () => void;
}

const GRID_WIDTH = 17;
const GRID_HEIGHT = 11;

/**
 * Player ships whose cells get the **tutorial highlight** on step 3 (select-ship)
 * until the player selects a ship.
 */
const TUTORIAL_SELECT_SHIP_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [
  1001n,
  1002n,
  1003n,
];

/** Enemy ships for tutorial highlight on step 4 (view-enemy) until one is selected. */
const TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [
  2001n,
  2002n,
  2003n,
];

/** Tutorial Fighter (step 5 move-ship) until any ship is selected. */
const TUTORIAL_MOVE_SHIP_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [1003n];

/** Tutorial EMP (step 7 score-points) until a ship is selected. */
const TUTORIAL_SCORE_POINTS_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [1001n];

/** Tutorial Sniper (step 8 shoot) until a ship is selected. */
const TUTORIAL_SHOOT_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [1002n];

/** Enemy Fighter (step 8 shoot) after the Sniper move is staged, until a shot target is chosen. */
const TUTORIAL_SHOOT_HIGHLIGHT_ENEMY_SHIP_IDS: readonly bigint[] = [2001n];

/** Tutorial EMP (step 10 special-emp) until a ship is selected. */
const TUTORIAL_SPECIAL_EMP_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [1001n];

/** Heavy Enemy (step 10): pulse while arming with weapon first, or after Special if target cleared. */
const TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS: readonly bigint[] = [
  2002n,
];

/** Tutorial EMP + Tutorial Sniper (step 12 rescue): both cells pulse for the whole step. */
const TUTORIAL_RESCUE_CHOICE_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [
  1001n,
  1002n,
];

/** Enemy Fighter (step 12 rescue): pulse while Tutorial Sniper is selected and no shot target yet. */
const TUTORIAL_RESCUE_SNIPER_TARGET_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [
  2001n,
];

/** Step 13 (rescue-outcome-sniper): Tutorial Fighter until selected; Enemy Fighter after center move is staged, optional shot. */
const TUTORIAL_RESCUE_OUTCOME_SNIPER_FIGHTER_HIGHLIGHT_SHIP_IDS: readonly bigint[] =
  [1003n];
const TUTORIAL_RESCUE_OUTCOME_SNIPER_ENEMY_HIGHLIGHT_SHIP_IDS: readonly bigint[] =
  [2001n];

/** Step 13 (rescue-outcome-retreat): Enemy Fighter can seize the open center. */
const TUTORIAL_RESCUE_OUTCOME_RETREAT_HIGHLIGHT_SHIP_IDS: readonly bigint[] = [
  2001n,
];

function isTutorialEnemyFleetShipId(shipId: bigint): boolean {
  return TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS.some((id) => id === shipId);
}

/**
 * Branch final steps: max panel height as a fraction of the grid when the panel
 * is content-sized (`panelFitToContent`). Must be ≤ grid row count (11).
 */
const TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS = 10;

/** Step 1 (welcome): in-grid narrative with emphasis and map-theme colors. */
const TUTORIAL_WELCOME_GRID_BRIEF = (
  <>
    <p>
      <span className="font-bold text-cyan-300">Admiral</span>
      {", you're late. We've traded losses with the "}
      <span className="font-semibold text-red-300">enemy</span>
      {", and we're still "}
      <span className="font-semibold text-amber-300">behind on the board</span>
      {", but with "}
      <span className="font-bold text-cyan-300">you on station</span>
      {" we can turn this around."}
    </p>
    <p>
      {"We're fighting through the "}
      <span className="font-semibold text-amber-200">outer dust belts</span>
      {" over "}
      <span className="font-semibold text-yellow-300">sparse resources</span>
      {". Whoever exploits a site first keeps it under "}
      <span className="font-semibold text-orange-300">space law</span>
      {". Out here, that's the rule that matters."}
    </p>
  </>
);

/** Step 2 (goals): same wording as before, with emphasis only. */
const TUTORIAL_GOALS_GRID_BRIEF = (
  <>
    <p>
      Each round, ships can mine the resources in the area they control.{" "}
      <span className="font-semibold text-cyan-300">Central</span> has set the
      claim minimum at <span className="font-bold text-yellow-300">100</span>{" "}
      for this{" "}
      <span className="font-semibold text-amber-200">resource cluster</span>.
      {"  "}
      Whoever gets there first gets{" "}
      <span className="font-semibold text-orange-300">legal claim</span> on the
      site.
    </p>
    <p>
      Current tally: <span className="font-semibold text-cyan-300">60</span> us,{" "}
      <span className="font-semibold text-red-300">70</span> them. You&apos;re{" "}
      <span className="font-semibold text-amber-300">in the hole</span>, but{" "}
      <span className="font-bold text-cyan-300">
        the fight is still yours to take
      </span>
      .
    </p>
  </>
);

/** Step 3 (select-ship): narrative in-grid; orders under Orders. */
const TUTORIAL_SELECT_SHIP_GRID_BRIEF = (
  <>
    <p>
      Our <span className="font-semibold text-cyan-300">fleet</span>, or{" "}
      <span className="font-semibold text-amber-300">
        what&apos;s left of it
      </span>
      , is ready for your{" "}
      <span className="font-semibold text-yellow-300">inspection</span>.
    </p>
  </>
);

const TUTORIAL_SELECT_SHIP_GRID_TASKS: React.ReactNode[] = [
  <>Hover over your ships to view their stats and abilities.</>,
  <>
    Click on your ships to see their{" "}
    <span className="font-semibold text-green-400">movement</span>
    {" and "}
    <span className="font-semibold text-orange-400">threat range</span>.
  </>,
  <>
    Click a ship again to see its{" "}
    <span className="font-semibold text-orange-400">weapons range</span> from
    the current position.
  </>,
];

/** Step 4 (view-enemy): narrative in-grid; orders under Orders. */
const TUTORIAL_VIEW_ENEMY_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-red-300">enemy</span> holds the{" "}
      <span className="font-semibold text-amber-200">right side</span> of the
      map. Our sensors can show us their stats and abilities.
    </p>
  </>
);

const TUTORIAL_VIEW_ENEMY_GRID_TASKS: React.ReactNode[] = [
  <>Hover over enemy ships to view their stats and abilities.</>,
  <>
    Click on enemy ships to see their{" "}
    <span className="font-semibold text-green-400">movement</span>
    {" and "}
    <span className="font-semibold text-orange-400">threat range</span>.
  </>,
  <>
    Click an enemy ship again to see its{" "}
    <span className="font-semibold text-orange-400">weapons range</span> from
    the current position.
  </>,
];

/** Step 5 (move-ship): narrative in-grid; orders under Orders. */
const TUTORIAL_MOVE_SHIP_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-cyan-300">Tutorial Fighter</span>{" "}
      is damaged. You can protect it by moving it into a{" "}
      <span className="font-semibold text-purple-300">nebula</span>.
    </p>
    <p>
      Nebula tiles block line of sight. Inside a nebula, ships can only shoot or
      be shot by ships exactly{" "}
      <span className="font-semibold text-yellow-300">1 tile</span> away.
    </p>
  </>
);

const TUTORIAL_MOVE_SHIP_GRID_TASKS: React.ReactNode[] = [
  <>Select the Tutorial Fighter.</>,
  <>
    With it selected, click a highlighted tile to stage a move.{" "}
    <span className="font-semibold text-green-400">Green</span> tiles show{" "}
    <span className="font-semibold text-green-400">movement</span> range.
  </>,
  <>
    Confirm the move to the highlighted tile at row{" "}
    <span className="font-semibold text-yellow-300">6</span>, column{" "}
    <span className="font-semibold text-yellow-300">7</span> (
    <span className="font-semibold text-green-400">submit</span> when prompted).
  </>,
];

/** Step 6 (wait-for-opponent): narrative in-grid; orders under Orders. */
const TUTORIAL_WAIT_FOR_OPPONENT_GRID_BRIEF = (
  <>
    <p>
      After you move, both you and your opponent can still see the{" "}
      <span className="font-semibold text-yellow-300">previous position</span>{" "}
      of your ship on the map and in the Last Move display.
    </p>
    <p>
      This helps you track how ships moved during the turn so you can see what
      changed.
    </p>
  </>
);

const TUTORIAL_WAIT_FOR_OPPONENT_GRID_TASKS: React.ReactNode[] = [
  <>
    Your move is in. In a live match you wait on the opponent. Click{" "}
    <span className="font-semibold text-cyan-300">Next</span> to advance and see
    their response.
  </>,
];

/** Step 7 (score-points): narrative in-grid; orders under Orders. */
const TUTORIAL_SCORE_POINTS_GRID_BRIEF = (
  <>
    <p>
      At round end, each scoring zone you{" "}
      <span className="font-semibold text-cyan-300">control</span> with a
      functioning ship (not disabled) on the tile counts toward points.
    </p>
    <p>
      Their destroyer is already contesting a zone. Respond by moving the{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span> to
      capture one for us.
    </p>
  </>
);

const TUTORIAL_SCORE_POINTS_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan-300">Tutorial EMP</span>
    and move it to the highlighted central scoring tile.
  </>,
  <>
    Confirm the move to the highlighted central scoring tile at row{" "}
    <span className="font-semibold text-yellow-300">5</span>, column{" "}
    <span className="font-semibold text-yellow-300">8</span> (
    <span className="font-semibold text-green-400">submit</span> when prompted).
  </>,
];

/** Step 8 (shoot): narrative in-grid; orders under Orders. */
const TUTORIAL_SHOOT_GRID_BRIEF = (
  <>
    <p>
      Their <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
      just hit the{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span> with a
      plasma shot. Answer with the{" "}
      <span className="font-semibold text-cyan-300">Tutorial Sniper</span>: move
      into position, then shoot back.
    </p>
    <p>
      With a ship selected, click an enemy in range. The overlay shows weapon
      range. Ships can always shoot adjacent enemies (1 tile away).
    </p>
  </>
);

const TUTORIAL_SHOOT_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the{" "}
    <span className="font-semibold text-cyan-300">Tutorial Sniper</span> and
    stage a move to the highlighted tile at row{" "}
    <span className="font-semibold text-yellow-300">1</span>, column{" "}
    <span className="font-semibold text-yellow-300">3</span> (
    <span className="font-semibold text-green-400">green</span> shows movement
    range).
  </>,
  <>
    Click the <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
    to select your shot (it pulses after you stage the move).
  </>,
  <>
    <span className="font-semibold text-green-400">Submit</span> to confirm move
    and shot together.
  </>,
];

/** Step 9 (end-of-round): narrative in-grid; orders under Orders. */
const TUTORIAL_END_OF_ROUND_GRID_BRIEF = (
  <>
    <p>
      When <span className="font-semibold text-yellow-300">both sides</span>{" "}
      have finished moving every ship, the round ends.
    </p>
    <p>
      At the start of the next round, movement markers clear so each ship can
      move again.{" "}
      <span className="font-semibold text-cyan-300">First player</span> swaps:
      whoever went second last round leads this one.
    </p>
  </>
);

const TUTORIAL_END_OF_ROUND_GRID_TASKS: React.ReactNode[] = [
  <>
    The header shows whose turn it is. Here the opponent opens the new round.
    Click <span className="font-semibold text-cyan-300">Next</span> when you are
    ready.
  </>,
];

/** Step 10 (special-emp): narrative in-grid; orders under Orders. */
const TUTORIAL_SPECIAL_EMP_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-red-300">Heavy Enemy</span> just
      shot your{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
    </p>
    <p>
      We have a powerful gun, but we can&apos;t knock it out in one hit. Bypass
      its defenses with a special weapon instead!
    </p>
    <p>
      It already took{" "}
      <span className="font-semibold text-purple-300">reactor damage</span>{" "}
      earlier in the fight. We can bypass its defenses and kill it instantly
      with an <span className="font-semibold text-cyan-300">EMP</span>.
    </p>
  </>
);

const TUTORIAL_SPECIAL_EMP_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the <span className="font-semibold text-cyan-300">Tutorial EMP</span>
    and target the{" "}
    <span className="font-semibold text-red-300">Heavy Enemy</span>.
  </>,
  <>
    In the action bar, switch from{" "}
    <span className="font-semibold text-cyan-200">Plasma</span> to{" "}
    <span className="font-semibold text-cyan-200">Special</span>.
  </>,
  <>
    <span className="font-semibold text-green-400">Submit</span>, then approve
    the transaction.
  </>,
];

/** Step 11 (ship-destruction): narrative in-grid; orders under Orders. */
const TUTORIAL_SHIP_DESTRUCTION_GRID_BRIEF = (
  <>
    <p>
      Your EMP rammed the{" "}
      <span className="font-semibold text-red-300">Heavy Enemy</span>
      &apos;s reactor past{" "}
      <span className="font-semibold text-yellow-300">
        three overload points
      </span>
      . The stack detonates from the inside. One blinding flash, then the hull
      splits open and the ship is gone.
    </p>
    <p>
      No ship survives once its reactor reaches three overload points. The{" "}
      <span className="font-semibold text-cyan-300">owner</span> may recycle the
      NFT and take half the usual UTC recycle value. The player who{" "}
      <span className="font-semibold text-cyan-300">destroyed it</span> gets the
      matching half.
    </p>
  </>
);

const TUTORIAL_SHIP_DESTRUCTION_GRID_TASKS: React.ReactNode[] = [
  <>
    Click <span className="font-semibold text-cyan-300">Next</span> when you are
    ready.
  </>,
];

/** Step 12 (rescue): narrative in-grid; orders under Orders. */
const TUTORIAL_RESCUE_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-red-300">Enemy Sniper</span>{" "}
      disabled your{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span>. It has
      reactor damage, so one more hit and it&apos;s gone! Even worse, your
      repair ship is too far away to reach it in time.
    </p>
    <p>
      What matters the most to you? Save your ship and lose the game, or
      sacrifice for victory and win?
    </p>
  </>
);

const TUTORIAL_RESCUE_GRID_TASKS: React.ReactNode[] = [
  <>
    <span className="font-semibold text-cyan-300">Save your ship:</span> select
    the Tutorial EMP and{" "}
    <span className="font-semibold text-green-400">submit</span> Retreat to
    leave the map.
  </>,
  <>
    <span className="font-semibold text-cyan-300">Sacrifice for victory:</span>{" "}
    select the Tutorial Sniper, target the{" "}
    <span className="font-semibold text-red-300">Enemy Fighter</span>, then{" "}
    <span className="font-semibold text-green-400">submit</span> the shot.
  </>,
];

/** Step 13 (rescue-outcome-sniper): sacrifice branch, seize center with fighter. */
const TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_BRIEF = (
  <>
    <p>
      The last move shows the{" "}
      <span className="font-semibold text-red-300">Enemy Fighter</span>{" "}
      destroying your{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span>.
    </p>
    <p>
      You traded that ship for the ability to retake the center resource. That
      point is open now. Take it with the{" "}
      <span className="font-semibold text-cyan-300">Tutorial Fighter</span>.
    </p>
    <p>
      You may line up a shot on the Enemy Fighter before you commit the move.
    </p>
  </>
);

const TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_TASKS: React.ReactNode[] = [
  <>
    Select the{" "}
    <span className="font-semibold text-cyan-300">Tutorial Fighter</span> and
    stage a move to the highlighted tile at row{" "}
    <span className="font-semibold text-yellow-300">5</span>, column{" "}
    <span className="font-semibold text-yellow-300">8</span> (
    <span className="font-semibold text-green-400">green</span> shows movement
    range).
  </>,
  <>
    Optionally click the{" "}
    <span className="font-semibold text-red-300">Enemy Fighter</span> to stage a
    shot (it pulses after you stage the move).
  </>,
  <>
    <span className="font-semibold text-green-400">Submit</span> to confirm the
    move, with or without the shot.
  </>,
];

/** Step 13 (rescue-outcome-retreat): saved EMP; center open for Enemy Fighter. */
const TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_BRIEF = (
  <>
    <p>
      The <span className="font-semibold text-yellow-300">Last move</span> shows
      your <span className="font-semibold text-cyan-300">Tutorial EMP</span>{" "}
      retreating off the map. You spent your action to save the hull.
    </p>
    <p>
      The center scoring tile at row{" "}
      <span className="font-semibold text-yellow-300">5</span>, column{" "}
      <span className="font-semibold text-yellow-300">8</span> is undefended.
      The <span className="font-semibold text-red-300">Enemy Fighter</span> can
      step in next (it pulses on the map).
    </p>
    <p>You kept the ship, but you yielded initiative on that resource.</p>
  </>
);

const TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_TASKS: React.ReactNode[] = [
  <>
    Click <span className="font-semibold text-cyan-300">Next</span> when you are
    ready to see the opponent&apos;s response.
  </>,
];

/** Step 14 victory path (completion-sniper): debrief only; CTA lives in TutorialGridTaskPanel.primaryCta. */
const TUTORIAL_COMPLETION_SNIPER_GRID_BRIEF = (
  <>
    <p>
      <span className="font-semibold text-green-400">Victory.</span> The{" "}
      <span className="font-semibold text-yellow-300">Last move</span> on the
      map shows your{" "}
      <span className="font-semibold text-cyan-300">Tutorial Fighter</span> on
      the center resource at row{" "}
      <span className="font-semibold text-yellow-300">5</span>, column{" "}
      <span className="font-semibold text-yellow-300">8</span>, firing on the{" "}
      <span className="font-semibold text-red-300">Enemy Fighter</span>.
    </p>
    <p>
      You gave up the{" "}
      <span className="font-semibold text-cyan-300">Tutorial EMP</span> to earn
      that opening. Every match will ask you to judge trades like that one.
    </p>
  </>
);

const TUTORIAL_COMPLETION_SNIPER_PRIMARY_CTA_SUPPORTING = (
  <>
    You held the line in the sim. Claim{" "}
    <span className="font-semibold text-yellow-300">3 free ships</span>, fight
    real admirals, and put this win on your record.
  </>
);

/** Step 14 loss path (completion-retreat): mirrors victory slide; board shows enemy on center. */
const TUTORIAL_COMPLETION_RETREAT_GRID_BRIEF = (
  <>
    <p>
      <span className="font-semibold text-amber-400">Live to fight again.</span>{" "}
      The <span className="font-semibold text-yellow-300">Last move</span> on
      the map shows the{" "}
      <span className="font-semibold text-red-300">Enemy Fighter</span> on the
      center resource at row{" "}
      <span className="font-semibold text-yellow-300">5</span>, column{" "}
      <span className="font-semibold text-yellow-300">8</span>. They claimed it
      after your retreat.
    </p>
    <p>
      You lost this engagement, but you kept your most powerful ship. Every
      match asks you to weigh short-term map control against long-term fleet
      power.
    </p>
  </>
);

const TUTORIAL_COMPLETION_RETREAT_PRIMARY_CTA_SUPPORTING = (
  <>
    You banked power in the sim when it mattered.{" "}
    <span className="font-semibold text-cyan-300">Log in</span> to claim{" "}
    <span className="font-semibold text-yellow-300">3 free ships</span>, fight
    real admirals, and log this loss on your record.
  </>
);

type TutorialGridPanelConfig = {
  title: string;
  brief: React.ReactNode;
  tasks?: React.ReactNode[];
  tasksSectionLabel?: string;
  primaryCta?: {
    eyebrow: string;
    headline: string;
    supporting: React.ReactNode;
    buttonLabel: string;
    onClick: () => void;
  };
  /**
   * Max panel height as a fraction of the grid for branch finals
   * (see TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS). Used with `panelFitToContent`.
   */
  panelBottomRowExclusive?: number;
  /** Branch finals: size panel to content, capped by `panelBottomRowExclusive`. */
  panelFitToContent?: boolean;
};

function getTutorialGridPanelConfig(
  stepId: string,
): TutorialGridPanelConfig | null {
  switch (stepId) {
    case "welcome":
      return { title: "Welcome aboard", brief: TUTORIAL_WELCOME_GRID_BRIEF };
    case "goals":
      return { title: "How we win", brief: TUTORIAL_GOALS_GRID_BRIEF };
    case "select-ship":
      return {
        title: "Select a Ship",
        brief: TUTORIAL_SELECT_SHIP_GRID_BRIEF,
        tasks: TUTORIAL_SELECT_SHIP_GRID_TASKS,
      };
    case "view-enemy":
      return {
        title: "Inspect Enemy Ships",
        brief: TUTORIAL_VIEW_ENEMY_GRID_BRIEF,
        tasks: TUTORIAL_VIEW_ENEMY_GRID_TASKS,
      };
    case "move-ship":
      return {
        title: "Move Your Ship",
        brief: TUTORIAL_MOVE_SHIP_GRID_BRIEF,
        tasks: TUTORIAL_MOVE_SHIP_GRID_TASKS,
      };
    case "wait-for-opponent":
      return {
        title: "Previous Position",
        brief: TUTORIAL_WAIT_FOR_OPPONENT_GRID_BRIEF,
        tasks: TUTORIAL_WAIT_FOR_OPPONENT_GRID_TASKS,
      };
    case "score-points":
      return {
        title: "Scoring zones",
        brief: TUTORIAL_SCORE_POINTS_GRID_BRIEF,
        tasks: TUTORIAL_SCORE_POINTS_GRID_TASKS,
      };
    case "shoot":
      return {
        title: "Return fire",
        brief: TUTORIAL_SHOOT_GRID_BRIEF,
        tasks: TUTORIAL_SHOOT_GRID_TASKS,
      };
    case "end-of-round":
      return {
        title: "End of round",
        brief: TUTORIAL_END_OF_ROUND_GRID_BRIEF,
        tasks: TUTORIAL_END_OF_ROUND_GRID_TASKS,
      };
    case "special-emp":
      return {
        title: "EMP",
        brief: TUTORIAL_SPECIAL_EMP_GRID_BRIEF,
        tasks: TUTORIAL_SPECIAL_EMP_GRID_TASKS,
      };
    case "ship-destruction":
      return {
        title: "Aftermath",
        brief: TUTORIAL_SHIP_DESTRUCTION_GRID_BRIEF,
        tasks: TUTORIAL_SHIP_DESTRUCTION_GRID_TASKS,
      };
    case "rescue":
      return {
        title: "Hard choice",
        brief: TUTORIAL_RESCUE_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_GRID_TASKS,
        tasksSectionLabel: "Make your decision",
      };
    case "rescue-outcome-sniper":
      return {
        title: "Accepting a Sacrifice",
        brief: TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_OUTCOME_SNIPER_GRID_TASKS,
      };
    case "rescue-outcome-retreat":
      return {
        title: "Making Tough Decisions",
        brief: TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_BRIEF,
        tasks: TUTORIAL_RESCUE_OUTCOME_RETREAT_GRID_TASKS,
      };
    case "completion-retreat":
      return {
        title: "Planning Ahead",
        brief: TUTORIAL_COMPLETION_RETREAT_GRID_BRIEF,
        panelBottomRowExclusive: TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS,
        panelFitToContent: true,
      };
    case "completion-sniper":
      return {
        title: "Victory Achieved!",
        brief: TUTORIAL_COMPLETION_SNIPER_GRID_BRIEF,
        panelBottomRowExclusive: TUTORIAL_COMPLETION_ENDPOINT_PANEL_MAX_ROWS,
        panelFitToContent: true,
      };
    default:
      return null;
  }
}

export function SimulatedGameDisplay({
  tutorialContext,
  onBack,
}: SimulatedGameDisplayProps) {
  const {
    gameState,
    currentStep,
    currentStepIndex,
    displayStepNumber,
    displayTotalSteps,
    isVisibleLastStep,
    isStepComplete,
    validateAction,
    executeAction,
    isStepHydrated,
    isTransactionDialogOpen,
    nextStep,
    previousStep,
    resetTutorial,
  } = tutorialContext;

  // For display we follow the main game and keep the selected ship ID as bigint
  // (so GameGrid behavior and animations are identical). When we need to talk
  // to tutorial state, we convert to/from TutorialShipId (string) at the edges.
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special"
  >("weapon");
  const [actionOverride, setActionOverride] = useState<ActionType | null>(null);

  // Deselect all ships when moving between steps. Use layout effect so that
  // selection and previews are cleared before the new step is painted, which
  // avoids a single-frame flicker of the previous step's selection state.
  useLayoutEffect(() => {
    setSelectedShipId(null);
    setPreviewPosition(null);
    setTargetShipId(null);
    setSelectedWeaponType("weapon");
    setActionOverride(null);
  }, [currentStepIndex]);
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] =
    useState(true);
  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const chromeLayout = useGameViewChromeLayout(
    gameViewRootRef,
    gridContainerRef,
  );
  const chromeOnSide = chromeLayout === "side";

  const proposedMoveTargetListClass = chromeOnSide
    ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
    : "flex flex-wrap gap-2 min-h-[5rem]";
  const proposedMoveTargetBtnClass = chromeOnSide
    ? "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex w-full shrink-0 items-center justify-center"
    : "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex items-center shrink-0";

  React.useEffect(() => {
    if (actionOverride !== ActionType.Retreat) return;
    if (targetShipId !== null || previewPosition !== null) {
      setActionOverride(null);
    }
  }, [actionOverride, targetShipId, previewPosition]);

  // Mirror live game: whose turn it is comes from simulated state (e.g. after
  // end of round, opponent may go first).
  const isMyTurn =
    gameState.turnState.currentTurn.toLowerCase() ===
    TUTORIAL_PLAYER_ADDRESS.toLowerCase();

  // Map of on-chain ship ID (bigint) to ship object. Tutorial IDs are strings;
  // when we need a ship we convert TutorialShipId -> bigint for this map only.
  const shipMap = useMemo(() => {
    return new Map<bigint, Ship>(
      ALL_TUTORIAL_SHIPS.map((ship) => [ship.id, ship]),
    );
  }, []);

  // Create grids from default map (same format as real game map grids)
  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMemo(
    () =>
      buildMapGridsFromDefaultMap(
        defaultMap as DefaultMapShape,
        GRID_WIDTH,
        GRID_HEIGHT,
      ),
    [],
  );

  // Get ship attributes by ship ID from game state (tutorial IDs are strings)
  const getShipAttributes = useCallback(
    (shipId: TutorialShipId | bigint): Attributes | null => {
      const idString = typeof shipId === "bigint" ? shipId.toString() : shipId;
      const shipIndex = gameState.shipIds?.findIndex((id) => id === idString);
      if (
        shipIndex === -1 ||
        !gameState.shipAttributes ||
        !gameState.shipAttributes[shipIndex]
      ) {
        return null;
      }
      return gameState.shipAttributes[shipIndex];
    },
    [gameState.shipAttributes, gameState.shipIds],
  );

  const allShipPositionsForGrid = useMemo(
    () =>
      gameState.shipPositions.map((shipPosition) => ({
        shipId: BigInt(shipPosition.shipId),
        position: shipPosition.position,
        isCreator: shipPosition.isCreator,
        isPreview: shipPosition.isPreview,
        status: shipPosition.status,
      })),
    [gameState.shipPositions],
  );

  const aliveShipPositions = useMemo(
    () =>
      gameState.shipPositions.filter(
        (shipPosition) => (shipPosition.status ?? 0) === 0,
      ),
    [gameState.shipPositions],
  );

  // Canonical lastMove when the live gameState might not match the scripted step.
  // destroy-disabled: a bad persisted snapshot can omit lastMove; fall back.
  const tutorialDisplayLastMove = useMemo(() => {
    if (currentStep?.id === "ship-destruction") {
      return (
        getScriptedStateForTutorialStepId("ship-destruction")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "rescue") {
      return (
        getScriptedStateForTutorialStepId("rescue")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "destroy-disabled" && !gameState.lastMove) {
      return (
        getScriptedStateForTutorialStepId("destroy-disabled")?.lastMove ??
        gameState.lastMove
      );
    }
    return gameState.lastMove;
  }, [currentStep?.id, gameState.lastMove]);

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Check if a ship belongs to the tutorial player. GameGrid passes bigint IDs,
  // so this matches the main game's signature and uses the bigint-based map.
  const isShipOwnedByCurrentPlayer = useCallback(
    (shipId: bigint): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : false;
    },
    [shipMap],
  );

  // Build a set of shipIds that have already moved this round (string IDs)
  const movedShipIdsSet = useMemo(() => {
    const set = new Set<TutorialShipId>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(id));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(id));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  // Track when we should show the proposed move / top action UI, mirroring the
  // main game's behavior: it appears as soon as you select one of your ships
  // that can act this round, even before choosing a destination.
  const isShowingProposedMove = useMemo(() => {
    if (selectedShipId === null || !isMyTurn) {
      return false;
    }
    const idString = selectedShipId.toString() as TutorialShipId;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;
    if (movedShipIdsSet.has(idString)) {
      const attrs = getShipAttributes(idString);
      const isDisabled = attrs && attrs.hullPoints === 0;
      if (!isDisabled) return false;
    }
    return true;
  }, [
    selectedShipId,
    isMyTurn,
    isShipOwnedByCurrentPlayer,
    movedShipIdsSet,
    getShipAttributes,
  ]);

  const isSelectedShipDisabled = useMemo(() => {
    if (!selectedShipId) return false;
    const attrs = getShipAttributes(selectedShipId);
    return !!attrs && attrs.hullPoints === 0;
  }, [selectedShipId, getShipAttributes]);

  /**
   * Pulse the Submit Move / Submit Retreat button (same idea as tutorial highlight)
   * when a tx step is ready to confirm: staged inputs present, dialog not open.
   */
  const shouldPulseSubmitMoveButton = useMemo(() => {
    if (
      !currentStep?.requiresTransaction ||
      !isShowingProposedMove ||
      isTransactionDialogOpen
    ) {
      return false;
    }

    const stepId = currentStep.id;

    if (stepId === "special-emp") {
      const allowed =
        currentStep.allowedActions.useSpecial?.allowedTargets ?? [];
      return (
        selectedWeaponType === "special" &&
        targetShipId !== null &&
        allowed.includes(targetShipId.toString() as TutorialShipId)
      );
    }

    if (stepId === "shoot") {
      return previewPosition !== null && targetShipId !== null;
    }

    if (stepId === "rescue-outcome-sniper") {
      return (
        previewPosition !== null &&
        previewPosition.row === 5 &&
        previewPosition.col === 8
      );
    }

    if (stepId === "rescue") {
      if (!selectedShipId) return false;
      const sid = selectedShipId.toString() as TutorialShipId;
      if (sid === "1001") {
        return isSelectedShipDisabled;
      }
      if (sid === "1002") {
        return targetShipId !== null;
      }
      return false;
    }

    return previewPosition !== null;
  }, [
    currentStep,
    isShowingProposedMove,
    isTransactionDialogOpen,
    previewPosition,
    targetShipId,
    selectedWeaponType,
    selectedShipId,
    isSelectedShipDisabled,
  ]);

  /** special-emp: after Heavy is targeted under Weapons, pulse the weapon/special dropdown. */
  const shouldHighlightSpecialEmpWeaponDropdown = useMemo(
    () =>
      currentStep?.id === "special-emp" &&
      selectedShipId?.toString() === "1001" &&
      selectedWeaponType === "weapon" &&
      targetShipId?.toString() === "2002",
    [currentStep?.id, selectedShipId, selectedWeaponType, targetShipId],
  );

  const isCellOccupiedByAliveShip = useCallback(
    (row: number, col: number) =>
      gameState.shipPositions.some(
        (pos) =>
          (pos.status ?? 0) === 0 &&
          pos.position.row === row &&
          pos.position.col === col,
      ),
    [gameState.shipPositions],
  );

  // Mirror live-game retreat prep visual: when a disabled ship is selected on
  // the player's turn, show the in-cell retreat effect (flip + engine glow).
  const retreatPrepShipId = useMemo(() => {
    if (!isMyTurn || !selectedShipId || !isSelectedShipDisabled) return null;
    return selectedShipId;
  }, [isMyTurn, selectedShipId, isSelectedShipDisabled]);

  const retreatPrepIsCreator = useMemo(() => {
    if (retreatPrepShipId == null) return null;
    const ship = shipMap.get(retreatPrepShipId);
    return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : null;
  }, [retreatPrepShipId, shipMap]);

  // Match live-game behavior: selecting a disabled ship enters retreat-only mode.
  useEffect(() => {
    if (!selectedShipId || !isSelectedShipDisabled) return;
    setTargetShipId(null);
    setPreviewPosition(null);
    setSelectedWeaponType("weapon");
  }, [selectedShipId, isSelectedShipDisabled]);

  // Check line of sight between two positions
  const hasLineOfSight = useCallback(
    (
      row0: number,
      col0: number,
      row1: number,
      col1: number,
      blockedGrid: boolean[][],
    ): boolean => {
      if (blockedGrid[row0] && blockedGrid[row0][col0]) {
        return false;
      }
      if (blockedGrid[row1] && blockedGrid[row1][col1]) {
        return false;
      }

      const dx = Math.abs(col1 - col0);
      const dy = Math.abs(row1 - row0);
      const sx = col0 < col1 ? 1 : -1;
      const sy = row0 < row1 ? 1 : -1;
      let err = dx - dy;

      let x = col0;
      let y = row0;

      while (true) {
        if (x === col1 && y === row1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }

        if (
          (x !== col0 || y !== row0) &&
          (x !== col1 || y !== row1) &&
          blockedGrid[y] &&
          blockedGrid[y][x]
        ) {
          return false;
        }
      }

      return true;
    },
    [],
  );

  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid. Convert tutorial string IDs into the
    // bigint-based ShipPosition shape expected by GameGrid, but keep
    // the original tutorial IDs in gameState.
    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;
      const shipIdBigInt = BigInt(shipPosition.shipId);
      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        const basePosition: ShipPosition = {
          shipId: shipIdBigInt,
          position,
          isCreator: shipPosition.isCreator,
          isPreview: shipPosition.isPreview,
          status: shipPosition.status,
        };
        newGrid[position.row][position.col] = basePosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipIdBigInt && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...basePosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    // Last move UI: show ghost at old position when no ship is selected (same as in-game)
    const canShowLastMove =
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.shipId !== undefined;
    if (canShowLastMove && tutorialDisplayLastMove) {
      const lm = tutorialDisplayLastMove;
      const oldPos = { row: lm.oldRow, col: lm.oldCol };
      const newPos = { row: lm.newRow, col: lm.newCol };
      if (
        (oldPos.row !== newPos.row || oldPos.col !== newPos.col) &&
        oldPos.row >= 0 &&
        oldPos.row < GRID_HEIGHT &&
        oldPos.col >= 0 &&
        oldPos.col < GRID_WIDTH &&
        !newGrid[oldPos.row][oldPos.col]
      ) {
        const lastMoveShipPosition = aliveShipPositions.find(
          (pos) => pos.shipId === lm.shipId,
        );
        if (lastMoveShipPosition) {
          newGrid[oldPos.row][oldPos.col] = {
            shipId: BigInt(lm.shipId),
            position: oldPos,
            isCreator: lastMoveShipPosition.isCreator,
            isPreview: true,
            status: lastMoveShipPosition.status,
          };
        }
      }

      const lmAction = Number(lm.actionType);
      const isTargetingLastMove =
        lmAction === ActionType.Shoot || lmAction === ActionType.Special;
      if (isTargetingLastMove && lm.targetShipId && lm.targetShipId !== "0") {
        let destroyedTargetShipPosition = gameState.shipPositions.find(
          (shipPosition) =>
            shipPosition.shipId === lm.targetShipId &&
            shipPosition.status === 1,
        );
        // Stale/persisted gameState can omit status on the Heavy; canonical
        // scripted positions still place the destroyed target so EMP can resolve.
        if (
          !destroyedTargetShipPosition &&
          currentStep?.id === "ship-destruction"
        ) {
          const scripted =
            getScriptedStateForTutorialStepId("ship-destruction");
          destroyedTargetShipPosition = scripted?.shipPositions.find(
            (p) => p.shipId === lm.targetShipId,
          );
        }
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (
            row >= 0 &&
            row < GRID_HEIGHT &&
            col >= 0 &&
            col < GRID_WIDTH &&
            !newGrid[row][col]
          ) {
            newGrid[row][col] = {
              shipId: BigInt(destroyedTargetShipPosition.shipId),
              position: destroyedTargetShipPosition.position,
              isCreator: destroyedTargetShipPosition.isCreator,
              isPreview: destroyedTargetShipPosition.isPreview,
              status: destroyedTargetShipPosition.status,
            };
          }
        }
      }
    }

    return newGrid;
  }, [
    aliveShipPositions,
    gameState.shipPositions,
    tutorialDisplayLastMove,
    selectedShipId,
    previewPosition,
    currentStep?.id,
  ]);

  // Calculate movement range for selected ship.
  // Mirrors the main GameDisplay logic, then applies tutorial step constraints.
  const movementRange = useMemo(() => {
    if (!selectedShipId) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) cannot move; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRangeValue = attributes?.movement || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    // If ship has a preview position (including "stay in place"), don't show movement
    // range so only weapon range is shown (same behavior as main game UI).
    if (previewPosition) {
      return [];
    }

    const baseMoves: { row: number; col: number }[] = [];
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // Check all positions within movement range
    for (
      let row = Math.max(0, startRow - movementRangeValue);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRangeValue);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRangeValue);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRangeValue);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance <= movementRangeValue && distance > 0) {
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            baseMoves.push({ row, col });
          }
        }
      }
    }

    // For display purposes, always show the full movement range (like the main game).
    // Tutorial constraints are enforced separately via validateAction/executeAction.
    return baseMoves;
  }, [
    selectedShipId,
    gameState.shipPositions,
    shipMap,
    getShipAttributes,
    previewPosition,
  ]);

  // Highlighted cell: last move new position (when showing last move) or step 5 allowed move target
  const highlightedMovePosition = useMemo(() => {
    // When showing last move (no ship selected), highlight the new position (same as in-game)
    if (
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.actionType !== ActionType.Retreat &&
      tutorialDisplayLastMove.newRow >= 0 &&
      tutorialDisplayLastMove.newCol >= 0
    ) {
      return {
        row: tutorialDisplayLastMove.newRow,
        col: tutorialDisplayLastMove.newCol,
      };
    }
    // Step 13 retreat branch: center scoring tile is open (no player ship to select).
    if (
      currentStep?.id === "rescue-outcome-retreat" &&
      selectedShipId === null
    ) {
      return { row: 5, col: 8 };
    }
    // Step 5 / 7 / 8: highlight the allowed move target
    if (
      (currentStep?.id === "move-ship" ||
        currentStep?.id === "score-points" ||
        currentStep?.id === "shoot" ||
        currentStep?.id === "rescue-outcome-sniper") &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId &&
      selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
    ) {
      const allowedPositions =
        currentStep.allowedActions.moveShip.allowedPositions;
      if (allowedPositions.length > 0) {
        return allowedPositions[0];
      }
    }
    return null;
  }, [currentStep, selectedShipId, tutorialDisplayLastMove]);

  /**
   * Grid positions for the tutorial highlight (yellow pulse): step 3 on player
   * fleet until a ship is selected; step 4 on enemy fleet until an enemy ship is selected;
   * step 5 on the Tutorial Fighter until a ship is selected; step 7 on the Tutorial EMP
   * until a ship is selected; step 8 on the Tutorial Sniper until a ship is selected,
   * then on the Enemy Fighter after the Sniper move is staged until a target is chosen;
   * step 10 (special-emp): Tutorial EMP until selected; then Heavy Enemy while Tutorial EMP
   * is on Weapons until Heavy is targeted; then weapon/special dropdown pulses instead; after
   * switching to Special, Heavy again if no target (target usually carries over from Weapons);
   * step 12 (rescue): Tutorial EMP and Tutorial Sniper both pulse for the whole step; Enemy Fighter
   * is added while Tutorial Sniper is selected and no shot target is chosen yet;
   * step 13 (rescue-outcome-sniper): Tutorial Fighter until selected; Enemy Fighter after center move
   * is staged until a target is chosen (optional shot);
   * step 13 (rescue-outcome-retreat): Enemy Fighter pulses (can take the open center).
   */
  const tutorialHighlightCells = useMemo(() => {
    const stepId = currentStep?.id;
    const positions = gameState.shipPositions;

    const cellsForIds = (ids: readonly bigint[]) => {
      const cells: { row: number; col: number }[] = [];
      for (const shipId of ids) {
        const idStr = shipId.toString() as TutorialShipId;
        const sp = positions.find((p) => p.shipId === idStr);
        if (sp) {
          cells.push({ row: sp.position.row, col: sp.position.col });
        }
      }
      return cells.length > 0 ? cells : undefined;
    };

    if (stepId === "select-ship") {
      if (selectedShipId !== null) return undefined;
      return cellsForIds(TUTORIAL_SELECT_SHIP_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "view-enemy") {
      if (
        selectedShipId !== null &&
        isTutorialEnemyFleetShipId(selectedShipId)
      ) {
        return undefined;
      }
      return cellsForIds(TUTORIAL_VIEW_ENEMY_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "move-ship") {
      if (selectedShipId !== null) return undefined;
      return cellsForIds(TUTORIAL_MOVE_SHIP_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "score-points") {
      if (selectedShipId !== null) return undefined;
      return cellsForIds(TUTORIAL_SCORE_POINTS_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "shoot") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_SHOOT_HIGHLIGHT_SHIP_IDS);
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      const stagedMoveOk =
        previewPosition !== null &&
        moveCfg !== undefined &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.some(
          (p) => p.row === previewPosition.row && p.col === previewPosition.col,
        );
      if (
        stagedMoveOk &&
        targetShipId === null &&
        selectedShipId.toString() === moveCfg.shipId
      ) {
        return cellsForIds(TUTORIAL_SHOOT_HIGHLIGHT_ENEMY_SHIP_IDS);
      }
      return undefined;
    }

    if (stepId === "special-emp") {
      if (selectedShipId === null) {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_SHIP_IDS);
      }
      if (selectedShipId.toString() !== "1001") {
        return undefined;
      }
      // Weapons + Heavy targeted: dropdown highlight only (no grid pulse).
      if (
        selectedWeaponType === "weapon" &&
        targetShipId?.toString() === "2002"
      ) {
        return undefined;
      }
      // Weapons, not yet targeting Heavy: pulse Heavy so they open with the gun first.
      if (selectedWeaponType === "weapon") {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS);
      }
      // Special armed, no target yet: pulse Heavy for EMP targeting.
      if (selectedWeaponType === "special" && targetShipId === null) {
        return cellsForIds(TUTORIAL_SPECIAL_EMP_HIGHLIGHT_TARGET_SHIP_IDS);
      }
      return undefined;
    }

    if (stepId === "rescue") {
      const playerCells =
        cellsForIds(TUTORIAL_RESCUE_CHOICE_HIGHLIGHT_SHIP_IDS) ?? [];
      const enemyCells =
        selectedShipId?.toString() === "1002" && targetShipId === null
          ? (cellsForIds(TUTORIAL_RESCUE_SNIPER_TARGET_HIGHLIGHT_SHIP_IDS) ??
            [])
          : [];
      const seen = new Set<string>();
      const merged: { row: number; col: number }[] = [];
      for (const c of [...playerCells, ...enemyCells]) {
        const key = `${c.row},${c.col}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(c);
        }
      }
      return merged.length > 0 ? merged : undefined;
    }

    if (stepId === "rescue-outcome-retreat") {
      return cellsForIds(TUTORIAL_RESCUE_OUTCOME_RETREAT_HIGHLIGHT_SHIP_IDS);
    }

    if (stepId === "rescue-outcome-sniper") {
      if (selectedShipId === null) {
        return cellsForIds(
          TUTORIAL_RESCUE_OUTCOME_SNIPER_FIGHTER_HIGHLIGHT_SHIP_IDS,
        );
      }
      const moveCfg = currentStep?.allowedActions.moveShip;
      const stagedMoveOk =
        previewPosition !== null &&
        moveCfg !== undefined &&
        selectedShipId.toString() === moveCfg.shipId &&
        moveCfg.allowedPositions.some(
          (p) => p.row === previewPosition.row && p.col === previewPosition.col,
        );
      if (
        stagedMoveOk &&
        targetShipId === null &&
        selectedShipId.toString() === moveCfg.shipId
      ) {
        return cellsForIds(
          TUTORIAL_RESCUE_OUTCOME_SNIPER_ENEMY_HIGHLIGHT_SHIP_IDS,
        );
      }
      return undefined;
    }

    return undefined;
  }, [
    currentStep,
    selectedShipId,
    previewPosition,
    targetShipId,
    selectedWeaponType,
    gameState.shipPositions,
  ]);

  // Last move UI props for GameGrid (same as in-game: ghost at old position, pulse at new)
  const lastMoveProps = useMemo(() => {
    // Match live-game behavior: while a ship is selected, prioritize proposal UI
    // and do not feed prior last-move markers into GameGrid.
    // Ship-destruction step must still pass last move (including target id) so
    // GameGrid can render the destroyed-target overlay like the live game
    // (isLastMoveDestroyedTargetCell + ship-destroyed.png).
    // Keep last-move replay (EMP wave, outlines) visible while a ship is
    // selected on steps that are cinematic or require selection for the next action.
    const lastMoveVisibleWithSelection =
      currentStep?.id === "ship-destruction" ||
      currentStep?.id === "destroy-disabled" ||
      currentStep?.id === "rescue";
    const suppressLastMoveBecauseSelection =
      selectedShipId !== null && !lastMoveVisibleWithSelection;
    if (!tutorialDisplayLastMove || suppressLastMoveBecauseSelection) {
      return {
        lastMoveShipId: null as bigint | null,
        lastMoveOldPosition: null as { row: number; col: number } | null,
        lastMoveNewPosition: null as { row: number; col: number } | null,
        lastMoveActionType: null as ActionType | null,
        lastMoveTargetShipId: null as bigint | null,
        lastMoveIsCurrentPlayer: undefined as boolean | undefined,
      };
    }
    const lm = tutorialDisplayLastMove;
    const ship = shipMap.get(BigInt(lm.shipId));
    const lmAction = Number(lm.actionType);
    return {
      lastMoveShipId: BigInt(lm.shipId),
      lastMoveOldPosition: { row: lm.oldRow, col: lm.oldCol },
      lastMoveNewPosition: { row: lm.newRow, col: lm.newCol },
      // Coerce so GameGrid strict checks (e.g. EMP) match after JSON or mixed types
      lastMoveActionType: lmAction as ActionType,
      lastMoveTargetShipId:
        (lmAction === ActionType.Shoot || lmAction === ActionType.Special) &&
        lm.targetShipId &&
        lm.targetShipId !== "0"
          ? BigInt(lm.targetShipId)
          : null,
      lastMoveIsCurrentPlayer: ship
        ? ship.owner === TUTORIAL_PLAYER_ADDRESS
        : undefined,
    };
  }, [tutorialDisplayLastMove, selectedShipId, shipMap, currentStep?.id]);

  // Last move object for GameEvents panel (adapt tutorial lastMove to on-chain LastMove shape).
  // When a move is staged (selected ship + preview position), we synthesize a
  // pending LastMove so the UI shows from/to immediately after selecting the move,
  // before the simulated transaction is submitted.
  const lastMoveForEvents: LastMove | undefined = useMemo(() => {
    if (
      selectedShipId &&
      previewPosition &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
    ) {
      const currentPos = gameState.shipPositions.find(
        (pos) => pos.shipId === selectedShipId.toString(),
      );

      if (currentPos) {
        return {
          shipId: selectedShipId,
          oldRow: currentPos.position.row,
          oldCol: currentPos.position.col,
          newRow: previewPosition.row,
          newCol: previewPosition.col,
          actionType: ActionType.Pass,
          targetShipId: 0n,
          timestamp: 0n,
        };
      }
    }

    if (!tutorialDisplayLastMove) return undefined;
    const lm = tutorialDisplayLastMove;
    return {
      shipId: BigInt(lm.shipId),
      oldRow: lm.oldRow,
      oldCol: lm.oldCol,
      newRow: lm.newRow,
      newCol: lm.newCol,
      actionType: Number(lm.actionType) as ActionType,
      targetShipId: lm.targetShipId ? BigInt(lm.targetShipId) : 0n,
      timestamp: 0n,
    };
  }, [
    selectedShipId,
    previewPosition,
    tutorialDisplayLastMove,
    gameState.shipPositions,
    currentStep,
  ]);

  // Calculate damage for a target ship
  const calculateDamage = useCallback(
    (
      targetShipId: bigint,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
    ) => {
      if (!selectedShipId)
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      const shooterAttributes = getShipAttributes(selectedShipId);
      const targetAttributes = getShipAttributes(targetShipId);

      if (!shooterAttributes || !targetAttributes)
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      // Handle ships with 0 hull points - they get reactor critical timer increment
      if (targetAttributes.hullPoints === 0) {
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      const currentWeaponType = weaponType || selectedWeaponType;
      let baseDamage: number;

      // EMP special applies reactor damage (previewed as +1 reactor level).
      if (currentWeaponType === "special" && specialType === 1) {
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      if (currentWeaponType === "special") {
        baseDamage =
          (specialData as SpecialData)?.strength || shooterAttributes.gunDamage;
      } else {
        baseDamage = shooterAttributes.gunDamage;
      }

      const reduction = targetAttributes.damageReduction;
      let reducedDamage: number;

      if (currentWeaponType === "special" && !showReducedDamage) {
        reducedDamage = baseDamage;
      } else {
        reducedDamage = Math.max(
          0,
          baseDamage - Math.floor((baseDamage * reduction) / 100),
        );
      }

      const willKill = reducedDamage >= targetAttributes.hullPoints;

      return { reducedDamage, willKill, reactorCritical: false };
    },
    [
      selectedShipId,
      getShipAttributes,
      selectedWeaponType,
      specialData,
      specialType,
    ],
  );

  // Get valid targets
  // Show full range for viewing, but filter by tutorial constraints if step requires specific targets
  const validTargets = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    // Match live game: disabled ships are retreat-only, no targeting UI.
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    // Get allowed targets from tutorial step (if step has specific constraints)
    let allowedTargets: TutorialShipId[] | null = null;
    if (
      currentStep?.allowedActions.shoot &&
      currentStep.allowedActions.shoot.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.shoot.allowedTargets;
    } else if (
      currentStep?.allowedActions.useSpecial &&
      currentStep.allowedActions.useSpecial.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.useSpecial.allowedTargets;
    } else if (
      currentStep?.allowedActions.assist &&
      currentStep.allowedActions.assist.shipId === selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.assist.allowedTargets;
    }

    const allowedTargetsSet = allowedTargets ? new Set(allowedTargets) : null;

    const attributes = getShipAttributes(selectedShipId);
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const targets: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      // If step has constraints, only include allowed targets
      // Otherwise, show all valid targets (for viewing)
      if (allowedTargetsSet && !allowedTargetsSet.has(shipPosition.shipId)) {
        return;
      }

      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      // Filter targets based on weapon type
      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId.toString()) return;
        } else if (specialType === 1) {
          if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
        } else {
          if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
        }
      } else {
        if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      const canShoot = distance === 1 || distance <= shootingRange;

      // In the shoot step, always include allowed targets so clicking the enemy
      // adds them as target (grid uses validTargets and only then calls
      // setTargetShipId; otherwise it would select the ship and clear the proposed move).
      const isShootStepAllowedTarget =
        currentStep?.id === "shoot" &&
        allowedTargetsSet?.has(shipPosition.shipId) &&
        distance > 0;

      if ((canShoot && distance > 0) || isShootStepAllowedTarget) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
          isShootStepAllowedTarget ||
          !shouldCheckLineOfSight ||
          hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
        ) {
          targets.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return targets;
  }, [
    selectedShipId,
    currentStep,
    previewPosition,
    shipMap,
    getShipAttributes,
    hasLineOfSight,
    blockedGrid,
    gameState.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Get assistable targets
  const assistableTargets = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [
    selectedShipId,
    previewPosition,
    shipMap,
    gameState.shipPositions,
    getShipAttributes,
  ]);

  const assistableTargetsFromStart = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [selectedShipId, shipMap, gameState.shipPositions, getShipAttributes]);

  // Calculate shooting range positions (exact same logic as GameDisplay)
  const shootingRange = useMemo(() => {
    if (!selectedShipId) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) have no move or threat range; only retreat/assist are relevant
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRange = attributes?.movement || 1;
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];
    const validShootingPositions: { row: number; col: number }[] = [];

    if (previewPosition) {
      // When a move is entered (including \"stay in place\"), show gun range
      // from that single origin only (same as main game behavior).
      const startRow = previewPosition.row;
      const startCol = previewPosition.col;

      // First, add all positions that are exactly 1 square away from preview position
      // (ships can always shoot adjacent enemies, even in nebula)
      for (
        let row = Math.max(0, startRow - 1);
        row <= Math.min(GRID_HEIGHT - 1, startRow + 1);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - 1);
          col <= Math.min(GRID_WIDTH - 1, startCol + 1);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only add positions that are exactly 1 square away and not occupied
          if (distance === 1) {
            const isOccupied = isCellOccupiedByAliveShip(row, col);

            if (!isOccupied) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }

      // Then check all positions within shooting range from preview position
      for (
        let row = Math.max(0, startRow - shootingRange);
        row <= Math.min(GRID_HEIGHT - 1, startRow + shootingRange);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - shootingRange);
          col <= Math.min(GRID_WIDTH - 1, startCol + shootingRange);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only check positions within shooting range, excluding adjacent ones (already added above)
          if (distance <= shootingRange && distance > 1) {
            // Check if position is not occupied by another ship
            const isOccupied = isCellOccupiedByAliveShip(row, col);

            if (!isOccupied) {
              // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
              // OR special abilities ignore nebula squares
              // OR regular weapons need line of sight
              const shouldCheckLineOfSight =
                distance > 1 && // Not adjacent
                (selectedWeaponType !== "special" ||
                  (specialType !== 1 &&
                    specialType !== 2 &&
                    specialType !== 3)); // Not EMP, Repair, or Flak

              if (
                !shouldCheckLineOfSight ||
                hasLineOfSight(startRow, startCol, row, col, blockedGrid)
              ) {
                validShootingPositions.push({ row, col });
              }
            }
          }
        }
      }

      return validShootingPositions;
    }

    // Original logic for showing shooting range from all possible move positions
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // First, add all positions that are exactly 1 square away from any valid move position
    // (ships can always shoot adjacent enemies, even in nebula)
    for (
      let row = Math.max(0, startRow - movementRange - 1);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRange + 1);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRange - 1);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRange + 1);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Only check positions that are exactly 1 square away from any valid move position
        if (distance === movementRange + 1) {
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            // Check if this position is exactly 1 square away from any valid move position
            let isAdjacentToMovePosition = false;

            // Check all possible move positions
            for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = isCellOccupiedByAliveShip(
                    moveRow,
                    moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this position is exactly 1 square away from this move position
                    const adjacentDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);
                    if (adjacentDistance === 1) {
                      isAdjacentToMovePosition = true;
                      break;
                    }
                  }
                }
              }
              if (isAdjacentToMovePosition) break;
            }

            if (isAdjacentToMovePosition) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    // Then check all positions within movement + shooting range
    const totalRange = movementRange + shootingRange;
    for (
      let row = Math.max(0, startRow - totalRange);
      row <= Math.min(GRID_HEIGHT - 1, startRow + totalRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - totalRange);
        col <= Math.min(GRID_WIDTH - 1, startCol + totalRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Position must be within movement + shooting range, but not within just movement range
        // (movement range positions are already highlighted as movement tiles)
        // Also exclude positions that are exactly 1 square away (already added above)
        if (
          distance > movementRange &&
          distance <= totalRange &&
          distance !== 1
        ) {
          // Check if position is not occupied by another ship
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            // Check if any valid move position can shoot to this target position
            // We need to check if there's a valid move position that has line of sight to this target
            let canShootFromSomewhere = false;

            // Check all possible move positions
            for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = isCellOccupiedByAliveShip(
                    moveRow,
                    moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this move position can shoot to the target
                    const shootDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);

                    // Ships can always shoot enemies that are exactly 1 square away
                    // OR within their normal shooting range
                    const canShoot =
                      shootDistance === 1 || shootDistance <= shootingRange;

                    if (canShoot) {
                      // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
                      // OR special abilities ignore nebula squares
                      // OR regular weapons need line of sight
                      const shouldCheckLineOfSight =
                        shootDistance > 1 && // Not adjacent
                        (selectedWeaponType !== "special" ||
                          (specialType !== 1 &&
                            specialType !== 2 &&
                            specialType !== 3)); // Not EMP, Repair, or Flak

                      if (
                        !shouldCheckLineOfSight ||
                        hasLineOfSight(moveRow, moveCol, row, col, blockedGrid)
                      ) {
                        canShootFromSomewhere = true;
                        break;
                      }
                    }
                  }
                }
              }
              if (canShootFromSomewhere) break;
            }

            if (canShootFromSomewhere) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }, [
    selectedShipId,
    previewPosition,
    shipMap,
    getShipAttributes,
    hasLineOfSight,
    blockedGrid,
    gameState.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Drag shooting range and valid targets (simplified for tutorial)
  const dragShootingRange = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  const dragValidTargets = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  // Convert tutorial string ids to bigint ids for GameGrid targeting logic.
  const gridValidTargets = useMemo(
    () =>
      validTargets.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [validTargets],
  );

  const gridAssistableTargets = useMemo(
    () =>
      assistableTargets.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [assistableTargets],
  );

  const gridAssistableTargetsFromStart = useMemo(
    () =>
      assistableTargetsFromStart.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [assistableTargetsFromStart],
  );

  // GameGrid expects Set<bigint> for movedShipIdsSet; tutorial state uses string IDs.
  const gridMovedShipIdsSet = useMemo(() => {
    const set = new Set<bigint>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(BigInt(id)));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(BigInt(id)));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  const wrappedSetSelectedShipId = useCallback(
    (shipId: bigint | null) => {
      if (shipId === null) {
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        return;
      }

      // In the shooting tutorial step, if the Tutorial Sniper is already selected
      // and the user clicks the enemy fighter, always treat that click as
      // targeting the enemy for the staged move+shoot, not as a selection
      // change. This prevents the proposed move from being cleared.
      if (
        currentStep?.id === "shoot" &&
        selectedShipId !== null &&
        shipId !== selectedShipId
      ) {
        const idString = shipId.toString() as TutorialShipId;
        if (
          currentStep.allowedActions.shoot &&
          currentStep.allowedActions.shoot.allowedTargets.includes(idString)
        ) {
          setTargetShipId(shipId);
          return;
        }
      }

      const idString = shipId.toString() as TutorialShipId;

      // Validate ship selection
      const validation = validateAction({
        type: "selectShip",
        shipId: idString,
      });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      // When changing selection to a different ship, clear any existing preview so
      // the new selection starts in the movement + threat state (same as main game).
      setSelectedShipId(shipId);
      setPreviewPosition(null);
      executeAction({ type: "selectShip", shipId: idString });
      setTargetShipId(null);
      setSelectedWeaponType("weapon");
    },
    [
      currentStep,
      selectedShipId,
      previewPosition,
      validateAction,
      executeAction,
    ],
  );

  const wrappedSetPreviewPosition = useCallback(
    (position: { row: number; col: number } | null) => {
      if (!position) {
        setPreviewPosition(null);
        return;
      }

      // Step 12 fork rule: Tutorial Sniper is shoot-only and cannot stage moves.
      if (
        currentStep?.id === "rescue" &&
        selectedShipId?.toString() === "1002"
      ) {
        toast.error("Tutorial Sniper cannot move in this step.");
        return;
      }

      // Validate move action
      if (
        selectedShipId &&
        currentStep?.allowedActions.moveShip &&
        selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
      ) {
        const allowedPositions =
          currentStep.allowedActions.moveShip.allowedPositions;
        const isValidMove = allowedPositions.some(
          (pos) => pos.row === position.row && pos.col === position.col,
        );

        if (!isValidMove) {
          toast.error("Move not allowed in this tutorial step");
          return;
        }

        const moveValidation = validateAction({
          type: "moveShip",
          shipId: selectedShipId.toString() as TutorialShipId,
          position,
        });
        if (!moveValidation.valid) {
          toast.error(moveValidation.message || "Move not allowed");
          return;
        }

        // Stage the preview only. The actual move is submitted via the
        // top action UI (Submit button), matching the live game flow.
        setPreviewPosition(position);
      } else {
        setPreviewPosition(position);
      }
    },
    [selectedShipId, currentStep, validateAction, executeAction],
  );

  const wrappedSetTargetShipId = useCallback(
    (shipId: bigint | null) => {
      if (!shipId || shipId === 0n) {
        setTargetShipId(shipId);
        return;
      }

      if (!selectedShipId) {
        setTargetShipId(shipId);
        return;
      }

      const idString = shipId.toString() as TutorialShipId;

      // Check for shoot action
      if (
        currentStep?.allowedActions.shoot &&
        selectedShipId.toString() === currentStep.allowedActions.shoot.shipId &&
        currentStep.allowedActions.shoot.allowedTargets.includes(idString)
      ) {
        // In the shooting tutorial step, clicking an enemy in range should
        // only stage the target for the composite move+shoot action. The
        // actual shoot is executed when the user clicks Submit, just like
        // in the main game.
        if (
          currentStep.id === "shoot" ||
          currentStep.id === "rescue-outcome-sniper"
        ) {
          if (currentStep.id === "shoot") {
            // Require a proposed move to (1, 3) before allowing the shot.
            if (
              !previewPosition ||
              previewPosition.row !== 1 ||
              previewPosition.col !== 3
            ) {
              toast.error(
                "Move the Tutorial Sniper to (1, 3) before firing on the enemy.",
              );
              return;
            }
          } else if (currentStep.id === "rescue-outcome-sniper") {
            // Require the fighter to stage the center move before optional shot.
            if (
              !previewPosition ||
              previewPosition.row !== 5 ||
              previewPosition.col !== 8
            ) {
              toast.error(
                "Move the Tutorial Fighter to (5, 8) before firing on the enemy.",
              );
              return;
            }
          }

          // Stage the target only; Submit will call executeAction for the
          // actual shoot.
          setTargetShipId(shipId);
          return;
        }

        // In rescue, the sniper shot is staged (target selection) and is only
        // executed when the player clicks Submit.
        if (
          currentStep.id === "rescue" &&
          selectedShipId.toString() === "1002"
        ) {
          const currentPos = gameState.shipPositions.find(
            (pos) => pos.shipId === selectedShipId.toString(),
          )?.position;
          if (currentPos) {
            // Keep sniper stationary but provide an explicit firing origin so
            // railgun animation/effects can render when target is selected.
            setPreviewPosition({ row: currentPos.row, col: currentPos.col });
          }
          setTargetShipId(shipId);
          return;
        }

        const shootValidation = validateAction({
          type: "shoot",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (shootValidation.valid) {
          executeAction({
            type: "shoot",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Shoot,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(shootValidation.message || "Shoot not allowed");
          return;
        }
      }

      // Check for useSpecial action
      if (
        currentStep?.allowedActions.useSpecial &&
        selectedShipId.toString() ===
          currentStep.allowedActions.useSpecial.shipId &&
        currentStep.allowedActions.useSpecial.allowedTargets.includes(idString)
      ) {
        const specialValidation = validateAction({
          type: "useSpecial",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
          specialType: currentStep.allowedActions.useSpecial.specialType,
        });
        if (specialValidation.valid) {
          // Stage the target only; Submit will call executeAction for the
          // actual special use.
          setTargetShipId(shipId);
          return;
        } else {
          toast.error(
            specialValidation.message || "Special ability not allowed",
          );
          return;
        }
      }

      // Check for assist action
      if (
        currentStep?.allowedActions.assist &&
        selectedShipId.toString() ===
          currentStep.allowedActions.assist.shipId &&
        currentStep.allowedActions.assist.allowedTargets.includes(idString)
      ) {
        const assistValidation = validateAction({
          type: "assist",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (assistValidation.valid) {
          executeAction({
            type: "assist",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Assist,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(assistValidation.message || "Assist not allowed");
          return;
        }
      }

      // If no matching action, just set the target (for display purposes)
      setTargetShipId(shipId);
    },
    [
      selectedShipId,
      currentStep,
      previewPosition,
      validateAction,
      executeAction,
      gameState.shipPositions,
    ],
  );

  // Submit handler for staged move (selected ship + preview position). This mirrors
  // the live game flow where the player first stages a move on the grid, then
  // confirms it via the action panel, which may trigger a (simulated) transaction.
  const handleSubmitMove = useCallback(() => {
    if (!selectedShipId) {
      return;
    }

    if (actionOverride === ActionType.Retreat) {
      const currentPos = gameState.shipPositions.find(
        (p) => p.shipId === selectedShipId.toString(),
      )?.position;
      if (!currentPos) return;
      executeAction({
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: currentPos,
        actionType: ActionType.Retreat,
      });
      setActionOverride(null);
      return;
    }

    // For the shooting tutorial step, Submit should execute the composite
    // move+shoot action in one go: apply the staged move, then open the
    // simulated transaction for the shot.
    if (currentStep?.id === "shoot") {
      if (!previewPosition) {
        return;
      }
      if (!currentStep.allowedActions.moveShip) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      if (!targetShipId) {
        toast.error("Select an enemy ship to target before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      // Apply the move immediately (no tx). Validation has already run earlier.
      executeAction(moveAction);

      const shootAction: TutorialAction = {
        type: "shoot",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Shoot,
      };

      executeAction(shootAction);
      // For the shooting step, keep selection and preview/target state while
      // the simulated transaction dialog is open so the player continues to
      // see the staged move+shoot in the UI. State will be cleared when the
      // step advances after tx approval.
      return;
    }

    // Sniper branch step: submit move-to-center, optionally with a shot target.
    if (currentStep?.id === "rescue-outcome-sniper") {
      if (!previewPosition) {
        toast.error("Move the Tutorial Fighter to (5, 8) before submitting.");
        return;
      }
      if (previewPosition.row !== 5 || previewPosition.col !== 8) {
        toast.error("Move the Tutorial Fighter to (5, 8) before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
        // If the player selected a target, we'll perform the optional shot
        // after the tx is approved (handled in useOnboardingTutorial).
        targetShipId: targetShipId
          ? (targetShipId.toString() as TutorialShipId)
          : undefined,
      };
      executeAction(moveAction);
      return;
    }

    // Rescue step has two valid submit paths:
    // 1) Select disabled EMP and submit retreat.
    // 2) Select sniper, keep position, stage target, then submit shoot.
    if (currentStep?.id === "rescue") {
      const selectedId = selectedShipId.toString() as TutorialShipId;

      if (selectedId === "1001") {
        const currentPos = gameState.shipPositions.find(
          (pos) => pos.shipId === selectedId,
        )?.position;
        if (!currentPos) return;

        executeAction({
          type: "moveShip",
          shipId: selectedId,
          position: currentPos,
          actionType: ActionType.Retreat,
        });
      } else if (selectedId === "1002") {
        if (!targetShipId) {
          toast.error("Select Enemy Fighter as target before submitting.");
          return;
        }
        executeAction({
          type: "shoot",
          shipId: selectedId,
          targetShipId: targetShipId.toString() as TutorialShipId,
          actionType: ActionType.Shoot,
        });
      } else {
        toast.error("Select Tutorial EMP or Tutorial Sniper.");
        return;
      }
    } else if (currentStep?.id === "special-emp") {
      // Special EMP step: no movement, just fire the special at the staged target.
      const isEmpSelected = selectedWeaponType === "special";
      const hasTarget = !!targetShipId;
      const allowedTargets =
        currentStep.allowedActions.useSpecial?.allowedTargets ?? [];
      const isAllowedTarget =
        hasTarget &&
        allowedTargets.includes(targetShipId!.toString() as TutorialShipId);

      // Only requirement for submit in this step:
      // - EMP is selected in the dropdown
      // - Target is one of the allowed useSpecial targets (Heavy Enemy)
      if (!isEmpSelected || !isAllowedTarget) {
        toast.error(
          "Select the Heavy Enemy as your target and switch to EMP before submitting.",
        );
        return;
      }

      const action: TutorialAction = {
        type: "useSpecial",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Special,
      };

      executeAction(action);
    } else {
      if (!previewPosition) {
        return;
      }
      if (
        !currentStep?.allowedActions.moveShip ||
        selectedShipId.toString() !== currentStep.allowedActions.moveShip.shipId
      ) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      const action: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      executeAction(action);
    }

    // For most steps, clear local staging after submitting.
    // Keep local staging for steps that rely on pending tx preview state:
    // - shoot: staged move+target should remain visible until tx decision
    // - special-emp: staged target should remain visible until tx decision
    // - rescue: staged branch choice (retreat or sniper shot) should remain
    //   visible until approve, or until player cancels via top move-selection UI.
    if (
      currentStep?.id !== "shoot" &&
      currentStep?.id !== "special-emp" &&
      currentStep?.id !== "rescue" &&
      currentStep?.id !== "rescue-outcome-sniper"
    ) {
      setPreviewPosition(null);
      setTargetShipId(null);
      setSelectedShipId(null);
    }
  }, [
    selectedShipId,
    previewPosition,
    targetShipId,
    gameState.shipPositions,
    currentStep,
    isSelectedShipDisabled,
    selectedWeaponType,
    executeAction,
    actionOverride,
  ]);

  const tutorialGridPanelConfig = useMemo(() => {
    if (!currentStep?.id) return null;
    const base = getTutorialGridPanelConfig(currentStep.id);
    if (!base) return null;
    if (currentStep.id === "completion-sniper") {
      return {
        ...base,
        primaryCta: {
          eyebrow: "Ready for more",
          headline: "Take your fleet live",
          supporting: TUTORIAL_COMPLETION_SNIPER_PRIMARY_CTA_SUPPORTING,
          buttonLabel: "Log in & claim 3 free ships",
          onClick: () => {
            alert("Feature not implemented");
          },
        },
      };
    }
    if (currentStep.id === "completion-retreat") {
      return {
        ...base,
        primaryCta: {
          eyebrow: "Ready for more",
          headline: "Take your fleet live",
          supporting: TUTORIAL_COMPLETION_RETREAT_PRIMARY_CTA_SUPPORTING,
          buttonLabel: "Log in & claim 3 free ships",
          onClick: () => {
            alert("Feature not implemented");
          },
        },
      };
    }
    return base;
  }, [currentStep?.id]);

  return (
    <div
      ref={gameViewRootRef}
      className={`flex flex-col gap-6 ${
        chromeOnSide ? GAME_VIEW_SIDE_ROOT_CLASS : "mx-auto w-full"
      }`}
      style={
        chromeOnSide
          ? {
              marginLeft: "8px",
            }
          : undefined
      }
    >
      <div
        className={
          chromeOnSide
            ? "flex min-h-0 min-w-0 flex-row items-stretch gap-4"
            : "flex flex-col gap-6"
        }
      >
        {/* Header: back + game/round/turn + score + (optional) proposed move + Flee locked */}
        <div
          className={
            chromeOnSide
              ? "flex max-h-[min(100dvh-7rem,920px)] w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-y-auto pl-2 pr-1"
              : "flex items-start justify-between gap-6"
          }
        >
        <div
          className={
            chromeOnSide
              ? "flex shrink-0 flex-col items-stretch gap-3"
              : "flex items-center gap-4"
          }
        >
          <div className="flex w-full min-w-0 items-stretch gap-2">
            <div className="flex w-1/5 min-h-0 shrink-0 justify-start">
              <button
                onClick={onBack}
                className="flex min-h-0 w-full items-center justify-center px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                style={{
                  fontFamily:
                    "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-gunmetal)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-slate)";
                  e.currentTarget.style.borderColor = "var(--color-cyan)";
                  e.currentTarget.style.color = "var(--color-cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-steel)";
                  e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
              >
                ←
              </button>
            </div>
            <div className="flex min-h-0 w-4/5 min-w-0 flex-col justify-center">
              <FleeSafetySwitch gameId={0n} locked />
            </div>
          </div>
          <div
            className={
              chromeOnSide ? "flex flex-col gap-2" : "flex items-start gap-6"
            }
          >
            <div className="flex flex-col">
              <h1 className="text-2xl font-mono text-white flex items-center gap-3">
                <span>Game 0</span>
                <span className="text-gray-400 text-base">
                  Round {gameState.turnState.currentRound.toString()}
                </span>
              </h1>
              {/* Turn indicator · 99:99 and static bar (no countdown in tutorial) */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="text-sm flex items-center gap-2 uppercase font-semibold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <span
                    style={{
                      color: isMyTurn
                        ? "var(--color-cyan)"
                        : "var(--color-warning-red)",
                    }}
                  >
                    {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>•</span>
                  <span
                    className="font-mono"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: isMyTurn
                        ? "var(--color-cyan)"
                        : "var(--color-warning-red)",
                    }}
                  >
                    99:99
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-gunmetal)",
                      borderRadius: 0,
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: "100%",
                        backgroundColor: isMyTurn
                          ? "var(--color-cyan)"
                          : "var(--color-warning-red)",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Score grouped with game/round (same conceptual row as in reference) */}
            <div
              className={
                chromeOnSide
                  ? "w-full shrink-0 border border-solid p-2 text-lg"
                  : "w-48 shrink-0 border border-solid p-2 text-lg"
              }
              style={{
                backgroundColor: "var(--color-slate)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    My Score:
                  </span>
                  <span
                    title="Scores update at end of round."
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {gameState.creatorScore.toString()}/
                    {gameState.maxScore.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    Opponent:
                  </span>
                  <span
                    title="Scores update at end of round."
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {gameState.joinerScore.toString()}/
                    {gameState.maxScore.toString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proposed Move panel: inline between score and Flee Battle when active.
            Mirrors main game behavior: appears whenever an owned ship is selected
            and eligible to act this round, even before a move is proposed. */}
        {isShowingProposedMove && (
          <div
            className={
              chromeOnSide
                ? "flex min-h-0 min-w-0 flex-1 flex-col border border-solid p-3"
                : "min-h-0 flex-1 border border-solid p-3"
            }
            style={{
              backgroundColor: "var(--color-near-black)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            <div
              className={
                chromeOnSide
                  ? "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4"
                  : "flex items-center gap-6 p-4"
              }
            >
              <div
                className={
                  chromeOnSide
                    ? "order-2 flex min-w-0 flex-shrink-0 flex-col gap-1"
                    : "flex min-w-0 flex-shrink-0 flex-col gap-1"
                }
              >
                {(() => {
                  const ship = shipMap.get(selectedShipId!);
                  const name =
                    ship?.name || `Ship #${selectedShipId?.toString()}`;
                  const currentPos = gameState.shipPositions.find(
                    (pos) => pos.shipId === selectedShipId?.toString(),
                  );
                  const fromRow = currentPos?.position.row ?? 0;
                  const fromCol = currentPos?.position.col ?? 0;
                  const toRow = previewPosition
                    ? previewPosition.row
                    : fromRow;
                  const toCol = previewPosition
                    ? previewPosition.col
                    : fromCol;
                  return (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="text-sm font-semibold text-white">
                        {name}
                      </div>
                      <div className="text-sm font-mono text-gray-300">
                        ({fromRow}, {fromCol}) → ({toRow}, {toCol})
                      </div>
                    </div>
                  );
                })()}
                {/* Weapon / Special selector, mirroring main game UI */}
                {(() => {
                  if (isSelectedShipDisabled) return null;
                  if (!selectedShipId) return null;
                  const ship = shipMap.get(selectedShipId);
                  if (!ship || ship.equipment.special <= 0) return null;
                  return (
                    <div
                      className={
                        shouldHighlightSpecialEmpWeaponDropdown
                          ? "mt-1 w-full rounded-sm ring-2 ring-yellow-400 ring-offset-2 ring-offset-[var(--color-near-black)] animate-pulse"
                          : "mt-1 w-full"
                      }
                    >
                      <select
                        value={selectedWeaponType}
                        onChange={(e) => {
                          const newWeaponType = e.target.value as
                            | "weapon"
                            | "special";
                          setSelectedWeaponType(newWeaponType);
                          // In tutorial we do not have a boarding special; keep target as-is.
                        }}
                        className="w-full px-3 py-1.5 text-sm uppercase font-semibold tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          borderRadius: 0,
                          backgroundColor: "var(--color-slate)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        <option value="weapon">
                          {getMainWeaponName(ship.equipment.mainWeapon)}
                        </option>
                        <option value="special">
                          {getSpecialName(ship.equipment.special)}
                        </option>
                      </select>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    setActionOverride(ActionType.Retreat);
                    setTargetShipId(null);
                    setPreviewPosition(null);
                  }}
                  className="w-full px-3 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor:
                      actionOverride === ActionType.Retreat
                        ? "var(--color-warning-red)"
                        : "var(--color-gunmetal)",
                    borderTopColor:
                      actionOverride === ActionType.Retreat
                        ? "var(--color-warning-red)"
                        : "var(--color-steel)",
                    borderLeftColor:
                      actionOverride === ActionType.Retreat
                        ? "var(--color-warning-red)"
                        : "var(--color-steel)",
                    color:
                      actionOverride === ActionType.Retreat
                        ? "var(--color-warning-red)"
                        : "var(--color-text-secondary)",
                    backgroundColor:
                      actionOverride === ActionType.Retreat
                        ? "rgba(255, 77, 77, 0.15)"
                        : "var(--color-slate)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (actionOverride !== ActionType.Retreat) {
                      e.currentTarget.style.borderColor =
                        "var(--color-warning-red)";
                      e.currentTarget.style.color = "var(--color-warning-red)";
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 77, 77, 0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (actionOverride !== ActionType.Retreat) {
                      e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                      e.currentTarget.style.color =
                        "var(--color-text-secondary)";
                      e.currentTarget.style.backgroundColor = "var(--color-slate)";
                    }
                  }}
                >
                  Retreat
                </button>
              </div>

              {/* Center: Target selection, mirroring main game UI */}
              {!isSelectedShipDisabled && validTargets.length > 0 && (
                <div
                  className={
                    chromeOnSide
                      ? "order-3 flex min-h-0 min-w-0 flex-1 flex-col"
                      : "min-h-0 flex-1"
                  }
                >
                  <div
                    className={
                      chromeOnSide
                        ? "flex min-h-0 min-w-0 flex-1 flex-col border border-solid p-3"
                        : "min-h-[7.5rem] border border-solid p-3"
                    }
                    style={{
                      backgroundColor: "var(--color-near-black)",
                      borderColor: "var(--color-gunmetal)",
                      borderTopColor: "var(--color-steel)",
                      borderLeftColor: "var(--color-steel)",
                      borderRadius: 0,
                    }}
                  >
                    <div
                      className="shrink-0 text-xs mb-2 uppercase tracking-wide"
                      style={{
                        fontFamily:
                          "var(--font-jetbrains-mono), 'Courier New', monospace",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Select Target (Optional)
                    </div>
                    <div className={proposedMoveTargetListClass}>
                      {validTargets.map((target) => {
                        const targetShip = shipMap.get(BigInt(target.shipId));
                        const isSelectedTarget =
                          targetShipId !== null &&
                          targetShipId === BigInt(target.shipId);
                        return (
                          <button
                            key={target.shipId}
                            onClick={() =>
                              setTargetShipId(BigInt(target.shipId))
                            }
                            className={proposedMoveTargetBtnClass}
                            style={{
                              fontFamily:
                                "var(--font-rajdhani), 'Arial Black', sans-serif",
                              borderColor: isSelectedTarget
                                ? "var(--color-warning-red)"
                                : "var(--color-gunmetal)",
                              borderTopColor: isSelectedTarget
                                ? "var(--color-warning-red)"
                                : "var(--color-steel)",
                              borderLeftColor: isSelectedTarget
                                ? "var(--color-warning-red)"
                                : "var(--color-steel)",
                              color: isSelectedTarget
                                ? "var(--color-warning-red)"
                                : "var(--color-warning-red)",
                              backgroundColor: isSelectedTarget
                                ? "var(--color-steel)"
                                : "var(--color-slate)",
                              borderWidth: "2px",
                              borderStyle: "solid",
                              borderRadius: 0,
                            }}
                          >
                            🎯{" "}
                            {targetShip?.name ||
                              `#${BigInt(target.shipId).toString()}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {chromeOnSide &&
                (validTargets.length === 0 || isSelectedShipDisabled) && (
                  <div
                    className="order-4 min-h-0 min-w-0 flex-1"
                    aria-hidden
                  />
                )}

              <div
                className={
                  chromeOnSide
                    ? "order-1 flex w-full shrink-0 flex-row gap-2"
                    : "flex items-center gap-2"
                }
              >
                <button
                  type="button"
                  onClick={handleSubmitMove}
                  className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 ${
                    chromeOnSide ? "min-w-0 flex-[2]" : ""
                  } ${
                    shouldPulseSubmitMoveButton
                      ? "animate-pulse ring-2 ring-yellow-400 ring-offset-2 ring-offset-[var(--color-near-black)]"
                      : ""
                  }`}
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-phosphor-green)",
                    borderTopColor: "var(--color-phosphor-green)",
                    borderLeftColor: "var(--color-phosphor-green)",
                    color: "var(--color-phosphor-green)",
                    backgroundColor: "var(--color-steel)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: 0,
                  }}
                >
                  {isSelectedShipDisabled ? "Submit Retreat" : "Submit Move"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPosition(null);
                    setTargetShipId(null);
                    setActionOverride(null);
                  }}
                  className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150${
                    chromeOnSide ? " min-w-0 flex-[1]" : ""
                  }`}
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    borderTopColor: "var(--color-steel)",
                    borderLeftColor: "var(--color-steel)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-slate)",
                    borderWidth: "2px",
                    borderStyle: "solid",
                    borderRadius: 0,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={
          chromeOnSide
            ? "relative min-h-0 min-w-0 flex-1"
            : "relative w-full"
        }
      >
        <GameBoardLayout
          isCurrentPlayerTurn={isMyTurn}
          containerRef={gridContainerRef}
        >
          {/* Fixed 17×11 aspect so the board does not resize between tutorial steps
              while state hydrates; overlay blocks interaction until ready. */}
          <div
            className="relative w-full"
            style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
          >
            {!isStepHydrated && (
              <div
                className="absolute inset-0 z-[200] flex items-center justify-center"
                style={{ backgroundColor: "var(--color-near-black)" }}
                aria-busy
                aria-live="polite"
              >
                <span className="text-cyan-300 font-mono">
                  Preparing tutorial step...
                </span>
              </div>
            )}
            <div className="absolute inset-0 min-h-0 overflow-hidden">
              <GameGrid
                grid={grid}
                allShipPositions={allShipPositionsForGrid}
                shipMap={shipMap}
                selectedShipId={selectedShipId}
                previewPosition={previewPosition}
                targetShipId={targetShipId}
                selectedWeaponType={selectedWeaponType}
                hoveredCell={hoveredCell}
                draggedShipId={draggedShipId}
                dragOverCell={dragOverCell}
                movementRange={movementRange}
                shootingRange={shootingRange}
                validTargets={gridValidTargets}
                assistableTargets={gridAssistableTargets}
                assistableTargetsFromStart={gridAssistableTargetsFromStart}
                dragShootingRange={dragShootingRange}
                dragValidTargets={dragValidTargets}
                isCurrentPlayerTurn={isMyTurn}
                isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                movedShipIdsSet={gridMovedShipIdsSet}
                specialType={specialType}
                blockedGrid={blockedGrid}
                scoringGrid={scoringGrid}
                onlyOnceGrid={onlyOnceGrid}
                calculateDamage={calculateDamage}
                getShipAttributes={getShipAttributes}
                disableTooltips={false}
                address={TUTORIAL_PLAYER_ADDRESS}
                currentTurn={gameState.turnState.currentTurn}
                highlightedMovePosition={highlightedMovePosition}
                lastMoveShipId={lastMoveProps.lastMoveShipId}
                lastMoveOldPosition={lastMoveProps.lastMoveOldPosition}
                lastMoveNewPosition={lastMoveProps.lastMoveNewPosition}
                lastMoveActionType={lastMoveProps.lastMoveActionType}
                lastMoveTargetShipId={lastMoveProps.lastMoveTargetShipId}
                lastMoveIsCurrentPlayer={lastMoveProps.lastMoveIsCurrentPlayer}
                showLastMoveEmpReplayWhenSelected={
                  currentStep?.id === "ship-destruction" ||
                  currentStep?.id === "destroy-disabled"
                }
                retreatPrepShipId={retreatPrepShipId}
                retreatPrepIsCreator={retreatPrepIsCreator}
                tutorialHighlightCells={tutorialHighlightCells}
                setSelectedShipId={wrappedSetSelectedShipId}
                setPreviewPosition={wrappedSetPreviewPosition}
                setTargetShipId={wrappedSetTargetShipId}
                setSelectedWeaponType={setSelectedWeaponType}
                setHoveredCell={setHoveredCell}
                setDraggedShipId={setDraggedShipId}
                setDragOverCell={setDragOverCell}
              />
            </div>
            {tutorialGridPanelConfig && (
              <TutorialGridTaskPanel
                title={tutorialGridPanelConfig.title}
                brief={tutorialGridPanelConfig.brief}
                tasks={tutorialGridPanelConfig.tasks}
                tasksSectionLabel={tutorialGridPanelConfig.tasksSectionLabel}
                primaryCta={tutorialGridPanelConfig.primaryCta}
                panelBottomRowExclusive={
                  tutorialGridPanelConfig.panelBottomRowExclusive
                }
                panelFitToContent={tutorialGridPanelConfig.panelFitToContent}
                displayStepNumber={displayStepNumber}
                displayTotalSteps={displayTotalSteps}
                currentStepIndex={currentStepIndex}
                isVisibleLastStep={isVisibleLastStep}
                isStepComplete={isStepComplete}
                onNext={() => nextStep()}
                onPrevious={() => previousStep()}
                onReset={() => resetTutorial()}
                onQuit={onBack}
              />
            )}
            <div className="absolute bottom-0 right-0 z-[220] pointer-events-none">
              <div className="pointer-events-auto">
                {isLastMovePanelMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsLastMovePanelMinimized(false)}
                    className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-purple, #a855f7)",
                      color: "var(--color-purple, #d8b4fe)",
                      backgroundColor: "rgba(10, 10, 15, 0.88)",
                      borderRadius: 0,
                    }}
                  >
                    Last Move
                  </button>
                ) : (
                  <div className="w-[min(30rem,70vw)] max-w-full">
                    <div className="mb-1 flex items-center justify-between border border-solid px-2 py-1 bg-black/80">
                      <span
                        className="text-xs uppercase tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color: "var(--color-purple, #d8b4fe)",
                        }}
                      >
                        Last Move
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLastMovePanelMinimized(true)}
                        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          borderColor: "var(--color-purple, #a855f7)",
                          color: "var(--color-purple, #d8b4fe)",
                          backgroundColor: "var(--color-near-black)",
                          borderRadius: 0,
                        }}
                      >
                        Minimize
                      </button>
                    </div>
                    <GameEvents
                      lastMove={lastMoveForEvents}
                      shipMap={shipMap}
                      address={TUTORIAL_PLAYER_ADDRESS}
                      appendDestroyedText={
                        currentStep?.id === "ship-destruction" ||
                        currentStep?.id === "rescue"
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </GameBoardLayout>
      </div>
      </div>

      {/* Ship Details panel - mirror live game fleet layout using tutorial data */}
      <div
        className="p-4 border border-solid w-full"
        style={{
          backgroundColor: "var(--color-slate)",
          borderColor: "var(--color-gunmetal)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Fleet - Left (tutorial player) */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
                fontSize: "18px",
              }}
            >
              My Fleet
              <span
                className="ml-2"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
              >
                ({gameState.metadata.creator})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.creatorActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(BigInt(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
                    <ShipCard
                      ship={ship}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={true}
                      inGameAttributes={attributes}
                      attributesLoading={false}
                      hideRecycle={true}
                      hideCheckbox={true}
                      isCurrentPlayerShip={true}
                      flipShip={true}
                      reactorCriticalStatus={reactorCriticalStatus}
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent's Fleet - Right */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-warning-red)",
                fontSize: "18px",
              }}
            >
              Opponent&apos;s Fleet
              <span
                className="ml-2"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
              >
                ({gameState.metadata.joiner})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.joinerActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(BigInt(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
                    <ShipCard
                      ship={ship}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={true}
                      inGameAttributes={attributes}
                      attributesLoading={false}
                      hideRecycle={true}
                      hideCheckbox={true}
                      isCurrentPlayerShip={false}
                      flipShip={false}
                      reactorCriticalStatus={reactorCriticalStatus}
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border border-cyan-400 rounded-none p-4">
          <p className="text-cyan-300 font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name || selectedShipId.toString()}
          </p>
          {currentStep?.allowedActions.moveShip &&
            selectedShipId.toString() ===
              currentStep.allowedActions.moveShip.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted grid cell to move.
              </p>
            )}
          {currentStep?.allowedActions.shoot &&
            selectedShipId.toString() ===
              currentStep.allowedActions.shoot.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted enemy ship to shoot.
              </p>
            )}
          {currentStep?.allowedActions.useSpecial &&
            selectedShipId.toString() ===
              currentStep.allowedActions.useSpecial.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted ship to use your special ability.
              </p>
            )}
          {currentStep?.allowedActions.assist &&
            selectedShipId.toString() ===
              currentStep.allowedActions.assist.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click the highlighted friendly ship to assist it.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
