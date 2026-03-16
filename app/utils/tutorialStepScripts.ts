import { SimulatedGameState, TutorialShipId } from "../types/onboarding";
import { ActionType } from "../types/types";

/**
 * Pure per-step scripted adjustments for the tutorial.
 *
 * This takes a base SimulatedGameState (typically the end-of-previous-step
 * state) and returns a new SimulatedGameState with any scripted moves,
 * damage, or score changes applied for the given step id.
 *
 * It has no React or localStorage concerns and does not know about
 * snapshots or hydration flags.
 */
export function applyTutorialStepScript(
  stepId: string,
  state: SimulatedGameState,
): SimulatedGameState {
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

  const updateShipAttributes = (
    shipId: TutorialShipId,
    updater: (attrs: (typeof state.shipAttributes)[number]) => void,
  ) => {
    const index = state.shipIds.findIndex((id) => id === shipId);
    if (index === -1) return;
    ensureStateClone();
    const attrsCopy = [...updatedState.shipAttributes];
    const attr = { ...attrsCopy[index] };
    updater(attr);
    attrsCopy[index] = attr;
    updatedState.shipAttributes = attrsCopy;
  };

  switch (stepId) {
    case "shoot": {
      // Before this step begins, simulate the enemy fighter advancing and
      // firing on the Tutorial Scout in the center.
      ensureStateClone();

      const fighterId: TutorialShipId = "2001";
      const scoutId: TutorialShipId = "1001";

      const fighterPos = updatedState.shipPositions.find(
        (p) => p.shipId === fighterId,
      );
      updatedState.shipPositions = updatedState.shipPositions.map((pos) =>
        pos.shipId === fighterId
          ? {
              ...pos,
              position: { row: 4, col: 8 },
            }
          : pos,
      );

      const targetIndex = updatedState.shipIds.findIndex(
        (id) => id === scoutId,
      );
      const attackerIndex = updatedState.shipIds.findIndex(
        (id) => id === fighterId,
      );

      if (targetIndex !== -1 && attackerIndex !== -1) {
        const newAttributes = [...updatedState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };
        const attackerAttrs = newAttributes[attackerIndex];

        const baseDamage = attackerAttrs.gunDamage;
        const damageReduction = targetAttrs.damageReduction;
        const actualDamage = Math.max(1, baseDamage - damageReduction);

        targetAttrs.hullPoints = Math.max(
          0,
          targetAttrs.hullPoints - actualDamage,
        );

        newAttributes[targetIndex] = targetAttrs;
        updatedState.shipAttributes = newAttributes;
      }

      if (fighterPos) {
        updatedState.lastMove = {
          shipId: fighterId,
          oldRow: fighterPos.position.row,
          oldCol: fighterPos.position.col,
          newRow: 4,
          newCol: 8,
          actionType: ActionType.Shoot,
          targetShipId: scoutId,
        };
      }

      if (!updatedState.joinerMovedShipIds.includes(fighterId)) {
        updatedState.joinerMovedShipIds = [
          ...updatedState.joinerMovedShipIds,
          fighterId,
        ];
      }

      break;
    }

    case "special-emp": {
      // Before this step begins, the Heavy Enemy moves to (5, 9) and fires on the Tutorial EMP.
      ensureStateClone();

      const heavyEnemyId: TutorialShipId = "2002";
      const tutorialEmpId: TutorialShipId = "1001";

      // All 6 ships have already moved in round 1. Start this step on round 2
      // and clear moved flags so the player can act again this round.
      updatedState.turnState = {
        ...updatedState.turnState,
        currentRound: 2,
      };
      updatedState.creatorMovedShipIds = [];
      updatedState.joinerMovedShipIds = [];

      const heavyPos = updatedState.shipPositions.find(
        (p) => p.shipId === heavyEnemyId,
      );
      updatedState.shipPositions = updatedState.shipPositions.map((pos) =>
        pos.shipId === heavyEnemyId
          ? {
              ...pos,
              position: { row: 5, col: 9 },
            }
          : pos,
      );

      const targetIndex = updatedState.shipIds.findIndex(
        (id) => id === tutorialEmpId,
      );
      const attackerIndex = updatedState.shipIds.findIndex(
        (id) => id === heavyEnemyId,
      );

      if (targetIndex !== -1 && attackerIndex !== -1) {
        const newAttributes = [...updatedState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };
        const attackerAttrs = newAttributes[attackerIndex];

        const baseDamage = attackerAttrs.gunDamage;
        const damageReduction = targetAttrs.damageReduction;
        const actualDamage = Math.max(
          1,
          baseDamage - Math.floor((baseDamage * damageReduction) / 100),
        );

        targetAttrs.hullPoints = Math.max(
          0,
          targetAttrs.hullPoints - actualDamage,
        );

        newAttributes[targetIndex] = targetAttrs;
        updatedState.shipAttributes = newAttributes;
      }

      if (heavyPos) {
        updatedState.lastMove = {
          shipId: heavyEnemyId,
          oldRow: heavyPos.position.row,
          oldCol: heavyPos.position.col,
          newRow: 5,
          newCol: 9,
          actionType: ActionType.Shoot,
          targetShipId: tutorialEmpId,
        };
      }

      break;
    }

    case "special-repair": {
      updateShipAttributes("1001", (attrs) => {
        attrs.hullPoints = Math.max(
          30,
          Math.floor(attrs.maxHullPoints * 0.4),
        );
      });
      break;
    }

    case "rescue": {
      updateShipAttributes("1001", (attrs) => {
        attrs.hullPoints = 0;
        attrs.reactorCriticalTimer = 2;
      });

      ensureStateClone();
      updatedState.shipPositions = updatedState.shipPositions.map((pos) => {
        if (pos.shipId === "1003") {
          return {
            ...pos,
            position: { row: 6, col: 11 },
          };
        }
        if (pos.shipId === "1001") {
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
      updateShipAttributes("2002", (attrs) => {
        attrs.hullPoints = 0;
        attrs.reactorCriticalTimer = 2;
      });
      break;
    }

    case "score-points": {
      // Move opponent ship 2003 (Enemy Destroyer) to the scoring tile at
      // (9, 13) and update opponent score. Runs when entering the scoring
      // step so the board shows the enemy's move before the player responds.
      ensureStateClone();
      const pos2003 = state.shipPositions.find((p) => p.shipId === "2003");
      updatedState.shipPositions = updatedState.shipPositions.map((pos) => {
        if (pos.shipId === "2003") {
          return {
            ...pos,
            position: { row: 9, col: 13 },
          };
        }
        return pos;
      });
      if (pos2003) {
        updatedState.lastMove = {
          shipId: "2003",
          oldRow: pos2003.position.row,
          oldCol: pos2003.position.col,
          newRow: 9,
          newCol: 13,
          actionType: ActionType.Pass,
        };
      }
      if (!updatedState.joinerMovedShipIds.includes("2003")) {
        updatedState.joinerMovedShipIds = [
          ...updatedState.joinerMovedShipIds,
          "2003",
        ];
      }
      updatedState.joinerScore = updatedState.joinerScore + 1;
      updatedState.creatorMovedShipIds =
        updatedState.creatorMovedShipIds.filter((id) => id !== "1001");
      break;
    }

    default:
      // For steps without specific state adjustments, preserve all current
      // state. This ensures ship positions from previous steps are maintained.
      return state;
  }

  return updatedState;
}

