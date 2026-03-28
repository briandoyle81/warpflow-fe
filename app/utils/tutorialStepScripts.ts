import { SimulatedGameState, TutorialShipId } from "../types/onboarding";
import { ActionType } from "../types/types";
import { applyTutorialAction } from "./simulatedTutorialRules";
import { tutorialDefaultScoringPoints } from "./tutorialMapScoring";

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
      // firing on the Tutorial EMP in the center.
      ensureStateClone();

      const fighterId: TutorialShipId = "2001";
      const empId: TutorialShipId = "1001";

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

      const targetIndex = updatedState.shipIds.findIndex((id) => id === empId);
      const attackerIndex = updatedState.shipIds.findIndex(
        (id) => id === fighterId,
      );

      if (targetIndex !== -1 && attackerIndex !== -1) {
        const newAttributes = [...updatedState.shipAttributes];
        const targetAttrs = { ...newAttributes[targetIndex] };
        const attackerAttrs = newAttributes[attackerIndex];

        const baseDamage = attackerAttrs.gunDamage;
        const damageReductionPercent = targetAttrs.damageReduction;
        const actualDamage = Math.max(
          1,
          baseDamage - Math.floor((baseDamage * damageReductionPercent) / 100),
        );

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
          targetShipId: empId,
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

    case "end-of-round": {
      // After the prior step (shoot) completes: round has ended. Advance to the
      // next round, clear all "moved this round" markers, and hand initiative
      // to the opponent (joiner goes first this round; creator went first last round).
      // lastMove remains the Tutorial Sniper's shot on the Enemy Fighter.
      ensureStateClone();
      updatedState.turnState = {
        ...updatedState.turnState,
        currentRound: 2,
        currentTurn: updatedState.metadata.joiner,
      };
      updatedState.creatorMovedShipIds = [];
      updatedState.joinerMovedShipIds = [];
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

      // Heavy has moved and fired this round; show the moved marker on that ship.
      if (!updatedState.joinerMovedShipIds.includes(heavyEnemyId)) {
        updatedState.joinerMovedShipIds = [
          ...updatedState.joinerMovedShipIds,
          heavyEnemyId,
        ];
      }

      // Opponent's scripted shot is done; it is now the player's turn to act (EMP).
      updatedState.turnState = {
        ...updatedState.turnState,
        currentTurn: updatedState.metadata.creator,
      };

      break;
    }

    case "ship-destruction": {
      // After the EMP attack, the Heavy Enemy has been destroyed by reactor overload
      // and the last move should show the Tutorial EMP firing on it. The EMP ship
      // should retain whatever damage it had before this step (from the Heavy
      // Enemy's pre-step shot), so we do NOT modify its hull here.
      updateShipAttributes("2002", (attrs) => {
        attrs.hullPoints = 0;
        // Reactor overload of 3 represents permanent destruction.
        attrs.reactorCriticalTimer = 3;
      });

      ensureStateClone();
      updatedState.shipPositions = updatedState.shipPositions.map((pos) =>
        pos.shipId === "2002" ? { ...pos, status: 1 as const } : pos,
      );

      const empPos = updatedState.shipPositions.find(
        (p) => p.shipId === "1001",
      );
      const heavyPos = updatedState.shipPositions.find(
        (p) => p.shipId === "2002",
      );

      if (empPos && heavyPos) {
        updatedState.lastMove = {
          shipId: "1001",
          oldRow: empPos.position.row,
          oldCol: empPos.position.col,
          newRow: empPos.position.row,
          newCol: empPos.position.col,
          actionType: ActionType.Special,
          targetShipId: "2002",
        };
      }

      // Player has used EMP this round; show the moved marker on Tutorial EMP
      // (canonical state does not run applyTutorialAction(useSpecial)).
      if (!updatedState.creatorMovedShipIds.includes("1001")) {
        updatedState.creatorMovedShipIds = [
          ...updatedState.creatorMovedShipIds,
          "1001",
        ];
      }

      // Step 11 should display the opponent's turn.
      ensureStateClone();
      updatedState.turnState = {
        ...updatedState.turnState,
        currentTurn: updatedState.metadata.joiner,
      };

      break;
    }

    case "rescue": {
      // Enemy Sniper (2003) railgun shot on Tutorial EMP (1001): 0 HP, disabled.
      // EMP keeps its starting 2 reactor damage points; this shot does not add
      // a third overload point. Last move is the sniper shooting.
      const sniperId: TutorialShipId = "2003";
      const empId: TutorialShipId = "1001";

      let next = applyTutorialAction(state, {
        type: "shoot",
        shipId: sniperId,
        targetShipId: empId,
      });

      if (!next.creatorActiveShipIds.includes(empId)) {
        next = {
          ...next,
          creatorActiveShipIds: [...next.creatorActiveShipIds, empId],
        };
      }

      const empIdx = next.shipIds.findIndex((id) => id === empId);
      if (empIdx !== -1) {
        const sa = [...next.shipAttributes];
        const a = { ...sa[empIdx] };
        a.hullPoints = 0;
        a.reactorCriticalTimer = 2;
        sa[empIdx] = a;
        next = { ...next, shipAttributes: sa };
      }

      const sniperPos = next.shipPositions.find((p) => p.shipId === sniperId);
      if (sniperPos) {
        next = {
          ...next,
          lastMove: {
            shipId: sniperId,
            oldRow: sniperPos.position.row,
            oldCol: sniperPos.position.col,
            newRow: sniperPos.position.row,
            newCol: sniperPos.position.col,
            actionType: ActionType.Shoot,
            targetShipId: empId,
          },
        };
      }

      if (!next.joinerMovedShipIds.includes(sniperId)) {
        next = {
          ...next,
          joinerMovedShipIds: [...next.joinerMovedShipIds, sniperId],
        };
      }

      // Step 12 begins on the player's turn.
      next = {
        ...next,
        turnState: {
          ...next.turnState,
          currentTurn: next.metadata.creator,
        },
      };

      updatedState = next;
      break;
    }

    case "destroy-disabled": {
      updateShipAttributes("2002", (attrs) => {
        attrs.hullPoints = 0;
        attrs.reactorCriticalTimer = 2;
      });
      break;
    }

    case "rescue-outcome-retreat": {
      const empId: TutorialShipId = "1001";
      const empPos = state.shipPositions.find(
        (p) => p.shipId === empId,
      )?.position;
      if (!empPos) return state;

      updatedState = applyTutorialAction(state, {
        type: "moveShip",
        shipId: empId,
        position: empPos,
        actionType: ActionType.Retreat,
      });

      // Step 13 retreat outcome begins on the opponent's turn:
      // the EMP has fled and the enemy can seize the undefended resource.
      updatedState = {
        ...updatedState,
        turnState: {
          ...updatedState.turnState,
          currentTurn: updatedState.metadata.joiner,
        },
      };
      break;
    }

    case "completion-retreat": {
      // Enemy seizes the center scoring tile after your retreat.
      const fighterId: TutorialShipId = "2001";
      updatedState = applyTutorialAction(state, {
        type: "moveShip",
        shipId: fighterId,
        position: { row: 5, col: 8 },
      });

      // Now it's your turn.
      updatedState = {
        ...updatedState,
        turnState: {
          ...updatedState.turnState,
          currentTurn: updatedState.metadata.creator,
        },
      };

      break;
    }

    case "rescue-outcome-sniper": {
      // Canonical branch after choosing sniper shot on step 12:
      // 1) Player sniper fires on enemy fighter.
      // 2) Enemy fighter responds and destroys disabled EMP.
      const sniperId: TutorialShipId = "1002";
      const fighterId: TutorialShipId = "2001";
      const empId: TutorialShipId = "1001";

      let next = applyTutorialAction(state, {
        type: "shoot",
        shipId: sniperId,
        targetShipId: fighterId,
      });

      next = applyTutorialAction(next, {
        type: "shoot",
        shipId: fighterId,
        targetShipId: empId,
      });

      // Keep destroyed EMP at its tile with status=1 so last-move destroyed-target
      // rendering can show the enemy fighter's plasma kill on this step.
      next = {
        ...next,
        shipPositions: next.shipPositions.map((p) =>
          p.shipId === empId ? { ...p, status: 1 as const } : p,
        ),
        creatorActiveShipIds: next.creatorActiveShipIds.filter(
          (id) => id !== empId,
        ),
        turnState: {
          ...next.turnState,
          currentTurn: next.metadata.creator,
        },
      };

      updatedState = next;
      break;
    }

    case "completion-sniper": {
      // Victory path Step 14: canonical last move is Tutorial Fighter to the
      // center scoring tile and a shot on the Enemy Fighter (ideal tx outcome).
      const playerFighterId: TutorialShipId = "1003";
      const enemyFighterId: TutorialShipId = "2001";

      let next = applyTutorialAction(state, {
        type: "moveShip",
        shipId: playerFighterId,
        position: { row: 5, col: 8 },
      });
      next = applyTutorialAction(next, {
        type: "shoot",
        shipId: playerFighterId,
        targetShipId: enemyFighterId,
        actionType: ActionType.Shoot,
      });
      updatedState = next;
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
      updatedState.joinerScore =
        updatedState.joinerScore + tutorialDefaultScoringPoints(9, 13);
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
