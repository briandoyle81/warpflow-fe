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
  const steps = TUTORIAL_STEPS;
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
  states.push(s); // index 7

  // Step 9 special-emp: state after step 8 completion, then Heavy Enemy moves to (5,9) and fires on Tutorial EMP
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
  s = applyTutorialStepScript("special-emp", s);
  states.push(s); // index 8 = state when entering step 9 (special-emp)

  // Step 10 ship-destruction: script only (repair 1001 after destruction info)
  s = applyTutorialStepScript("ship-destruction", s);
  states.push(s); // index 10

  // Step 11 rescue: script (1001 disabled, positions for 1003/1001)
  s = applyTutorialStepScript("rescue", s);
  states.push(s); // index 11

  // Step 12 destroy-disabled: script (2002 destroyed)
  s = applyTutorialStepScript("destroy-disabled", s);
  states.push(s); // index 12

  // Step 13 completion: same
  states.push(s); // index 13

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
  const i = Math.max(0, Math.min(stepIndex, states.length - 1));
  return states[i];
}
