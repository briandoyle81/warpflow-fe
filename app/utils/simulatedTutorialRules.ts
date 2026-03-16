import { SimulatedGameState, TutorialAction } from "../types/onboarding";
import { ActionType } from "../types/types";

/**
 * Pure rules engine for the simulated tutorial game.
 * Takes a previous SimulatedGameState and a TutorialAction, and returns
 * the next SimulatedGameState without any React or tutorial-step concerns.
 */
export function applyTutorialAction(
  prev: SimulatedGameState,
  action: TutorialAction,
): SimulatedGameState {
  const newState: SimulatedGameState = { ...prev };

  switch (action.type) {
    case "moveShip": {
      if (!action.shipId || !action.position) break;

      const shipPosIndex = newState.shipPositions.findIndex(
        (pos) => pos.shipId === action.shipId,
      );
      const oldPosition =
        shipPosIndex !== -1
          ? newState.shipPositions[shipPosIndex].position
          : null;

      if (shipPosIndex !== -1) {
        newState.shipPositions = [...newState.shipPositions];
        newState.shipPositions[shipPosIndex] = {
          ...newState.shipPositions[shipPosIndex],
          position: action.position,
        };
      }

      if (oldPosition) {
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: oldPosition.row,
          oldCol: oldPosition.col,
          newRow: action.position.row,
          newCol: action.position.col,
          actionType: ActionType.Pass,
        };
      }

      if (!newState.creatorMovedShipIds.includes(action.shipId)) {
        newState.creatorMovedShipIds = [
          ...newState.creatorMovedShipIds,
          action.shipId,
        ];
      }

      const isScoringTile =
        (action.position.row === 6 && action.position.col === 11) ||
        (action.position.row === 6 && action.position.col === 12);
      if (isScoringTile && action.type === "moveShip") {
        newState.creatorScore = newState.creatorScore + 1;
      }
      break;
    }

    case "shoot": {
      if (!action.shipId || !action.targetShipId) break;

      const shooterPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (shooterPos) {
        const { row, col } = shooterPos.position;
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: row,
          oldCol: col,
          newRow: row,
          newCol: col,
          actionType: ActionType.Shoot,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };

        const attackerIndex = newState.shipIds.findIndex(
          (id) => id === action.shipId,
        );
        if (attackerIndex !== -1) {
          const attackerAttrs = newState.shipAttributes[attackerIndex];
          const baseDamage = attackerAttrs.gunDamage;
          const damageReductionPercent = targetAttrs.damageReduction;
          const reducedDamage = Math.max(
            1,
            baseDamage -
              Math.floor((baseDamage * damageReductionPercent) / 100),
          );

          targetAttrs.hullPoints = Math.max(
            0,
            targetAttrs.hullPoints - reducedDamage,
          );

          if (
            targetAttrs.hullPoints === 0 &&
            targetAttrs.reactorCriticalTimer === 0
          ) {
            targetAttrs.reactorCriticalTimer = 3;
          }

          if (
            targetAttrs.hullPoints === 0 &&
            targetAttrs.reactorCriticalTimer > 0
          ) {
            targetAttrs.reactorCriticalTimer = 0;
            if (
              newState.creatorActiveShipIds.includes(action.targetShipId)
            ) {
              newState.creatorActiveShipIds =
                newState.creatorActiveShipIds.filter(
                  (id) => id !== action.targetShipId,
                );
            } else if (
              newState.joinerActiveShipIds.includes(action.targetShipId)
            ) {
              newState.joinerActiveShipIds =
                newState.joinerActiveShipIds.filter(
                  (id) => id !== action.targetShipId,
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

      const actorPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (actorPos) {
        const { row, col } = actorPos.position;
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: row,
          oldCol: col,
          newRow: row,
          newCol: col,
          actionType: ActionType.Special,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];

        const targetAttrs = { ...newAttributes[targetIndex] };

        if (action.specialType === 1) {
          targetAttrs.statusEffects = [
            ...(targetAttrs.statusEffects || []),
            1,
          ];
        } else if (action.specialType === 2) {
          const healAmount = 30;
          targetAttrs.hullPoints = Math.min(
            targetAttrs.maxHullPoints,
            targetAttrs.hullPoints + healAmount,
          );
        }

        newAttributes[targetIndex] = targetAttrs;
        newState.shipAttributes = newAttributes;
      }
      break;
    }

    case "assist": {
      if (!action.shipId || !action.targetShipId) break;

      const actorPos = newState.shipPositions.find(
        (pos) => pos.shipId === action.shipId,
      );
      if (actorPos) {
        const { row, col } = actorPos.position;
        newState.lastMove = {
          shipId: action.shipId,
          oldRow: row,
          oldCol: col,
          newRow: row,
          newCol: col,
          actionType: ActionType.Assist,
          targetShipId: action.targetShipId,
        };
      }

      const targetIndex = newState.shipIds.findIndex(
        (id) => id === action.targetShipId,
      );
      if (targetIndex !== -1) {
        const newAttributes = [...newState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };

        const healAmount = 20;
        targetAttrs.hullPoints = Math.min(
          targetAttrs.maxHullPoints,
          targetAttrs.hullPoints + healAmount,
        );
        targetAttrs.reactorCriticalTimer = 0;

        newAttributes[targetIndex] = targetAttrs;
        newState.shipAttributes = newAttributes;
      }
      break;
    }

    case "claimPoints": {
      // Points are automatically claimed when moving to scoring tiles in moveShip.
      break;
    }
  }

  return newState;
}

