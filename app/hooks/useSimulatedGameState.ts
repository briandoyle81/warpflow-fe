import { useState, useCallback } from "react";
import { SimulatedGameState, TutorialAction } from "../types/onboarding";
import { createInitialTutorialGameState } from "../data/tutorialGameState";
import { applyTutorialAction } from "../utils/simulatedTutorialRules";

export function useSimulatedGameState() {
  const [gameState, setGameState] = useState<SimulatedGameState>(() =>
    createInitialTutorialGameState(),
  );

  const updateGameState = useCallback(
    (updater: (state: SimulatedGameState) => SimulatedGameState) => {
      setGameState(updater);
    },
    [],
  );

  const applyAction = useCallback((action: TutorialAction) => {
    setGameState((prev) => applyTutorialAction(prev, action));
  }, []);

  const resetState = useCallback(() => {
    setGameState(createInitialTutorialGameState());
  }, []);

  return {
    gameState,
    updateGameState,
    applyAction,
    resetState,
  };
}
