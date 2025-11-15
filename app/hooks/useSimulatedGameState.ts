import { useState, useCallback } from "react";
import { SimulatedGameState, TutorialAction } from "../types/onboarding";
import { ActionType, Position, ShipPosition, Attributes } from "../types/types";
import { createInitialTutorialGameState } from "../data/tutorialGameState";

export function useSimulatedGameState() {
  const [gameState, setGameState] = useState<SimulatedGameState>(() =>
    createInitialTutorialGameState()
  );

  const updateGameState = useCallback((
    updater: (state: SimulatedGameState) => SimulatedGameState
  ) => {
    setGameState(updater);
  }, []);

  const applyAction = useCallback((action: TutorialAction) => {
    setGameState((prev) => {
      const newState = { ...prev };

      switch (action.type) {
        case "moveShip": {
          if (!action.shipId || !action.position) break;

          // Update ship position
          const shipPosIndex = newState.shipPositions.findIndex(
            (pos) => pos.shipId === action.shipId
          );
          if (shipPosIndex !== -1) {
            newState.shipPositions = [...newState.shipPositions];
            newState.shipPositions[shipPosIndex] = {
              ...newState.shipPositions[shipPosIndex],
              position: action.position,
            };
          }

          // Mark ship as moved
          if (!newState.creatorMovedShipIds.includes(action.shipId)) {
            newState.creatorMovedShipIds = [...newState.creatorMovedShipIds, action.shipId];
          }

          // Check if position is a scoring tile and update score
          // For tutorial, we'll check if it's a known scoring position
          const isScoringTile =
            (action.position.row === 6 && action.position.col === 11) ||
            (action.position.row === 6 && action.position.col === 12);
          if (isScoringTile && action.type === "moveShip") {
            newState.creatorScore = newState.creatorScore + 1n;
          }
          break;
        }

        case "shoot": {
          if (!action.shipId || !action.targetShipId) break;

          // Find target ship attributes
          const targetIndex = newState.shipIds.findIndex(
            (id) => id === action.targetShipId
          );
          if (targetIndex !== -1) {
            const newAttributes = [...newState.shipAttributes];
            const targetAttrs = { ...newAttributes[targetIndex] };

            // Calculate damage (simplified for tutorial)
            const attackerIndex = newState.shipIds.findIndex(
              (id) => id === action.shipId
            );
            if (attackerIndex !== -1) {
              const attackerAttrs = newState.shipAttributes[attackerIndex];
              const baseDamage = attackerAttrs.gunDamage;
              const damageReduction = targetAttrs.damageReduction;
              const actualDamage = Math.max(1, baseDamage - damageReduction);

              targetAttrs.hullPoints = Math.max(0, targetAttrs.hullPoints - actualDamage);

              // If disabled, set reactor critical timer
              if (targetAttrs.hullPoints === 0 && targetAttrs.reactorCriticalTimer === 0) {
                targetAttrs.reactorCriticalTimer = 3; // 3 turns until destruction
              }

              // If shooting disabled ship, destroy it
              if (targetAttrs.hullPoints === 0 && targetAttrs.reactorCriticalTimer > 0) {
                targetAttrs.reactorCriticalTimer = 0;
                // Remove from active ships
                if (newState.creatorActiveShipIds.includes(action.targetShipId!)) {
                  newState.creatorActiveShipIds = newState.creatorActiveShipIds.filter(
                    (id) => id !== action.targetShipId
                  );
                } else if (newState.joinerActiveShipIds.includes(action.targetShipId!)) {
                  newState.joinerActiveShipIds = newState.joinerActiveShipIds.filter(
                    (id) => id !== action.targetShipId
                  );
                }
              }

              newAttributes[targetIndex] = targetAttrs;
              newState.shipAttributes = newAttributes;
            }
          }
          break;
        }

        case "useSpecial": {
          if (!action.shipId || !action.targetShipId) break;

          // Find target ship
          const targetIndex = newState.shipIds.findIndex(
            (id) => id === action.targetShipId
          );
          if (targetIndex !== -1) {
            const newAttributes = [...newState.shipAttributes];
            const targetAttrs = { ...newAttributes[targetIndex] };

            // Apply special effect based on special type
            // For tutorial, we'll handle EMP and Repair
            // EMP: Add disabled status
            // Repair: Restore hull
            if (action.specialType === 1) {
              // EMP - disable ship
              targetAttrs.statusEffects = [...(targetAttrs.statusEffects || []), 1]; // 1 = disabled
            } else if (action.specialType === 2) {
              // Repair - restore hull
              const healAmount = 30;
              targetAttrs.hullPoints = Math.min(
                targetAttrs.maxHullPoints,
                targetAttrs.hullPoints + healAmount
              );
            }

            newAttributes[targetIndex] = targetAttrs;
            newState.shipAttributes = newAttributes;
          }
          break;
        }

        case "assist": {
          if (!action.shipId || !action.targetShipId) break;

          // Find target ship (disabled friendly)
          const targetIndex = newState.shipIds.findIndex(
            (id) => id === action.targetShipId
          );
          if (targetIndex !== -1) {
            const newAttributes = [...newState.shipAttributes];
            const targetAttrs = { ...newAttributes[targetIndex] };

            // Assist restores some hull and resets reactor timer
            const healAmount = 20;
            targetAttrs.hullPoints = Math.min(
              targetAttrs.maxHullPoints,
              targetAttrs.hullPoints + healAmount
            );
            targetAttrs.reactorCriticalTimer = 0;

            newAttributes[targetIndex] = targetAttrs;
            newState.shipAttributes = newAttributes;
          }
          break;
        }

        case "claimPoints": {
          // Points are automatically claimed when moving to scoring tiles
          // This is handled in moveShip case
          break;
        }
      }

      return newState;
    });
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
