import { useState, useCallback, useMemo, useEffect } from "react";
import { TutorialStep, TutorialAction, TutorialContextValue } from "../types/onboarding";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
import { useSimulatedGameState } from "./useSimulatedGameState";

const TUTORIAL_STEP_STORAGE_KEY = "warpflow-tutorial-step-index";

export function useOnboardingTutorial() {
  // Load saved step index from localStorage, default to 0
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (typeof window !== "undefined") {
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
  const [pendingAction, setPendingAction] = useState<TutorialAction | null>(null);
  const [lastAction, setLastAction] = useState<TutorialAction | null>(null);

  const { gameState, updateGameState, applyAction, resetState } = useSimulatedGameState();

  // Save step index to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, currentStepIndex.toString());
    }
  }, [currentStepIndex]);

  const currentStep = useMemo(() => {
    return TUTORIAL_STEPS[currentStepIndex] || null;
  }, [currentStepIndex]);

  const validateAction = useCallback((action: TutorialAction): { valid: boolean; message?: string } => {
    if (!currentStep) {
      return { valid: false, message: "No active tutorial step" };
    }

    const { allowedActions } = currentStep;

    switch (action.type) {
      case "selectShip":
        if (!allowedActions.selectShip) {
          return { valid: false, message: "Ship selection not allowed in this step" };
        }
        if (action.shipId && !allowedActions.selectShip.includes(action.shipId)) {
          return { valid: false, message: "This ship cannot be selected in this step" };
        }
        return { valid: true };

      case "moveShip":
        if (!allowedActions.moveShip) {
          return { valid: false, message: "Ship movement not allowed in this step" };
        }
        if (action.shipId !== allowedActions.moveShip.shipId) {
          return { valid: false, message: "This ship cannot be moved in this step" };
        }
        if (action.position) {
          const isAllowed = allowedActions.moveShip.allowedPositions.some(
            (pos) => pos.row === action.position!.row && pos.col === action.position!.col
          );
          if (!isAllowed) {
            return { valid: false, message: "This position is not allowed in this step" };
          }
        }
        return { valid: true };

      case "shoot":
        if (!allowedActions.shoot) {
          return { valid: false, message: "Shooting not allowed in this step" };
        }
        if (action.shipId !== allowedActions.shoot.shipId) {
          return { valid: false, message: "This ship cannot shoot in this step" };
        }
        if (action.targetShipId && !allowedActions.shoot.allowedTargets.includes(action.targetShipId)) {
          return { valid: false, message: "This target is not allowed in this step" };
        }
        return { valid: true };

      case "useSpecial":
        if (!allowedActions.useSpecial) {
          return { valid: false, message: "Special abilities not allowed in this step" };
        }
        if (action.shipId !== allowedActions.useSpecial.shipId) {
          return { valid: false, message: "This ship cannot use special in this step" };
        }
        if (action.targetShipId && !allowedActions.useSpecial.allowedTargets.includes(action.targetShipId)) {
          return { valid: false, message: "This target is not allowed in this step" };
        }
        return { valid: true };

      case "assist":
        if (!allowedActions.assist) {
          return { valid: false, message: "Assist not allowed in this step" };
        }
        if (action.shipId !== allowedActions.assist.shipId) {
          return { valid: false, message: "This ship cannot assist in this step" };
        }
        if (action.targetShipId && !allowedActions.assist.allowedTargets.includes(action.targetShipId)) {
          return { valid: false, message: "This target is not allowed in this step" };
        }
        return { valid: true };

      case "claimPoints":
        if (!allowedActions.claimPoints) {
          return { valid: false, message: "Claiming points not allowed in this step" };
        }
        return { valid: true };

      default:
        return { valid: false, message: "Unknown action type" };
    }
  }, [currentStep]);

  const executeAction = useCallback((action: TutorialAction) => {
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

    // If step requires transaction, show dialog first
    // Only show transaction dialog for actions that require it (not selectShip)
    if (
      currentStep?.requiresTransaction &&
      action.type !== "selectShip"
    ) {
      setPendingAction(action);
      setIsTransactionDialogOpen(true);
      return { success: true, pending: true };
    }

    // Otherwise, execute immediately
    applyAction(action);
    setLastAction(action); // Track the last action for step completion checking

    return { success: true };
  }, [currentStep, validateAction, applyAction]);

  const approveTransaction = useCallback(() => {
    if (!pendingAction) return;

    setIsTransactionDialogOpen(false);

    // If action was already executed (showTransactionAfter), just close the dialog
    // Otherwise, execute the action now
    if (!currentStep?.showTransactionAfter) {
      applyAction(pendingAction);
      setLastAction(pendingAction); // Track the last action for step completion checking
    }
    // Note: If showTransactionAfter is true, action was already executed and lastAction was already set

    setPendingAction(null);
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
      const nextIndex = Math.min(prev + 1, TUTORIAL_STEPS.length - 1);
      // Reset last action when moving to next step
      if (nextIndex !== prev) {
        setLastAction(null);
      }
      return nextIndex;
    });
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const prevIndex = Math.max(prev - 1, 0);
      // Reset last action when moving to previous step
      if (prevIndex !== prev) {
        setLastAction(null);
        // Reset game state to initial when going back
        // The step-specific useEffect will then apply the correct state for the previous step
        resetState();
      }
      return prevIndex;
    });
  }, [resetState]);

  const resetTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTransactionDialogOpen(false);
    setPendingAction(null);
    setLastAction(null);
    resetState();
    // Clear saved step index from localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(TUTORIAL_STEP_STORAGE_KEY);
    }
  }, [resetState]);

  // Check if current step is complete
  const isStepComplete = useMemo(() => {
    if (!currentStep?.onStepComplete) {
      return true; // If no completion condition, step is always "complete" (can proceed)
    }
    return currentStep.onStepComplete(lastAction);
  }, [currentStep, lastAction]);

  // Step-specific simulated state adjustments
  useEffect(() => {
    if (!currentStep) return;

    updateGameState((state) => {
      let updatedState = state;

      const ensureStateClone = () => {
        if (updatedState === state) {
          updatedState = {
            ...state,
            shipAttributes: [...state.shipAttributes],
            shipPositions: [...state.shipPositions],
          };
        }
      };

      const updateShipAttributes = (shipId: bigint, updater: (attrs: typeof state.shipAttributes[number]) => void) => {
        const index = state.shipIds.findIndex((id) => id === shipId);
        if (index === -1) return;
        ensureStateClone();
        const attrsCopy = [...updatedState.shipAttributes];
        const attr = { ...attrsCopy[index] };
        updater(attr);
        attrsCopy[index] = attr;
        updatedState.shipAttributes = attrsCopy;
      };

      switch (currentStep.id) {
        case "special-repair": {
          updateShipAttributes(1001n, (attrs) => {
            attrs.hullPoints = Math.max(30, Math.floor(attrs.maxHullPoints * 0.4));
          });
          break;
        }
        case "rescue": {
          updateShipAttributes(1001n, (attrs) => {
            attrs.hullPoints = 0;
            attrs.reactorCriticalTimer = 2;
          });

          ensureStateClone();
          updatedState.shipPositions = updatedState.shipPositions.map((pos) => {
            if (pos.shipId === 1003n) {
              return {
                ...pos,
                position: { row: 6, col: 11 },
              };
            }
            if (pos.shipId === 1001n) {
              return {
                ...pos,
                position: { row: 6, col: 12 },
              };
            }
            return pos;
          });

          updatedState.creatorMovedShipIds = [];
          break;
        }
        case "destroy-disabled": {
          updateShipAttributes(2002n, (attrs) => {
            attrs.hullPoints = 0;
            attrs.reactorCriticalTimer = 2;
          });
          break;
        }
        case "score-points": {
          // Move opponent ship 2003 (Enemy Destroyer) to the scoring tile at (5, 13) and update opponent score
          // Note: This preserves all other ship positions (e.g., Tutorial Scout from step 5)
          ensureStateClone();
          updatedState.shipPositions = updatedState.shipPositions.map((pos) => {
            if (pos.shipId === 2003n) {
              return {
                ...pos,
                position: { row: 5, col: 13 },
              };
            }
            // Preserve all other ship positions unchanged
            return pos;
          });
          // Mark ship as moved
          if (!updatedState.joinerMovedShipIds.includes(2003n)) {
            updatedState.joinerMovedShipIds = [...updatedState.joinerMovedShipIds, 2003n];
          }
          // Increment opponent score
          updatedState.joinerScore = updatedState.joinerScore + 1n;
          // Allow the Tutorial Scout to move again on the next step
          updatedState.creatorMovedShipIds = updatedState.creatorMovedShipIds.filter((id) => id !== 1001n);
          break;
        }
        default:
          // For steps without specific state adjustments, preserve all current state
          // This ensures ship positions from previous steps are maintained
          return state;
      }

      // Return updated state (which may be the same as original state if no modifications were made)
      return updatedState;
    });
  }, [currentStep, updateGameState]);

  const contextValue: TutorialContextValue = useMemo(() => ({
    currentStepIndex,
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
  }), [
    currentStepIndex,
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
  ]);

  return contextValue;
}
