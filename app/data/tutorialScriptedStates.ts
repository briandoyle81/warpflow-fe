import { SimulatedGameState } from "../types/onboarding";
import { createInitialTutorialGameState } from "./tutorialGameState";
import { applyTutorialStepScript } from "../utils/tutorialStepScripts";
import { applyTutorialAction } from "../utils/simulatedTutorialRules";
import { TUTORIAL_STEPS } from "./tutorialSteps";

/**
 * Canonical game state when the user is viewing step index i (before completing
 * that step's action). Built by chaining scripted changes and canonical user
 * actions so that refresh or step navigation always shows the correct board.
 */
function buildScriptedStates(): SimulatedGameState[] {
  const states: SimulatedGameState[] = [];

  // Step 0: initial
  let s = createInitialTutorialGameState();
  states.push(s);

  // Step 1–4: no board changes (welcome, goals, select-ship, view-enemy, move-ship entry)
  for (let i = 1; i <= 4; i++) {
    states.push(s);
  }

  // Step 5 (index 4) is move-ship: canonical outcome = 1003 moves to (6, 7)
  s = applyTutorialAction(s, {
    type: "moveShip",
    shipId: "1003",
    position: { row: 6, col: 7 },
  });
  states.push(s); // index 5 = state when entering wait-for-opponent

  // Step 7 score-points: run script (enemy 2003 to 9,13, score, lastMove).
  // This state is used when entering the score-points step.
  s = applyTutorialStepScript("score-points", s);
  states.push(s); // index 6

  // Step 8 shoot: canonical step 7 completion = scout 1001 moves to (5,8),
  // then run shoot script
  s = applyTutorialAction(s, {
    type: "moveShip",
    shipId: "1001",
    position: { row: 5, col: 8 },
  });
  s = applyTutorialStepScript("shoot", s);
  states.push(s); // index 7 = entering "shoot"

  // After shoot step completion: Tutorial Sniper moves and fires on Enemy Fighter
  s = applyTutorialAction(s, {
    type: "moveShip",
    shipId: "1002",
    position: { row: 1, col: 3 },
  });
  s = applyTutorialAction(s, {
    type: "shoot",
    shipId: "1002",
    targetShipId: "2001",
  });
  s = applyTutorialStepScript("end-of-round", s);
  states.push(s); // index 8 = entering "end-of-round"

  // special-emp: Heavy Enemy moves to (5,9) and fires on Tutorial EMP; player turn for EMP
  s = applyTutorialStepScript("special-emp", s);
  states.push(s); // index 9 = entering "special-emp"

  // ship-destruction: script only (Heavy destroyed, last move EMP)
  s = applyTutorialStepScript("ship-destruction", s);
  states.push(structuredClone(s)); // index 10 = entering "ship-destruction"

  // rescue: Enemy Sniper disables Tutorial EMP (scripted shot)
  s = applyTutorialStepScript("rescue", s);
  states.push(structuredClone(s)); // index 11 = entering "rescue"

  // Branch variants for step 13 (both derived from the same rescue base).
  const rescueBase = structuredClone(s);
  const retreatOutcome = applyTutorialStepScript(
    "rescue-outcome-retreat",
    structuredClone(rescueBase),
  );
  states.push(retreatOutcome); // index 12

  const sniperOutcome = applyTutorialStepScript(
    "rescue-outcome-sniper",
    structuredClone(rescueBase),
  );
  states.push(sniperOutcome); // index 13

  // completion-retreat (enemy captures center; now it's your turn)
  const completionRetreat = applyTutorialStepScript(
    "completion-retreat",
    structuredClone(retreatOutcome),
  );
  states.push(completionRetreat); // index 14

  const completionSniper = applyTutorialStepScript(
    "completion-sniper",
    structuredClone(sniperOutcome),
  );
  states.push(completionSniper); // index 15 = entering completion-sniper

  // Duplicate slot so getScriptedStateForStepIndex(lastIndex) stays valid
  states.push(structuredClone(completionSniper)); // index 16

  return states;
}

/**
 * Returns the canonical game state for the given step index. Used when entering
 * a step or on refresh so all prior moves are preserved.
 */
export function getScriptedStateForStepIndex(
  stepIndex: number,
): SimulatedGameState {
  const states = buildScriptedStates();
  const safe = Number.isFinite(stepIndex) ? stepIndex : 0;
  const i = Math.max(0, Math.min(safe, states.length - 1));
  return states[i];
}

/**
 * Canonical state for a tutorial step by its `TUTORIAL_STEPS` id. Prefer this
 * when hydrating by step so index and array layout cannot drift apart.
 */
export function getScriptedStateForTutorialStepId(
  stepId: string,
): SimulatedGameState | null {
  const idx = TUTORIAL_STEPS.findIndex((s) => s.id === stepId);
  if (idx === -1) return null;
  return getScriptedStateForStepIndex(idx);
}
