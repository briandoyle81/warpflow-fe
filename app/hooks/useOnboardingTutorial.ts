import { useState, useCallback, useMemo, useEffect } from "react";
import {
  TutorialAction,
  TutorialContextValue,
  TUTORIAL_COMPLETED_STEPS_KEY,
  TUTORIAL_RESCUE_BRANCH_KEY,
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
// Bump when canonical tutorial state or step behavior changes; clears saved
// step index and legacy snapshot storage from older clients.
type RescueCompletionBranch = "retreat" | "sniper" | null;

const TUTORIAL_DATA_VERSION =
  "2026-04-01-tutorial-rescue-branch-skip";

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

  const { gameState, updateGameState, applyAction, resetState } =
    useSimulatedGameState();

  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }
    const prevVersion = window.localStorage.getItem(TUTORIAL_DATA_VERSION_KEY);
    if (prevVersion !== TUTORIAL_DATA_VERSION) {
      return new Set();
    }
    try {
      const raw = window.localStorage.getItem(TUTORIAL_COMPLETED_STEPS_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed.filter((id): id is string => typeof id === "string"),
      );
    } catch {
      return new Set();
    }
  });

  const [rescueCompletionBranch, setRescueCompletionBranch] =
    useState<RescueCompletionBranch>(() => {
      if (typeof window === "undefined") {
        return null;
      }
      const prevVersion = window.localStorage.getItem(TUTORIAL_DATA_VERSION_KEY);
      if (prevVersion !== TUTORIAL_DATA_VERSION) {
        return null;
      }
      const raw = window.localStorage.getItem(TUTORIAL_RESCUE_BRANCH_KEY);
      if (raw === "retreat" || raw === "sniper") {
        return raw;
      }
      return null;
    });

  const persistRescueCompletionBranch = useCallback(
    (branch: "retreat" | "sniper") => {
      setRescueCompletionBranch(branch);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(TUTORIAL_RESCUE_BRANCH_KEY, branch);
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    [],
  );

  const addCompletedStepId = useCallback((stepId: string) => {
    setCompletedStepIds((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            TUTORIAL_COMPLETED_STEPS_KEY,
            JSON.stringify([...next]),
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      return next;
    });
  }, []);

  // Save step index to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        TUTORIAL_STEP_STORAGE_KEY,
        currentStepIndex.toString(),
      );
    }
  }, [currentStepIndex]);

  const currentStep = useMemo(() => {
    return TUTORIAL_STEPS[currentStepIndex] || null;
  }, [currentStepIndex]);

  // Whenever the current step index changes, mark the step as not yet
  // hydrated so the UI can avoid briefly showing the previous step's board
  // before canonical scripted state is applied.
  useEffect(() => {
    setIsStepHydrated(false);
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
      addCompletedStepId(currentStep.id);
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

          persistRescueCompletionBranch(empRetreat ? "retreat" : "sniper");

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
  }, [
    pendingAction,
    currentStep,
    applyAction,
    addCompletedStepId,
    persistRescueCompletionBranch,
  ]);

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
    const leaving = TUTORIAL_STEPS[currentStepIndex];
    const naturalComplete = leaving
      ? !leaving.onStepComplete || leaving.onStepComplete(lastAction)
      : false;

    if (leaving?.id === "rescue" && naturalComplete && lastAction) {
      const empRetreat =
        lastAction.type === "moveShip" &&
        lastAction.shipId === "1001" &&
        lastAction.actionType === ActionType.Retreat;
      persistRescueCompletionBranch(empRetreat ? "retreat" : "sniper");
    }

    if (leaving && naturalComplete) {
      addCompletedStepId(leaving.id);
    }

    setCurrentStepIndex((prev) => {
      let nextIndex = Math.min(prev + 1, TUTORIAL_STEPS.length - 1);
      const currentId = TUTORIAL_STEPS[prev]?.id;

      if (currentId === "rescue") {
        const stepAtPrev = TUTORIAL_STEPS[prev];
        const rescueNaturalComplete =
          !stepAtPrev?.onStepComplete ||
          stepAtPrev.onStepComplete(lastAction);
        const retreatOutcomeIndex = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-retreat",
        );
        const sniperOutcomeIndex = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-sniper",
        );
        if (rescueNaturalComplete && lastAction) {
          const empRetreat =
            lastAction.type === "moveShip" &&
            lastAction.shipId === "1001" &&
            lastAction.actionType === ActionType.Retreat;
          if (empRetreat && retreatOutcomeIndex !== -1) {
            nextIndex = retreatOutcomeIndex;
          } else if (sniperOutcomeIndex !== -1) {
            nextIndex = sniperOutcomeIndex;
          }
        } else if (!rescueNaturalComplete) {
          if (
            rescueCompletionBranch === "retreat" &&
            retreatOutcomeIndex !== -1
          ) {
            nextIndex = retreatOutcomeIndex;
          } else if (
            rescueCompletionBranch === "sniper" &&
            sniperOutcomeIndex !== -1
          ) {
            nextIndex = sniperOutcomeIndex;
          }
        }
      }

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
  }, [
    addCompletedStepId,
    currentStepIndex,
    lastAction,
    rescueCompletionBranch,
    persistRescueCompletionBranch,
  ]);

  const previousStep = useCallback(() => {
    // Use the step id from the last committed render so Prev matches what the user
    // sees. Relying only on TUTORIAL_STEPS[prev]?.id can disagree with `currentStep`
    // during hydration or updates, so Victory Achieved would fall through to prev-1
    // (completion-retreat) instead of Accepting a Sacrifice.
    const fromStepId = currentStep?.id;
    setCurrentStepIndex((prev) => {
      if (fromStepId === "completion-retreat") {
        const idx = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-retreat",
        );
        if (idx !== -1) return idx;
      }
      if (fromStepId === "completion-sniper") {
        const idx = TUTORIAL_STEPS.findIndex(
          (s) => s.id === "rescue-outcome-sniper",
        );
        if (idx !== -1) return idx;
      }
      // Fork: array order is rescue → outcome-retreat → outcome-sniper, but the player
      // only visits one outcome. Prev from either outcome must return to rescue, not
      // to the sibling branch step.
      if (
        fromStepId === "rescue-outcome-retreat" ||
        fromStepId === "rescue-outcome-sniper"
      ) {
        const idx = TUTORIAL_STEPS.findIndex((s) => s.id === "rescue");
        if (idx !== -1) return idx;
      }
      return Math.max(prev - 1, 0);
    });
  }, [currentStep?.id]);

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
    setCompletedStepIds(new Set());
    setCurrentStepIndex(0);
    setRescueCompletionBranch(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, "0");
      window.localStorage.removeItem(TUTORIAL_STEP_SNAPSHOTS_KEY);
      window.localStorage.removeItem(TUTORIAL_COMPLETED_STEPS_KEY);
      window.localStorage.removeItem(TUTORIAL_RESCUE_BRANCH_KEY);
    }
  }, [resetState]);

  const isStepNaturallyComplete = useMemo(() => {
    if (!currentStep?.onStepComplete) {
      return true;
    }
    return currentStep.onStepComplete(lastAction);
  }, [currentStep, lastAction]);

  // Allow Next if the player finishes the step now or has completed it before
  // (repeat visits still load canonical start state, but they may skip ahead).
  const isStepComplete = useMemo(() => {
    if (!currentStep) return true;
    if (currentStep.id === "rescue") {
      return (
        isStepNaturallyComplete || rescueCompletionBranch !== null
      );
    }
    return (
      isStepNaturallyComplete || completedStepIds.has(currentStep.id)
    );
  }, [
    currentStep,
    completedStepIds,
    isStepNaturallyComplete,
    rescueCompletionBranch,
  ]);

  // Always hydrate the active step from canonical scripted state when the step
  // changes (Next, Prev, or initial index). Re-entering a step must show its
  // opening board, not an ending snapshot from a prior visit.
  useEffect(() => {
    if (!currentStep) return;

    setLastAction(null);
    const scriptedState =
      getScriptedStateForTutorialStepId(currentStep.id) ??
      getScriptedStateForStepIndex(currentStepIndex);
    updateGameState(() => scriptedState);

    queueMicrotask(() => {
      setIsStepHydrated(true);
    });
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
    window.localStorage.removeItem(TUTORIAL_COMPLETED_STEPS_KEY);
    window.localStorage.removeItem(TUTORIAL_RESCUE_BRANCH_KEY);
    window.localStorage.setItem(
      TUTORIAL_DATA_VERSION_KEY,
      TUTORIAL_DATA_VERSION,
    );

    setCurrentStepIndex(0);
    setCompletedStepIds(new Set());
    setRescueCompletionBranch(null);
    setIsStepHydrated(false);
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
