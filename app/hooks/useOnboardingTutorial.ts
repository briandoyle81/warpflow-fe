import { useState, useCallback, useMemo, useEffect } from "react";
import { TutorialStep, TutorialAction, TutorialContextValue } from "../types/onboarding";
import { TUTORIAL_STEPS } from "../data/tutorialSteps";
import { useSimulatedGameState } from "./useSimulatedGameState";

export function useOnboardingTutorial() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<TutorialAction | null>(null);

  const { gameState, updateGameState, applyAction, resetState } = useSimulatedGameState();

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

    // If step requires transaction, show dialog first
    if (currentStep?.requiresTransaction) {
      setPendingAction(action);
      setIsTransactionDialogOpen(true);
      return { success: true, pending: true };
    }

    // Otherwise, execute immediately
    applyAction(action);

    return { success: true };
  }, [currentStep, validateAction, applyAction]);

  const approveTransaction = useCallback(() => {
    if (!pendingAction) return;

    setIsTransactionDialogOpen(false);
    applyAction(pendingAction);

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
    setCurrentStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const resetTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTransactionDialogOpen(false);
    setPendingAction(null);
    resetState();
  }, [resetState]);

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
        default:
          return state;
      }

      return updatedState;
    });
  }, [currentStep, updateGameState]);

  const contextValue: TutorialContextValue = useMemo(() => ({
    currentStepIndex,
    currentStep,
    gameState,
    isTransactionDialogOpen,
    pendingAction,
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
