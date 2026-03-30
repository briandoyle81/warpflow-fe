import { useState, useCallback, useMemo, useEffect } from "react";
import {
  TutorialAction,
  TutorialContextValue,
  SimulatedGameState,
  TUTORIAL_STEP_STORAGE_KEY,
} from "../types/onboarding";
import { ActionType } from "../types/types";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
import {
  getScriptedStateForStepIndex,
  getScriptedStateForTutorialStepId,
} from "../data/tutorialScriptedStates";
import { useSimulatedGameState } from "./useSimulatedGameState";

const TUTORIAL_STEP_SNAPSHOTS_KEY = "void-tactics-tutorial-step-snapshots";
const TUTORIAL_DATA_VERSION_KEY = "void-tactics-tutorial-data-version";
// Bump this any time we change the canonical tutorial state so we don't keep
// rendering stale snapshots from localStorage.
const TUTORIAL_DATA_VERSION =
  "2026-03-27-completion-retreat-victory-parity-cta";

export function useOnboardingTutorial() {
  // Load saved step index from localStorage, default to 0
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const prevVersion = window.localStorage.getItem(
        TUTORIAL_DATA_VERSION_KEY,
      );
      if (prevVersion !== TUTORIAL_DATA_VERSION) {
        return 0;
      }
      const saved = localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < TUTORIAL_STEPS.length) {
          return parsed;
        }
      }
    }
    return 0;
  });
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TutorialAction | null>(
    null,
  );
  const [lastAction, setLastAction] = useState<TutorialAction | null>(null);
  const [isStepHydrated, setIsStepHydrated] = useState(false);
  const displayTotalSteps = 14;
  // The step index whose state is currently hydrated and visible on screen.
  // This lets us persist snapshots for the correct step even when
  // currentStepIndex has already advanced to the next step.
  const [hydratedStepIndex, setHydratedStepIndex] = useState<number | null>(
    null,
  );

  const { gameState, updateGameState, applyAction, resetState } =
    useSimulatedGameState();

  // Per-step cached snapshots of game state and last action, so moving between
  // steps (or reloading) preserves positions and damage unless the user resets.
  const [stepSnapshots, setStepSnapshots] = useState<
    ({
      gameState: SimulatedGameState;
      lastAction: TutorialAction | null;
    } | null)[]
  >(() => {
    const empty = TUTORIAL_STEPS.map(() => null);
    if (typeof window === "undefined") return empty;
    try {
      const raw = window.localStorage.getItem(TUTORIAL_STEP_SNAPSHOTS_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === TUTORIAL_STEPS.length) {
        return parsed as ({
          gameState: SimulatedGameState;
          lastAction: TutorialAction | null;
        } | null)[];
      }
    } catch {
      // Ignore parse errors and fall back to empty snapshots
    }
    return empty;
  });

  // Save step index to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        TUTORIAL_STEP_STORAGE_KEY,
        currentStepIndex.toString(),
      );
    }
  }, [currentStepIndex]);

  // Persist a snapshot for the current step only after that step's state is
  // hydrated. Otherwise when we advance (e.g. 5 → 6), we'd save step 5's
  // gameState as step 6's snapshot, then the step effect would "restore" it
  // and never run the step 6 script, causing flicker between the two states.
  useEffect(() => {
    if (!isStepHydrated || hydratedStepIndex === null) return;

    // Do not persist snapshots for scripted steps that have a pre-step enemy
    // move/attack or a hardcoded cinematic setup, so we always show that when
    // entering (no stale snapshot).
    const hydratedStep = TUTORIAL_STEPS[hydratedStepIndex];
    if (
      hydratedStep &&
      (hydratedStep.id === "score-points" ||
        hydratedStep.id === "shoot" ||
        hydratedStep.id === "end-of-round" ||
        hydratedStep.id === "special-emp" ||
        hydratedStep.id === "ship-destruction" ||
        hydratedStep.id === "rescue" ||
        hydratedStep.id === "rescue-outcome-retreat" ||
        hydratedStep.id === "rescue-outcome-sniper" ||
        hydratedStep.id === "completion-sniper" ||
        hydratedStep.id === "completion-retreat")
    ) {
      return;
    }

    setStepSnapshots((prev) => {
      const next = [...prev];
      next[hydratedStepIndex] = { gameState, lastAction };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            TUTORIAL_STEP_SNAPSHOTS_KEY,
            JSON.stringify(next),
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      return next;
    });
  }, [gameState, lastAction, hydratedStepIndex, isStepHydrated]);

  const currentStep = useMemo(() => {
    return TUTORIAL_STEPS[currentStepIndex] || null;
  }, [currentStepIndex]);

  // Whenever the current step index changes, mark the step as not yet
  // hydrated so the UI can avoid briefly showing the previous step's
  // board before the new step's snapshot/scripted state is applied.
  useEffect(() => {
    setIsStepHydrated(false);
    // We intentionally do NOT reset hydratedStepIndex here; it will be updated
    // when the new step finishes hydrating.
  }, [currentStepIndex]);

  const validateAction = useCallback(
    (action: TutorialAction): { valid: boolean; message?: string } => {
      if (!currentStep) {
        return { valid: false, message: "No active tutorial step" };
      }

      const { allowedActions } = currentStep;

      switch (action.type) {
        case "selectShip":
          if (!allowedActions.selectShip) {
            return {
              valid: false,
              message: "Ship selection not allowed in this step",
            };
          }
          if (
            action.shipId &&
            !allowedActions.selectShip.includes(action.shipId)
          ) {
            return {
              valid: false,
              message: "This ship cannot be selected in this step",
            };
          }
          return { valid: true };

        case "moveShip":
          if (!allowedActions.moveShip) {
            return {
              valid: false,
              message: "Ship movement not allowed in this step",
            };
          }
          if (action.shipId !== allowedActions.moveShip.shipId) {
            return {
              valid: false,
              message: "This ship cannot be moved in this step",
            };
          }
          if (action.position) {
            const isAllowed = allowedActions.moveShip.allowedPositions.some(
              (pos) =>
                pos.row === action.position!.row &&
                pos.col === action.position!.col,
            );
            if (!isAllowed) {
              return {
                valid: false,
                message: "This position is not allowed in this step",
              };
            }
          }
          return { valid: true };

        case "shoot":
          if (!allowedActions.shoot) {
            return {
              valid: false,
              message: "Shooting not allowed in this step",
            };
          }
          if (action.shipId !== allowedActions.shoot.shipId) {
            return {
              valid: false,
              message: "This ship cannot shoot in this step",
            };
          }
          if (
            action.targetShipId &&
            !allowedActions.shoot.allowedTargets.includes(action.targetShipId)
          ) {
            return {
              valid: false,
              message: "This target is not allowed in this step",
            };
          }
          return { valid: true };

        case "useSpecial":
          if (!allowedActions.useSpecial) {
            return {
              valid: false,
              message: "Special abilities not allowed in this step",
            };
          }
          if (action.shipId !== allowedActions.useSpecial.shipId) {
            return {
              valid: false,
              message: "This ship cannot use special in this step",
            };
          }
          if (
            action.targetShipId &&
            !allowedActions.useSpecial.allowedTargets.includes(
              action.targetShipId,
            )
          ) {
            return {
              valid: false,
              message: "This target is not allowed in this step",
            };
          }
          return { valid: true };

        case "assist":
          if (!allowedActions.assist) {
            return { valid: false, message: "Assist not allowed in this step" };
          }
          if (action.shipId !== allowedActions.assist.shipId) {
            return {
              valid: false,
              message: "This ship cannot assist in this step",
            };
          }
          if (
            action.targetShipId &&
            !allowedActions.assist.allowedTargets.includes(action.targetShipId)
          ) {
            return {
              valid: false,
              message: "This target is not allowed in this step",
            };
          }
          return { valid: true };

        case "claimPoints":
          if (!allowedActions.claimPoints) {
            return {
              valid: false,
              message: "Claiming points not allowed in this step",
            };
          }
          return { valid: true };

        default:
          return { valid: false, message: "Unknown action type" };
      }
    },
    [currentStep],
  );

  const executeAction = useCallback(
    (action: TutorialAction) => {
      const validation = validateAction(action);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // If step requires transaction and should show after, execute first then show dialog
      // Only show transaction dialog for moveShip actions, not for selectShip
      if (
        currentStep?.requiresTransaction &&
        currentStep?.showTransactionAfter &&
        action.type === "moveShip"
      ) {
        applyAction(action);
        setLastAction(action); // Track the last action for step completion checking
        setPendingAction(action);
        // Delay showing the transaction dialog to allow the UI to update first
        // Use requestAnimationFrame to ensure the ship has visually moved
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsTransactionDialogOpen(true);
          });
        });
        return { success: true, pending: true };
      }

      // For the "shoot" step, follow the desired sequence:
      // 1) select ship, 2) propose move (staged in UI), 3) select target,
      // 4) click Submit to execute the composite action (move + shoot) in a
      // single simulated transaction. The move is applied immediately with no
      // transaction; only the shoot opens the simulated tx.
      if (currentStep?.id === "shoot") {
        if (action.type === "moveShip") {
          // Apply the move immediately without any transaction dialog.
          applyAction(action);
          return { success: true };
        }
        if (action.type === "shoot") {
          setPendingAction(action);
          setIsTransactionDialogOpen(true);
          return { success: true, pending: true };
        }
      }

      // If step requires transaction, show dialog first
      // Only show transaction dialog for actions that require it (not selectShip)
      if (currentStep?.requiresTransaction && action.type !== "selectShip") {
        setPendingAction(action);
        setIsTransactionDialogOpen(true);
        return { success: true, pending: true };
      }

      // Otherwise, execute immediately
      applyAction(action);
      setLastAction(action); // Track the last action for step completion checking

      return { success: true };
    },
    [currentStep, validateAction, applyAction],
  );

  const approveTransaction = useCallback(() => {
    if (!pendingAction) return;

    const action = pendingAction;

    setIsTransactionDialogOpen(false);

    // If action was already executed (showTransactionAfter), just close the dialog.
    // Otherwise, execute the action now.
    let stepCompletionAction: TutorialAction = action;
    if (!currentStep?.showTransactionAfter) {
      // Standard tx behavior: apply the pending action.
      applyAction(action);

      // Special handling for step 13 (rescue-outcome-sniper):
      // the tx is for the move, and we optionally chain a shot based on
      // targetShipId embedded on the pending move action.
      if (
        currentStep?.id === "rescue-outcome-sniper" &&
        action.type === "moveShip" &&
        action.targetShipId
      ) {
        const shootAction: TutorialAction = {
          type: "shoot",
          shipId: action.shipId,
          targetShipId: action.targetShipId,
          actionType: ActionType.Shoot,
        };
        applyAction(shootAction);
        stepCompletionAction = shootAction;
        setLastAction(shootAction);
      } else {
        setLastAction(action);
      }
    }

    setPendingAction(null);

    // After a simulated transaction is approved, automatically advance to the
    // next tutorial step when this step's completion condition is satisfied.
    if (
      currentStep?.requiresTransaction &&
      typeof currentStep.onStepComplete === "function" &&
      currentStep.onStepComplete(stepCompletionAction)
    ) {
      setCurrentStepIndex((prev) => {
        let nextIndex = Math.min(prev + 1, TUTORIAL_STEPS.length - 1);

        // Step 13 fork variants after rescue tx approval.
        if (currentStep.id === "rescue") {
          const retreatOutcomeIndex = TUTORIAL_STEPS.findIndex(
            (s) => s.id === "rescue-outcome-retreat",
          );
          const sniperOutcomeIndex = TUTORIAL_STEPS.findIndex(
            (s) => s.id === "rescue-outcome-sniper",
          );
          const empRetreat =
            action.type === "moveShip" &&
            action.shipId === "1001" &&
            action.actionType === ActionType.Retreat;

          if (empRetreat && retreatOutcomeIndex !== -1) {
            nextIndex = retreatOutcomeIndex;
          } else if (sniperOutcomeIndex !== -1) {
            nextIndex = sniperOutcomeIndex;
          }
        }

        // Route Step 13 outcomes to the correct Step 14 variant.
        if (currentStep.id === "rescue-outcome-retreat") {
          const completionIndex = TUTORIAL_STEPS.findIndex(
            (s) => s.id === "completion-retreat",
          );
          if (completionIndex !== -1) nextIndex = completionIndex;
        } else if (currentStep.id === "rescue-outcome-sniper") {
          const completionIndex = TUTORIAL_STEPS.findIndex(
            (s) => s.id === "completion-sniper",
          );
          if (completionIndex !== -1) nextIndex = completionIndex;
        }

        if (nextIndex !== prev) {
          setLastAction(null);
        }
        return nextIndex;
      });
    }
  }, [pendingAction, currentStep, applyAction]);

  const rejectTransaction = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setPendingAction(null);
  }, []);

  const openTransactionDialog = useCallback((action: TutorialAction) => {
    setPendingAction(action);
    setIsTransactionDialogOpen(true);
  }, []);

  const closeTransactionDialog = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setPendingAction(null);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      let nextIndex = Math.min(prev + 1, TUTORIAL_STEPS.length - 1);
      const currentId = TUTORIAL_STEPS[prev]?.id;
      // Make branch navigation deterministic even if Debug allows skipping step
      // completion (which may leave rescueBranch unset).
      if (currentId === "rescue-outcome-retreat") {
        const completionIndex = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "completion-retreat",
        );
        if (completionIndex !== -1) nextIndex = completionIndex;
      } else if (currentId === "rescue-outcome-sniper") {
        const completionIndex = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "completion-sniper",
        );
        if (completionIndex !== -1) nextIndex = completionIndex;
      }
      return nextIndex;
    });
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const currentId = TUTORIAL_STEPS[prev]?.id;
      if (currentId === "completion-retreat") {
        const idx = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-retreat",
        );
        if (idx !== -1) return idx;
      }
      if (currentId === "completion-sniper") {
        const idx = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-sniper",
        );
        if (idx !== -1) return idx;
      }
      const prevIndex = Math.max(prev - 1, 0);
      return prevIndex;
    });
  }, []);

  const displayStepNumber = useMemo(() => {
    if (!currentStep) return currentStepIndex + 1;
    if (
      currentStep.id === "rescue-outcome-retreat" ||
      currentStep.id === "rescue-outcome-sniper"
    ) {
      return 13;
    }
    if (
      currentStep.id === "completion-retreat" ||
      currentStep.id === "completion-sniper"
    ) {
      return 14;
    }
    return Math.min(currentStepIndex + 1, 12);
  }, [currentStep, currentStepIndex]);

  const isVisibleLastStep = useMemo(() => {
    return (
      currentStep?.id === "completion-retreat" ||
      currentStep?.id === "completion-sniper"
    );
  }, [currentStep?.id]);

  const resetTutorial = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setPendingAction(null);
    setLastAction(null);
    resetState();
    setStepSnapshots(TUTORIAL_STEPS.map(() => null));
    setCurrentStepIndex(0);
    if (typeof window !== "undefined") {
      localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, "0");
      window.localStorage.removeItem(TUTORIAL_STEP_SNAPSHOTS_KEY);
    }
  }, [resetState]);

  // Check if current step is complete
  const isStepComplete = useMemo(() => {
    if (!currentStep?.onStepComplete) {
      return true; // If no completion condition, step is always "complete" (can proceed)
    }
    return currentStep.onStepComplete(lastAction);
  }, [currentStep, lastAction]);

  // Step-specific simulated state adjustments. When a snapshot exists for the
  // current step, restore it instead of re-running scripted changes so ship
  // positions and damage persist across navigation and refresh.
  useEffect(() => {
    if (!currentStep) return;

    const snapshot = stepSnapshots[currentStepIndex];
    // For most steps, restore from snapshot if it exists. For scripted steps
    // (score-points, shoot, special-emp, destroy-disabled), only restore when
    // the player has already taken their action (snapshot.lastAction != null).
    // Otherwise use scripted state so the pre-step setup is shown from the start.
    //
    // ship-destruction / rescue: always use scripted state on entry (rescue
    // shares the same board as ship-destruction).
    //
    // ship-destruction: a stale snapshot could restore the wrong lastMove
    // (Heavy shot) instead of the canonical EMP special.
    if (snapshot) {
      const useScriptedInsteadOfSnapshot =
        currentStep.id === "ship-destruction" ||
        currentStep.id === "rescue" ||
        currentStep.id === "rescue-outcome-retreat" ||
        currentStep.id === "rescue-outcome-sniper" ||
        currentStep.id === "completion-sniper" ||
        currentStep.id === "completion-retreat" ||
        ((currentStep.id === "score-points" ||
          currentStep.id === "shoot" ||
          currentStep.id === "end-of-round" ||
          currentStep.id === "special-emp" ||
          currentStep.id === "destroy-disabled") &&
          snapshot.lastAction === null);

      if (useScriptedInsteadOfSnapshot) {
        // Ignore this snapshot and fall through to scripted state.
      } else {
        updateGameState(() => snapshot.gameState);
        setLastAction(snapshot.lastAction);
        // Defer hydration so the board is not shown until the restored state
        // is committed, and record which step index is hydrated.
        const indexForHydration = currentStepIndex;
        queueMicrotask(() => {
          setHydratedStepIndex(indexForHydration);
          setIsStepHydrated(true);
        });
        return;
      }
    }

    // Use canonical scripted state for this step so refresh and step navigation
    // always show the correct cumulative board (all prior moves preserved).
    // Key by step id so the board matches `currentStep` even if step index and
    // scripted array comments ever drift.
    const scriptedState =
      getScriptedStateForTutorialStepId(currentStep.id) ??
      getScriptedStateForStepIndex(currentStepIndex);
    updateGameState(() => scriptedState);

    // Defer hydration until after the game state update is committed, and
    // record which step index is hydrated.
    const indexForHydration = currentStepIndex;
    queueMicrotask(() => {
      setHydratedStepIndex(indexForHydration);
      setIsStepHydrated(true);
    });
    // Intentionally omit `stepSnapshots` from deps: when the user acts on a step
    // (e.g. selectShip), the snapshot effect updates `stepSnapshots` one tick later.
    // Re-running this effect on that update reapplies an older snapshot with
    // lastAction still null and overwrites setLastAction from executeAction,
    // which breaks onStepComplete and causes the Next button to flicker.
    // Re-hydrate only when the active step changes, not when snapshots refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepSnapshots excluded; see above
  }, [currentStep, currentStepIndex, updateGameState]);

  // Invalidate persisted snapshots if canonical tutorial state changed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prevVersion = window.localStorage.getItem(TUTORIAL_DATA_VERSION_KEY);
    if (prevVersion === TUTORIAL_DATA_VERSION) return;

    // Reset persisted progress and snapshots so the UI reflects the new
    // canonical scripted state.
    window.localStorage.removeItem(TUTORIAL_STEP_STORAGE_KEY);
    window.localStorage.removeItem(TUTORIAL_STEP_SNAPSHOTS_KEY);
    window.localStorage.setItem(
      TUTORIAL_DATA_VERSION_KEY,
      TUTORIAL_DATA_VERSION,
    );

    setCurrentStepIndex(0);
    setStepSnapshots(TUTORIAL_STEPS.map(() => null));
    setIsStepHydrated(false);
    setHydratedStepIndex(null);
  }, []);

  const contextValue: TutorialContextValue = useMemo(
    () => ({
      currentStepIndex,
      displayStepNumber,
      displayTotalSteps,
      isVisibleLastStep,
      currentStep,
      gameState,
      isTransactionDialogOpen,
      pendingAction,
      isStepComplete,
      updateGameState,
      validateAction,
      executeAction,
      nextStep,
      previousStep,
      openTransactionDialog,
      closeTransactionDialog,
      approveTransaction,
      rejectTransaction,
      resetTutorial,
      // Expose whether the current step state has been fully hydrated
      // so the UI can avoid flickering when switching steps.
      isStepHydrated,
    }),
    [
      currentStepIndex,
      displayStepNumber,
      displayTotalSteps,
      isVisibleLastStep,
      currentStep,
      gameState,
      isTransactionDialogOpen,
      pendingAction,
      isStepComplete,
      updateGameState,
      validateAction,
      executeAction,
      nextStep,
      previousStep,
      openTransactionDialog,
      closeTransactionDialog,
      approveTransaction,
      rejectTransaction,
      resetTutorial,
      isStepHydrated,
    ],
  );

  return contextValue;
}
