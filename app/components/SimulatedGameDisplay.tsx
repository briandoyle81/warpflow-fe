"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import defaultMap from "../../public/default_map.json";
import {
  TutorialContextValue,
  TutorialShipId,
  TutorialAction,
} from "../types/onboarding";
import {
  ALL_TUTORIAL_SHIPS,
  TUTORIAL_PLAYER_ADDRESS,
} from "../data/tutorialShips";
import {
  buildMapGridsFromDefaultMap,
  type DefaultMapShape,
} from "../utils/mapGridUtils";
import { toast } from "react-hot-toast";
import {
  ActionType,
  ShipPosition,
  Attributes,
  Ship,
  LastMove,
  getMainWeaponName,
  getSpecialName,
} from "../types/types";
import { GameGrid } from "./GameGrid";
import { TutorialStepOverlay } from "./TutorialStepOverlay";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameEvents } from "./GameEvents";
import { getScriptedStateForTutorialStepId } from "../data/tutorialScriptedStates";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import ShipCard from "./ShipCard";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";
import {
  computeMovementRange,
  computeShootingRange,
} from "../utils/gameGridRanges";

interface SimulatedGameDisplayProps {
  tutorialContext: TutorialContextValue;
  /** Called when user clicks back; exits tutorial and returns to Info tab. */
  onBack?: () => void;
}

const GRID_WIDTH = 17;
const GRID_HEIGHT = 11;

export function SimulatedGameDisplay({
  tutorialContext,
  onBack,
}: SimulatedGameDisplayProps) {
  const {
    gameState,
    currentStep,
    currentStepIndex,
    validateAction,
    executeAction,
    isStepHydrated,
  } = tutorialContext;

  // For display we follow the main game and keep the selected ship ID as bigint
  // (so GameGrid behavior and animations are identical). When we need to talk
  // to tutorial state, we convert to/from TutorialShipId (string) at the edges.
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special"
  >("weapon");

  // Deselect all ships when moving between steps. Use layout effect so that
  // selection and previews are cleared before the new step is painted, which
  // avoids a single-frame flicker of the previous step's selection state.
  useLayoutEffect(() => {
    setSelectedShipId(null);
    setPreviewPosition(null);
    setTargetShipId(null);
    setSelectedWeaponType("weapon");
  }, [currentStepIndex]);
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null>(null);
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Mirror live game: whose turn it is comes from simulated state (e.g. after
  // end of round, opponent may go first).
  const isMyTurn =
    gameState.turnState.currentTurn.toLowerCase() ===
    TUTORIAL_PLAYER_ADDRESS.toLowerCase();

  // Map of on-chain ship ID (bigint) to ship object. Tutorial IDs are strings;
  // when we need a ship we convert TutorialShipId -> bigint for this map only.
  const shipMap = useMemo(() => {
    return new Map<bigint, Ship>(
      ALL_TUTORIAL_SHIPS.map((ship) => [ship.id, ship]),
    );
  }, []);

  // Create grids from default map (same format as real game map grids)
  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMemo(
    () =>
      buildMapGridsFromDefaultMap(
        defaultMap as DefaultMapShape,
        GRID_WIDTH,
        GRID_HEIGHT,
      ),
    [],
  );

  // Get ship attributes by ship ID from game state (tutorial IDs are strings)
  const getShipAttributes = useCallback(
    (shipId: TutorialShipId | bigint): Attributes | null => {
      const idString = typeof shipId === "bigint" ? shipId.toString() : shipId;
      const shipIndex = gameState.shipIds?.findIndex((id) => id === idString);
      if (
        shipIndex === -1 ||
        !gameState.shipAttributes ||
        !gameState.shipAttributes[shipIndex]
      ) {
        return null;
      }
      return gameState.shipAttributes[shipIndex];
    },
    [gameState.shipAttributes, gameState.shipIds],
  );

  const allShipPositionsForGrid = useMemo(
    () =>
      gameState.shipPositions.map((shipPosition) => ({
        shipId: BigInt(shipPosition.shipId),
        position: shipPosition.position,
        isCreator: shipPosition.isCreator,
        isPreview: shipPosition.isPreview,
        status: shipPosition.status,
      })),
    [gameState.shipPositions],
  );

  const aliveShipPositions = useMemo(
    () =>
      gameState.shipPositions.filter(
        (shipPosition) => (shipPosition.status ?? 0) === 0,
      ),
    [gameState.shipPositions],
  );

  // Canonical lastMove when the live gameState might not match the scripted step.
  // destroy-disabled: a bad persisted snapshot can omit lastMove; fall back.
  const tutorialDisplayLastMove = useMemo(() => {
    if (currentStep?.id === "ship-destruction") {
      return (
        getScriptedStateForTutorialStepId("ship-destruction")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "rescue") {
      return (
        getScriptedStateForTutorialStepId("rescue")?.lastMove ??
        gameState.lastMove
      );
    }
    if (currentStep?.id === "destroy-disabled" && !gameState.lastMove) {
      return (
        getScriptedStateForTutorialStepId("destroy-disabled")?.lastMove ??
        gameState.lastMove
      );
    }
    return gameState.lastMove;
  }, [currentStep?.id, gameState.lastMove]);

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Check if a ship belongs to the tutorial player. GameGrid passes bigint IDs,
  // so this matches the main game's signature and uses the bigint-based map.
  const isShipOwnedByCurrentPlayer = useCallback(
    (shipId: bigint): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : false;
    },
    [shipMap],
  );

  // Build a set of shipIds that have already moved this round (string IDs)
  const movedShipIdsSet = useMemo(() => {
    const set = new Set<TutorialShipId>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(id));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(id));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  // Track when we should show the proposed move / top action UI, mirroring the
  // main game's behavior: it appears as soon as you select one of your ships
  // that can act this round, even before choosing a destination.
  const isShowingProposedMove = useMemo(() => {
    if (selectedShipId === null || !isMyTurn) {
      return false;
    }
    const idString = selectedShipId.toString() as TutorialShipId;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;
    if (movedShipIdsSet.has(idString)) {
      const attrs = getShipAttributes(idString);
      const isDisabled = attrs && attrs.hullPoints === 0;
      if (!isDisabled) return false;
    }
    return true;
  }, [
    selectedShipId,
    isMyTurn,
    isShipOwnedByCurrentPlayer,
    movedShipIdsSet,
    getShipAttributes,
  ]);

  const isSelectedShipDisabled = useMemo(() => {
    if (!selectedShipId) return false;
    const attrs = getShipAttributes(selectedShipId);
    return !!attrs && attrs.hullPoints === 0;
  }, [selectedShipId, getShipAttributes]);

  const isCellOccupiedByAliveShip = useCallback(
    (row: number, col: number) =>
      gameState.shipPositions.some(
        (pos) =>
          (pos.status ?? 0) === 0 &&
          pos.position.row === row &&
          pos.position.col === col,
      ),
    [gameState.shipPositions],
  );

  // Mirror live-game retreat prep visual: when a disabled ship is selected on
  // the player's turn, show the in-cell retreat effect (flip + engine glow).
  const retreatPrepShipId = useMemo(() => {
    if (!isMyTurn || !selectedShipId || !isSelectedShipDisabled) return null;
    return selectedShipId;
  }, [isMyTurn, selectedShipId, isSelectedShipDisabled]);

  const retreatPrepIsCreator = useMemo(() => {
    if (retreatPrepShipId == null) return null;
    const ship = shipMap.get(retreatPrepShipId);
    return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : null;
  }, [retreatPrepShipId, shipMap]);

  // Match live-game behavior: selecting a disabled ship enters retreat-only mode.
  useEffect(() => {
    if (!selectedShipId || !isSelectedShipDisabled) return;
    setTargetShipId(null);
    setPreviewPosition(null);
    setSelectedWeaponType("weapon");
  }, [selectedShipId, isSelectedShipDisabled]);

  // Check line of sight between two positions
  const hasLineOfSight = useCallback(
    (
      row0: number,
      col0: number,
      row1: number,
      col1: number,
      blockedGrid: boolean[][],
    ): boolean => {
      if (blockedGrid[row0] && blockedGrid[row0][col0]) {
        return false;
      }
      if (blockedGrid[row1] && blockedGrid[row1][col1]) {
        return false;
      }

      const dx = Math.abs(col1 - col0);
      const dy = Math.abs(row1 - row0);
      const sx = col0 < col1 ? 1 : -1;
      const sy = row0 < row1 ? 1 : -1;
      let err = dx - dy;

      let x = col0;
      let y = row0;

      while (true) {
        if (x === col1 && y === row1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }

        if (
          (x !== col0 || y !== row0) &&
          (x !== col1 || y !== row1) &&
          blockedGrid[y] &&
          blockedGrid[y][x]
        ) {
          return false;
        }
      }

      return true;
    },
    [],
  );

  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid. Convert tutorial string IDs into the
    // bigint-based ShipPosition shape expected by GameGrid, but keep
    // the original tutorial IDs in gameState.
    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;
      const shipIdBigInt = BigInt(shipPosition.shipId);
      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        const basePosition: ShipPosition = {
          shipId: shipIdBigInt,
          position,
          isCreator: shipPosition.isCreator,
          isPreview: shipPosition.isPreview,
          status: shipPosition.status,
        };
        newGrid[position.row][position.col] = basePosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipIdBigInt && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...basePosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    // Last move UI: show ghost at old position when no ship is selected (same as in-game)
    const canShowLastMove =
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.shipId !== undefined;
    if (canShowLastMove && tutorialDisplayLastMove) {
      const lm = tutorialDisplayLastMove;
      const oldPos = { row: lm.oldRow, col: lm.oldCol };
      const newPos = { row: lm.newRow, col: lm.newCol };
      if (
        (oldPos.row !== newPos.row || oldPos.col !== newPos.col) &&
        oldPos.row >= 0 &&
        oldPos.row < GRID_HEIGHT &&
        oldPos.col >= 0 &&
        oldPos.col < GRID_WIDTH &&
        !newGrid[oldPos.row][oldPos.col]
      ) {
        const lastMoveShipPosition = aliveShipPositions.find(
          (pos) => pos.shipId === lm.shipId,
        );
        if (lastMoveShipPosition) {
          newGrid[oldPos.row][oldPos.col] = {
            shipId: BigInt(lm.shipId),
            position: oldPos,
            isCreator: lastMoveShipPosition.isCreator,
            isPreview: true,
            status: lastMoveShipPosition.status,
          };
        }
      }

      const lmAction = Number(lm.actionType);
      const isTargetingLastMove =
        lmAction === ActionType.Shoot || lmAction === ActionType.Special;
      if (isTargetingLastMove && lm.targetShipId && lm.targetShipId !== "0") {
        let destroyedTargetShipPosition = gameState.shipPositions.find(
          (shipPosition) =>
            shipPosition.shipId === lm.targetShipId && shipPosition.status === 1,
        );
        // Stale/persisted gameState can omit status on the Heavy; canonical
        // scripted positions still place the destroyed target so EMP can resolve.
        if (
          !destroyedTargetShipPosition &&
          currentStep?.id === "ship-destruction"
        ) {
          const scripted = getScriptedStateForTutorialStepId("ship-destruction");
          destroyedTargetShipPosition = scripted?.shipPositions.find(
            (p) => p.shipId === lm.targetShipId,
          );
        }
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (
            row >= 0 &&
            row < GRID_HEIGHT &&
            col >= 0 &&
            col < GRID_WIDTH &&
            !newGrid[row][col]
          ) {
            newGrid[row][col] = {
              shipId: BigInt(destroyedTargetShipPosition.shipId),
              position: destroyedTargetShipPosition.position,
              isCreator: destroyedTargetShipPosition.isCreator,
              isPreview: destroyedTargetShipPosition.isPreview,
              status: destroyedTargetShipPosition.status,
            };
          }
        }
      }
    }

    return newGrid;
  }, [
    aliveShipPositions,
    gameState.shipPositions,
    tutorialDisplayLastMove,
    selectedShipId,
    previewPosition,
    currentStep?.id,
  ]);

  // Calculate movement range for selected ship.
  // Mirrors the main GameDisplay logic, then applies tutorial step constraints.
  const movementRange = useMemo(() => {
    if (!selectedShipId) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) cannot move; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRangeValue = attributes?.movement || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    // If ship has a preview position (including "stay in place"), don't show movement
    // range so only weapon range is shown (same behavior as main game UI).
    if (previewPosition) {
      return [];
    }

    const baseMoves: { row: number; col: number }[] = [];
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // Check all positions within movement range
    for (
      let row = Math.max(0, startRow - movementRangeValue);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRangeValue);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRangeValue);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRangeValue);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance <= movementRangeValue && distance > 0) {
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            baseMoves.push({ row, col });
          }
        }
      }
    }

    // For display purposes, always show the full movement range (like the main game).
    // Tutorial constraints are enforced separately via validateAction/executeAction.
    return baseMoves;
  }, [
    selectedShipId,
    gameState.shipPositions,
    shipMap,
    getShipAttributes,
    previewPosition,
  ]);

  // Highlighted cell: last move new position (when showing last move) or step 5 allowed move target
  const highlightedMovePosition = useMemo(() => {
    // When showing last move (no ship selected), highlight the new position (same as in-game)
    if (
      selectedShipId === null &&
      tutorialDisplayLastMove &&
      tutorialDisplayLastMove.actionType !== ActionType.Retreat &&
      tutorialDisplayLastMove.newRow >= 0 &&
      tutorialDisplayLastMove.newCol >= 0
    ) {
      return {
        row: tutorialDisplayLastMove.newRow,
        col: tutorialDisplayLastMove.newCol,
      };
    }
    // Step 5: highlight the allowed move target
    if (
      currentStep?.id === "move-ship" &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId &&
      selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
    ) {
      const allowedPositions =
        currentStep.allowedActions.moveShip.allowedPositions;
      if (allowedPositions.length > 0) {
        return allowedPositions[0];
      }
    }
    return null;
  }, [currentStep, selectedShipId, tutorialDisplayLastMove]);

  // Last move UI props for GameGrid (same as in-game: ghost at old position, pulse at new)
  const lastMoveProps = useMemo(() => {
    // Match live-game behavior: while a ship is selected, prioritize proposal UI
    // and do not feed prior last-move markers into GameGrid.
    // Ship-destruction step must still pass last move (including target id) so
    // GameGrid can render the destroyed-target overlay like the live game
    // (isLastMoveDestroyedTargetCell + ship-destroyed.png).
    // Keep last-move replay (EMP wave, outlines) visible while a ship is
    // selected on steps that are cinematic or require selection for the next action.
    const lastMoveVisibleWithSelection =
      currentStep?.id === "ship-destruction" ||
      currentStep?.id === "destroy-disabled" ||
      currentStep?.id === "rescue";
    const suppressLastMoveBecauseSelection =
      selectedShipId !== null && !lastMoveVisibleWithSelection;
    if (!tutorialDisplayLastMove || suppressLastMoveBecauseSelection) {
      return {
        lastMoveShipId: null as bigint | null,
        lastMoveOldPosition: null as { row: number; col: number } | null,
        lastMoveNewPosition: null as { row: number; col: number } | null,
        lastMoveActionType: null as ActionType | null,
        lastMoveTargetShipId: null as bigint | null,
        lastMoveIsCurrentPlayer: undefined as boolean | undefined,
      };
    }
    const lm = tutorialDisplayLastMove;
    const ship = shipMap.get(BigInt(lm.shipId));
    const lmAction = Number(lm.actionType);
    return {
      lastMoveShipId: BigInt(lm.shipId),
      lastMoveOldPosition: { row: lm.oldRow, col: lm.oldCol },
      lastMoveNewPosition: { row: lm.newRow, col: lm.newCol },
      // Coerce so GameGrid strict checks (e.g. EMP) match after JSON or mixed types
      lastMoveActionType: lmAction as ActionType,
      lastMoveTargetShipId:
        (lmAction === ActionType.Shoot || lmAction === ActionType.Special) &&
        lm.targetShipId &&
        lm.targetShipId !== "0"
          ? BigInt(lm.targetShipId)
          : null,
      lastMoveIsCurrentPlayer: ship
        ? ship.owner === TUTORIAL_PLAYER_ADDRESS
        : undefined,
    };
  }, [
    tutorialDisplayLastMove,
    selectedShipId,
    shipMap,
    currentStep?.id,
  ]);

  // Last move object for GameEvents panel (adapt tutorial lastMove to on-chain LastMove shape).
  // When a move is staged (selected ship + preview position), we synthesize a
  // pending LastMove so the UI shows from/to immediately after selecting the move,
  // before the simulated transaction is submitted.
  const lastMoveForEvents: LastMove | undefined = useMemo(() => {
    if (
      selectedShipId &&
      previewPosition &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
    ) {
      const currentPos = gameState.shipPositions.find(
        (pos) => pos.shipId === selectedShipId.toString(),
      );

      if (currentPos) {
        return {
          shipId: selectedShipId,
          oldRow: currentPos.position.row,
          oldCol: currentPos.position.col,
          newRow: previewPosition.row,
          newCol: previewPosition.col,
          actionType: ActionType.Pass,
          targetShipId: 0n,
          timestamp: 0n,
        };
      }
    }

    if (!tutorialDisplayLastMove) return undefined;
    const lm = tutorialDisplayLastMove;
    return {
      shipId: BigInt(lm.shipId),
      oldRow: lm.oldRow,
      oldCol: lm.oldCol,
      newRow: lm.newRow,
      newCol: lm.newCol,
      actionType: Number(lm.actionType) as ActionType,
      targetShipId: lm.targetShipId ? BigInt(lm.targetShipId) : 0n,
      timestamp: 0n,
    };
  }, [
    selectedShipId,
    previewPosition,
    tutorialDisplayLastMove,
    gameState.shipPositions,
    currentStep,
  ]);

  // Calculate damage for a target ship
  const calculateDamage = useCallback(
    (
      targetShipId: bigint,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
    ) => {
      if (!selectedShipId)
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      const shooterAttributes = getShipAttributes(selectedShipId);
      const targetAttributes = getShipAttributes(targetShipId);

      if (!shooterAttributes || !targetAttributes)
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      // Handle ships with 0 hull points - they get reactor critical timer increment
      if (targetAttributes.hullPoints === 0) {
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      const currentWeaponType = weaponType || selectedWeaponType;
      let baseDamage: number;

      // EMP special applies reactor damage (previewed as +1 reactor level).
      if (currentWeaponType === "special" && specialType === 1) {
        return {
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      if (currentWeaponType === "special") {
        baseDamage =
          (specialData as SpecialData)?.strength || shooterAttributes.gunDamage;
      } else {
        baseDamage = shooterAttributes.gunDamage;
      }

      const reduction = targetAttributes.damageReduction;
      let reducedDamage: number;

      if (currentWeaponType === "special" && !showReducedDamage) {
        reducedDamage = baseDamage;
      } else {
        reducedDamage = Math.max(
          0,
          baseDamage - Math.floor((baseDamage * reduction) / 100),
        );
      }

      const willKill = reducedDamage >= targetAttributes.hullPoints;

      return { reducedDamage, willKill, reactorCritical: false };
    },
    [
      selectedShipId,
      getShipAttributes,
      selectedWeaponType,
      specialData,
      specialType,
    ],
  );

  // Get valid targets
  // Show full range for viewing, but filter by tutorial constraints if step requires specific targets
  const validTargets = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    // Match live game: disabled ships are retreat-only, no targeting UI.
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    // Get allowed targets from tutorial step (if step has specific constraints)
    let allowedTargets: TutorialShipId[] | null = null;
    if (
      currentStep?.allowedActions.shoot &&
      currentStep.allowedActions.shoot.shipId ===
        selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.shoot.allowedTargets;
    } else if (
      currentStep?.allowedActions.useSpecial &&
      currentStep.allowedActions.useSpecial.shipId ===
        selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.useSpecial.allowedTargets;
    } else if (
      currentStep?.allowedActions.assist &&
      currentStep.allowedActions.assist.shipId ===
        selectedShipId.toString()
    ) {
      allowedTargets = currentStep.allowedActions.assist.allowedTargets;
    }

    const allowedTargetsSet = allowedTargets ? new Set(allowedTargets) : null;

    const attributes = getShipAttributes(selectedShipId);
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const targets: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      // If step has constraints, only include allowed targets
      // Otherwise, show all valid targets (for viewing)
      if (allowedTargetsSet && !allowedTargetsSet.has(shipPosition.shipId)) {
        return;
      }

      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      // Filter targets based on weapon type
      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId.toString()) return;
        } else if (specialType === 1) {
          if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
        } else {
          if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
        }
      } else {
        if (ship.owner === TUTORIAL_PLAYER_ADDRESS) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      const canShoot = distance === 1 || distance <= shootingRange;

      // In the shoot step, always include allowed targets so clicking the enemy
      // adds them as target (grid uses validTargets and only then calls
      // setTargetShipId; otherwise it would select the ship and clear the proposed move).
      const isShootStepAllowedTarget =
        currentStep?.id === "shoot" &&
        allowedTargetsSet?.has(shipPosition.shipId) &&
        distance > 0;

      if ((canShoot && distance > 0) || isShootStepAllowedTarget) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
          isShootStepAllowedTarget ||
          !shouldCheckLineOfSight ||
          hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)
        ) {
          targets.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return targets;
  }, [
    selectedShipId,
    currentStep,
    previewPosition,
    shipMap,
    getShipAttributes,
    hasLineOfSight,
    blockedGrid,
    gameState.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Get assistable targets
  const assistableTargets = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [
    selectedShipId,
    previewPosition,
    shipMap,
    gameState.shipPositions,
    getShipAttributes,
  ]);

  const assistableTargetsFromStart = useMemo(() => {
    if (!selectedShipId) return [];
    const selectedAttrs = getShipAttributes(selectedShipId);
    if (selectedAttrs && selectedAttrs.hullPoints === 0) return [];

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];

    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    const assistableShips: {
      shipId: TutorialShipId;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(BigInt(shipPosition.shipId));
      if (!ship) return;

      if (ship.owner !== TUTORIAL_PLAYER_ADDRESS) return;
      if (shipPosition.shipId === selectedShipId.toString()) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        if (targetAttributes && targetAttributes.hullPoints === 0) {
          assistableShips.push({
            shipId: shipPosition.shipId,
            position: { row: targetRow, col: targetCol },
          });
        }
      }
    });

    return assistableShips;
  }, [selectedShipId, shipMap, gameState.shipPositions, getShipAttributes]);

  // Calculate shooting range positions (exact same logic as GameDisplay)
  const shootingRange = useMemo(() => {
    if (!selectedShipId) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) have no move or threat range; only retreat/assist are relevant
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRange = attributes?.movement || 1;
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId.toString(),
    );

    if (!currentPosition) return [];
    const validShootingPositions: { row: number; col: number }[] = [];

    if (previewPosition) {
      // When a move is entered (including \"stay in place\"), show gun range
      // from that single origin only (same as main game behavior).
      const startRow = previewPosition.row;
      const startCol = previewPosition.col;

      // First, add all positions that are exactly 1 square away from preview position
      // (ships can always shoot adjacent enemies, even in nebula)
      for (
        let row = Math.max(0, startRow - 1);
        row <= Math.min(GRID_HEIGHT - 1, startRow + 1);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - 1);
          col <= Math.min(GRID_WIDTH - 1, startCol + 1);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only add positions that are exactly 1 square away and not occupied
          if (distance === 1) {
            const isOccupied = isCellOccupiedByAliveShip(row, col);

            if (!isOccupied) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }

      // Then check all positions within shooting range from preview position
      for (
        let row = Math.max(0, startRow - shootingRange);
        row <= Math.min(GRID_HEIGHT - 1, startRow + shootingRange);
        row++
      ) {
        for (
          let col = Math.max(0, startCol - shootingRange);
          col <= Math.min(GRID_WIDTH - 1, startCol + shootingRange);
          col++
        ) {
          const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

          // Only check positions within shooting range, excluding adjacent ones (already added above)
          if (distance <= shootingRange && distance > 1) {
            // Check if position is not occupied by another ship
            const isOccupied = isCellOccupiedByAliveShip(row, col);

            if (!isOccupied) {
              // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
              // OR special abilities ignore nebula squares
              // OR regular weapons need line of sight
              const shouldCheckLineOfSight =
                distance > 1 && // Not adjacent
                (selectedWeaponType !== "special" ||
                  (specialType !== 1 &&
                    specialType !== 2 &&
                    specialType !== 3)); // Not EMP, Repair, or Flak

              if (
                !shouldCheckLineOfSight ||
                hasLineOfSight(startRow, startCol, row, col, blockedGrid)
              ) {
                validShootingPositions.push({ row, col });
              }
            }
          }
        }
      }

      return validShootingPositions;
    }

    // Original logic for showing shooting range from all possible move positions
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // First, add all positions that are exactly 1 square away from any valid move position
    // (ships can always shoot adjacent enemies, even in nebula)
    for (
      let row = Math.max(0, startRow - movementRange - 1);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRange + 1);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRange - 1);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRange + 1);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Only check positions that are exactly 1 square away from any valid move position
        if (distance === movementRange + 1) {
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            // Check if this position is exactly 1 square away from any valid move position
            let isAdjacentToMovePosition = false;

            // Check all possible move positions
            for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = isCellOccupiedByAliveShip(
                    moveRow,
                    moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this position is exactly 1 square away from this move position
                    const adjacentDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);
                    if (adjacentDistance === 1) {
                      isAdjacentToMovePosition = true;
                      break;
                    }
                  }
                }
              }
              if (isAdjacentToMovePosition) break;
            }

            if (isAdjacentToMovePosition) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    // Then check all positions within movement + shooting range
    const totalRange = movementRange + shootingRange;
    for (
      let row = Math.max(0, startRow - totalRange);
      row <= Math.min(GRID_HEIGHT - 1, startRow + totalRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - totalRange);
        col <= Math.min(GRID_WIDTH - 1, startCol + totalRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);

        // Position must be within movement + shooting range, but not within just movement range
        // (movement range positions are already highlighted as movement tiles)
        // Also exclude positions that are exactly 1 square away (already added above)
        if (
          distance > movementRange &&
          distance <= totalRange &&
          distance !== 1
        ) {
          // Check if position is not occupied by another ship
          const isOccupied = isCellOccupiedByAliveShip(row, col);

          if (!isOccupied) {
            // Check if any valid move position can shoot to this target position
            // We need to check if there's a valid move position that has line of sight to this target
            let canShootFromSomewhere = false;

            // Check all possible move positions
            for (
              let moveRow = Math.max(0, startRow - movementRange);
              moveRow <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
              moveRow++
            ) {
              for (
                let moveCol = Math.max(0, startCol - movementRange);
                moveCol <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
                moveCol++
              ) {
                const moveDistance =
                  Math.abs(moveRow - startRow) + Math.abs(moveCol - startCol);
                if (moveDistance <= movementRange && moveDistance > 0) {
                  // Check if this move position is not occupied
                  const isMoveOccupied = isCellOccupiedByAliveShip(
                    moveRow,
                    moveCol,
                  );

                  if (!isMoveOccupied) {
                    // Check if this move position can shoot to the target
                    const shootDistance =
                      Math.abs(moveRow - row) + Math.abs(moveCol - col);

                    // Ships can always shoot enemies that are exactly 1 square away
                    // OR within their normal shooting range
                    const canShoot =
                      shootDistance === 1 || shootDistance <= shootingRange;

                    if (canShoot) {
                      // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
                      // OR special abilities ignore nebula squares
                      // OR regular weapons need line of sight
                      const shouldCheckLineOfSight =
                        shootDistance > 1 && // Not adjacent
                        (selectedWeaponType !== "special" ||
                          (specialType !== 1 &&
                            specialType !== 2 &&
                            specialType !== 3)); // Not EMP, Repair, or Flak

                      if (
                        !shouldCheckLineOfSight ||
                        hasLineOfSight(moveRow, moveCol, row, col, blockedGrid)
                      ) {
                        canShootFromSomewhere = true;
                        break;
                      }
                    }
                  }
                }
              }
              if (canShootFromSomewhere) break;
            }

            if (canShootFromSomewhere) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }, [
    selectedShipId,
    previewPosition,
    shipMap,
    getShipAttributes,
    hasLineOfSight,
    blockedGrid,
    gameState.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Drag shooting range and valid targets (simplified for tutorial)
  const dragShootingRange = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  const dragValidTargets = useMemo(() => {
    if (!draggedShipId || !dragOverCell) return [];
    // For tutorial, we can reuse the same logic but from drag position
    return [];
  }, [draggedShipId, dragOverCell]);

  // Convert tutorial string ids to bigint ids for GameGrid targeting logic.
  const gridValidTargets = useMemo(
    () =>
      validTargets.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [validTargets],
  );

  const gridAssistableTargets = useMemo(
    () =>
      assistableTargets.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [assistableTargets],
  );

  const gridAssistableTargetsFromStart = useMemo(
    () =>
      assistableTargetsFromStart.map((t) => ({
        shipId: BigInt(t.shipId),
        position: t.position,
      })),
    [assistableTargetsFromStart],
  );

  // GameGrid expects Set<bigint> for movedShipIdsSet; tutorial state uses string IDs.
  const gridMovedShipIdsSet = useMemo(() => {
    const set = new Set<bigint>();
    if (gameState.creatorMovedShipIds) {
      gameState.creatorMovedShipIds.forEach((id) => set.add(BigInt(id)));
    }
    if (gameState.joinerMovedShipIds) {
      gameState.joinerMovedShipIds.forEach((id) => set.add(BigInt(id)));
    }
    return set;
  }, [gameState.creatorMovedShipIds, gameState.joinerMovedShipIds]);

  const wrappedSetSelectedShipId = useCallback(
    (shipId: bigint | null) => {
      if (shipId === null) {
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        return;
      }

      // In the shooting tutorial step, if the Tutorial Sniper is already selected
      // and the user clicks the enemy fighter, always treat that click as
      // targeting the enemy for the staged move+shoot, not as a selection
      // change. This prevents the proposed move from being cleared.
      if (
        currentStep?.id === "shoot" &&
        selectedShipId !== null &&
        shipId !== selectedShipId
      ) {
        const idString = shipId.toString() as TutorialShipId;
        if (
          currentStep.allowedActions.shoot &&
          currentStep.allowedActions.shoot.allowedTargets.includes(idString)
        ) {
          setTargetShipId(shipId);
          return;
        }
      }

      const idString = shipId.toString() as TutorialShipId;

      // Validate ship selection
      const validation = validateAction({
        type: "selectShip",
        shipId: idString,
      });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      // When changing selection to a different ship, clear any existing preview so
      // the new selection starts in the movement + threat state (same as main game).
      setSelectedShipId(shipId);
      setPreviewPosition(null);
      executeAction({ type: "selectShip", shipId: idString });
      setTargetShipId(null);
      setSelectedWeaponType("weapon");
    },
    [
      currentStep,
      selectedShipId,
      previewPosition,
      validateAction,
      executeAction,
    ],
  );

  const wrappedSetPreviewPosition = useCallback(
    (position: { row: number; col: number } | null) => {
      if (!position) {
        setPreviewPosition(null);
        return;
      }

      // Step 12 fork rule: Tutorial Sniper is shoot-only and cannot stage moves.
      if (currentStep?.id === "rescue" && selectedShipId?.toString() === "1002") {
        toast.error("Tutorial Sniper cannot move in this step.");
        return;
      }

      // Validate move action
      if (
        selectedShipId &&
        currentStep?.allowedActions.moveShip &&
        selectedShipId.toString() === currentStep.allowedActions.moveShip.shipId
      ) {
        const allowedPositions =
          currentStep.allowedActions.moveShip.allowedPositions;
        const isValidMove = allowedPositions.some(
          (pos) => pos.row === position.row && pos.col === position.col,
        );

        if (!isValidMove) {
          toast.error("Move not allowed in this tutorial step");
          return;
        }

        const moveValidation = validateAction({
          type: "moveShip",
          shipId: selectedShipId.toString() as TutorialShipId,
          position,
        });
        if (!moveValidation.valid) {
          toast.error(moveValidation.message || "Move not allowed");
          return;
        }

        // Stage the preview only. The actual move is submitted via the
        // top action UI (Submit button), matching the live game flow.
        setPreviewPosition(position);
      } else {
        setPreviewPosition(position);
      }
    },
    [selectedShipId, currentStep, validateAction, executeAction],
  );

  const wrappedSetTargetShipId = useCallback(
    (shipId: bigint | null) => {
      if (!shipId || shipId === 0n) {
        setTargetShipId(shipId);
        return;
      }

      if (!selectedShipId) {
        setTargetShipId(shipId);
        return;
      }

      const idString = shipId.toString() as TutorialShipId;

      // Check for shoot action
      if (
        currentStep?.allowedActions.shoot &&
        selectedShipId.toString() === currentStep.allowedActions.shoot.shipId &&
        currentStep.allowedActions.shoot.allowedTargets.includes(idString)
      ) {
        // In the shooting tutorial step, clicking an enemy in range should
        // only stage the target for the composite move+shoot action. The
        // actual shoot is executed when the user clicks Submit, just like
        // in the main game.
        if (
          currentStep.id === "shoot" ||
          currentStep.id === "rescue-outcome-sniper"
        ) {
          if (currentStep.id === "shoot") {
            // Require a proposed move to (1, 3) before allowing the shot.
            if (
              !previewPosition ||
              previewPosition.row !== 1 ||
              previewPosition.col !== 3
            ) {
              toast.error(
                "Move the Tutorial Sniper to (1, 3) before firing on the enemy.",
              );
              return;
            }
          } else if (currentStep.id === "rescue-outcome-sniper") {
            // Require the fighter to stage the center move before optional shot.
            if (
              !previewPosition ||
              previewPosition.row !== 5 ||
              previewPosition.col !== 8
            ) {
              toast.error(
                "Move the Tutorial Fighter to (5, 8) before firing on the enemy.",
              );
              return;
            }
          }

          // Stage the target only; Submit will call executeAction for the
          // actual shoot.
          setTargetShipId(shipId);
          return;
        }

        // In rescue, the sniper shot is staged (target selection) and is only
        // executed when the player clicks Submit.
        if (
          currentStep.id === "rescue" &&
          selectedShipId.toString() === "1002"
        ) {
          const currentPos = gameState.shipPositions.find(
            (pos) => pos.shipId === selectedShipId.toString(),
          )?.position;
          if (currentPos) {
            // Keep sniper stationary but provide an explicit firing origin so
            // railgun animation/effects can render when target is selected.
            setPreviewPosition({ row: currentPos.row, col: currentPos.col });
          }
          setTargetShipId(shipId);
          return;
        }

        const shootValidation = validateAction({
          type: "shoot",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (shootValidation.valid) {
          executeAction({
            type: "shoot",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Shoot,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(shootValidation.message || "Shoot not allowed");
          return;
        }
      }

      // Check for useSpecial action
      if (
        currentStep?.allowedActions.useSpecial &&
        selectedShipId.toString() ===
          currentStep.allowedActions.useSpecial.shipId &&
        currentStep.allowedActions.useSpecial.allowedTargets.includes(idString)
      ) {
        const specialValidation = validateAction({
          type: "useSpecial",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
          specialType: currentStep.allowedActions.useSpecial.specialType,
        });
        if (specialValidation.valid) {
          // Stage the target only; Submit will call executeAction for the
          // actual special use.
          setTargetShipId(shipId);
          return;
        } else {
          toast.error(
            specialValidation.message || "Special ability not allowed",
          );
          return;
        }
      }

      // Check for assist action
      if (
        currentStep?.allowedActions.assist &&
        selectedShipId.toString() ===
          currentStep.allowedActions.assist.shipId &&
        currentStep.allowedActions.assist.allowedTargets.includes(idString)
      ) {
        const assistValidation = validateAction({
          type: "assist",
          shipId: selectedShipId.toString() as TutorialShipId,
          targetShipId: idString,
        });
        if (assistValidation.valid) {
          executeAction({
            type: "assist",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Assist,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
          return;
        } else {
          toast.error(assistValidation.message || "Assist not allowed");
          return;
        }
      }

      // If no matching action, just set the target (for display purposes)
      setTargetShipId(shipId);
    },
    [
      selectedShipId,
      currentStep,
      previewPosition,
      validateAction,
      executeAction,
      gameState.shipPositions,
    ],
  );

  // Submit handler for staged move (selected ship + preview position). This mirrors
  // the live game flow where the player first stages a move on the grid, then
  // confirms it via the action panel, which may trigger a (simulated) transaction.
  const handleSubmitMove = useCallback(() => {
    if (!selectedShipId) {
      return;
    }

    // For the shooting tutorial step, Submit should execute the composite
    // move+shoot action in one go: apply the staged move, then open the
    // simulated transaction for the shot.
    if (currentStep?.id === "shoot") {
      if (!previewPosition) {
        return;
      }
      if (!currentStep.allowedActions.moveShip) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      if (!targetShipId) {
        toast.error("Select an enemy ship to target before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      // Apply the move immediately (no tx). Validation has already run earlier.
      executeAction(moveAction);

      const shootAction: TutorialAction = {
        type: "shoot",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Shoot,
      };

      executeAction(shootAction);
      // For the shooting step, keep selection and preview/target state while
      // the simulated transaction dialog is open so the player continues to
      // see the staged move+shoot in the UI. State will be cleared when the
      // step advances after tx approval.
      return;
    }

    // Sniper branch step: submit move-to-center, optionally with a shot target.
    if (currentStep?.id === "rescue-outcome-sniper") {
      if (!previewPosition) {
        toast.error("Move the Tutorial Fighter to (5, 8) before submitting.");
        return;
      }
      if (previewPosition.row !== 5 || previewPosition.col !== 8) {
        toast.error("Move the Tutorial Fighter to (5, 8) before submitting.");
        return;
      }

      const moveAction: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
        // If the player selected a target, we'll perform the optional shot
        // after the tx is approved (handled in useOnboardingTutorial).
        targetShipId: targetShipId
          ? (targetShipId.toString() as TutorialShipId)
          : undefined,
      };
      executeAction(moveAction);
      return;
    }

    // Rescue step has two valid submit paths:
    // 1) Select disabled EMP and submit retreat.
    // 2) Select sniper, keep position, stage target, then submit shoot.
    if (currentStep?.id === "rescue") {
      const selectedId = selectedShipId.toString() as TutorialShipId;

      if (selectedId === "1001") {
        const currentPos = gameState.shipPositions.find(
          (pos) => pos.shipId === selectedId,
        )?.position;
        if (!currentPos) return;

        executeAction({
          type: "moveShip",
          shipId: selectedId,
          position: currentPos,
          actionType: ActionType.Retreat,
        });
      } else if (selectedId === "1002") {
        if (!targetShipId) {
          toast.error("Select Enemy Fighter as target before submitting.");
          return;
        }
        executeAction({
          type: "shoot",
          shipId: selectedId,
          targetShipId: targetShipId.toString() as TutorialShipId,
          actionType: ActionType.Shoot,
        });
      } else {
        toast.error("Select Tutorial EMP or Tutorial Sniper.");
        return;
      }
    } else

    // Special EMP step: no movement, just fire the special at the staged target.
    if (currentStep?.id === "special-emp") {
      const isEmpSelected = selectedWeaponType === "special";
      const hasTarget = !!targetShipId;
      const allowedTargets =
        currentStep.allowedActions.useSpecial?.allowedTargets ?? [];
      const isAllowedTarget =
        hasTarget &&
        allowedTargets.includes(
          targetShipId!.toString() as TutorialShipId,
        );

      // Only requirement for submit in this step:
      // - EMP is selected in the dropdown
      // - Target is one of the allowed useSpecial targets (Heavy Enemy)
      if (!isEmpSelected || !isAllowedTarget) {
        toast.error(
          "Select the Heavy Enemy as your target and switch to EMP before submitting.",
        );
        return;
      }

      const action: TutorialAction = {
        type: "useSpecial",
        shipId: selectedShipId.toString() as TutorialShipId,
        targetShipId: targetShipId.toString() as TutorialShipId,
        actionType: ActionType.Special,
      };

      executeAction(action);
    } else {
      if (!previewPosition) {
        return;
      }
      if (
        !currentStep?.allowedActions.moveShip ||
        selectedShipId.toString() !== currentStep.allowedActions.moveShip.shipId
      ) {
        toast.error("Move not allowed in this tutorial step");
        return;
      }

      const action: TutorialAction = {
        type: "moveShip",
        shipId: selectedShipId.toString() as TutorialShipId,
        position: previewPosition,
        actionType: ActionType.Pass,
      };

      executeAction(action);
    }

    // For most steps, clear local staging after submitting.
    // Keep local staging for steps that rely on pending tx preview state:
    // - shoot: staged move+target should remain visible until tx decision
    // - special-emp: staged target should remain visible until tx decision
    // - rescue: staged branch choice (retreat or sniper shot) should remain
    //   visible until approve, or until player cancels via top move-selection UI.
    if (
      currentStep?.id !== "shoot" &&
      currentStep?.id !== "special-emp" &&
      currentStep?.id !== "rescue" &&
      currentStep?.id !== "rescue-outcome-sniper"
    ) {
      setPreviewPosition(null);
      setTargetShipId(null);
      setSelectedShipId(null);
    }
  }, [
    selectedShipId,
    previewPosition,
    targetShipId,
    gameState.shipPositions,
    currentStep,
    isSelectedShipDisabled,
    selectedWeaponType,
    executeAction,
  ]);

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header: back + game/round/turn + score + (optional) proposed move + Flee locked */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
              e.currentTarget.style.borderColor = "var(--color-cyan)";
              e.currentTarget.style.color = "var(--color-cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
              e.currentTarget.style.borderColor = "var(--color-gunmetal)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            ←
          </button>
          <div className="flex items-start gap-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-mono text-white flex items-center gap-3">
                <span>Game 0</span>
                <span className="text-gray-400 text-base">
                  Round {gameState.turnState.currentRound.toString()}
                </span>
              </h1>
              {/* Turn indicator · 99:99 and static bar (no countdown in tutorial) */}
              <div className="flex flex-col gap-1.5">
                <div
                  className="text-sm flex items-center gap-2 uppercase font-semibold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <span
                    style={{
                      color: isMyTurn
                        ? "var(--color-cyan)"
                        : "var(--color-warning-red)",
                    }}
                  >
                    {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>•</span>
                  <span
                    className="font-mono"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: isMyTurn
                        ? "var(--color-cyan)"
                        : "var(--color-warning-red)",
                    }}
                  >
                    99:99
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-gunmetal)",
                      borderRadius: 0,
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: "100%",
                        backgroundColor: isMyTurn
                          ? "var(--color-cyan)"
                          : "var(--color-warning-red)",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Score grouped with game/round (same conceptual row as in reference) */}
            <div
              className="p-2 border border-solid w-48 text-lg shrink-0"
              style={{
                backgroundColor: "var(--color-slate)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    My Score:
                  </span>
                  <span
                    title="Scores update at end of round."
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {gameState.creatorScore.toString()}/
                    {gameState.maxScore.toString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                      fontSize: "14px",
                    }}
                  >
                    Opponent:
                  </span>
                  <span
                    title="Scores update at end of round."
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {gameState.joinerScore.toString()}/
                    {gameState.maxScore.toString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proposed Move panel: inline between score and Flee Battle when active.
            Mirrors main game behavior: appears whenever an owned ship is selected
            and eligible to act this round, even before a move is proposed. */}
        {isShowingProposedMove && (
            <div
              className="flex-1 border border-solid p-3"
              style={{
                backgroundColor: "var(--color-near-black)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div className="flex items-center gap-6">
                <div className="flex flex-col gap-1 min-w-0 flex-shrink-0">
                  <div
                    className="text-xs uppercase tracking-wide"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Proposed Move
                  </div>
                  <div className="text-sm text-white font-mono">
                    {(() => {
                      const ship = shipMap.get(selectedShipId!);
                      const name =
                        ship?.name || `Ship #${selectedShipId?.toString()}`;
                      const currentPos = gameState.shipPositions.find(
                        (pos) => pos.shipId === selectedShipId?.toString(),
                      );
                      const fromRow = currentPos?.position.row ?? 0;
                      const fromCol = currentPos?.position.col ?? 0;
                      const toRow = previewPosition
                        ? previewPosition.row
                        : fromRow;
                      const toCol = previewPosition
                        ? previewPosition.col
                        : fromCol;
                      return `${name} (${fromRow}, ${fromCol}) → (${toRow}, ${toCol})`;
                    })()}
                  </div>
                  {/* Weapon / Special selector, mirroring main game UI */}
                  {(() => {
                    if (isSelectedShipDisabled) return null;
                    if (!selectedShipId) return null;
                    const ship = shipMap.get(selectedShipId);
                    if (!ship || ship.equipment.special <= 0) return null;
                    return (
                      <select
                        value={selectedWeaponType}
                        onChange={(e) => {
                          const newWeaponType = e.target.value as
                            | "weapon"
                            | "special";
                          setSelectedWeaponType(newWeaponType);
                          // In tutorial we do not have a boarding special; keep target as-is.
                        }}
                        className="mt-1 px-2 py-1 text-xs uppercase font-semibold tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          borderRadius: 0,
                          backgroundColor: "var(--color-slate)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        <option value="weapon">
                          {getMainWeaponName(ship.equipment.mainWeapon)}
                        </option>
                        <option value="special">
                          {getSpecialName(ship.equipment.special)}
                        </option>
                      </select>
                    );
                  })()}
                </div>

                {/* Center: Target selection, mirroring main game UI */}
                {!isSelectedShipDisabled && validTargets.length > 0 && (
                  <div className="flex-1">
                    <div
                      className="border border-solid p-3 min-h-[7.5rem]"
                      style={{
                        backgroundColor: "var(--color-near-black)",
                        borderColor: "var(--color-gunmetal)",
                        borderTopColor: "var(--color-steel)",
                        borderLeftColor: "var(--color-steel)",
                        borderRadius: 0,
                      }}
                    >
                      <div
                        className="text-xs mb-2 uppercase tracking-wide"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Select Target (Optional)
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[5rem]">
                        {validTargets.map((target) => {
                          const targetShip = shipMap.get(BigInt(target.shipId));
                          const isSelectedTarget =
                            targetShipId !== null &&
                            targetShipId === BigInt(target.shipId);
                          return (
                            <button
                              key={target.shipId}
                              onClick={() =>
                                setTargetShipId(BigInt(target.shipId))
                              }
                              className="h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex items-center shrink-0"
                              style={{
                                fontFamily:
                                  "var(--font-rajdhani), 'Arial Black', sans-serif",
                                borderColor: isSelectedTarget
                                  ? "var(--color-warning-red)"
                                  : "var(--color-gunmetal)",
                                borderTopColor: isSelectedTarget
                                  ? "var(--color-warning-red)"
                                  : "var(--color-steel)",
                                borderLeftColor: isSelectedTarget
                                  ? "var(--color-warning-red)"
                                  : "var(--color-steel)",
                                color: isSelectedTarget
                                  ? "var(--color-warning-red)"
                                  : "var(--color-warning-red)",
                                backgroundColor: isSelectedTarget
                                  ? "var(--color-steel)"
                                  : "var(--color-slate)",
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderRadius: 0,
                              }}
                            >
                              🎯{" "}
                              {targetShip?.name ||
                                `#${BigInt(target.shipId).toString()}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmitMove}
                    className="px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-phosphor-green)",
                      borderTopColor: "var(--color-phosphor-green)",
                      borderLeftColor: "var(--color-phosphor-green)",
                      color: "var(--color-phosphor-green)",
                      backgroundColor: "var(--color-steel)",
                      borderWidth: "2px",
                      borderStyle: "solid",
                      borderRadius: 0,
                    }}
                  >
                    {isSelectedShipDisabled ? "Submit Retreat" : "Submit Move"}
                  </button>
                  <button
                    onClick={() => {
                      setPreviewPosition(null);
                      setTargetShipId(null);
                    }}
                    className="px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-gunmetal)",
                      borderTopColor: "var(--color-steel)",
                      borderLeftColor: "var(--color-steel)",
                      color: "var(--color-text-secondary)",
                      backgroundColor: "var(--color-slate)",
                      borderWidth: "2px",
                      borderStyle: "solid",
                      borderRadius: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        <div className="flex-shrink-0">
          {/* Flee Battle: locked in tutorial */}
          <FleeSafetySwitch gameId={0n} locked />
        </div>
      </div>

      <div className="relative w-full">
        <GameBoardLayout isCurrentPlayerTurn={isMyTurn}>
          {/* Fixed 17×11 aspect so the board does not resize between tutorial steps
              while state hydrates; overlay blocks interaction until ready. */}
          <div
            className="relative w-full"
            style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
          >
            {!isStepHydrated && (
              <div
                className="absolute inset-0 z-[200] flex items-center justify-center"
                style={{ backgroundColor: "var(--color-near-black)" }}
                aria-busy
                aria-live="polite"
              >
                <span className="text-cyan-300 font-mono">
                  Preparing tutorial step...
                </span>
              </div>
            )}
            <div className="absolute inset-0 min-h-0 overflow-hidden">
              <GameGrid
                grid={grid}
                allShipPositions={allShipPositionsForGrid}
                shipMap={shipMap}
                selectedShipId={selectedShipId}
                previewPosition={previewPosition}
                targetShipId={targetShipId}
                selectedWeaponType={selectedWeaponType}
                hoveredCell={hoveredCell}
                draggedShipId={draggedShipId}
                dragOverCell={dragOverCell}
                movementRange={movementRange}
                shootingRange={shootingRange}
                validTargets={gridValidTargets}
                assistableTargets={gridAssistableTargets}
                assistableTargetsFromStart={gridAssistableTargetsFromStart}
                dragShootingRange={dragShootingRange}
                dragValidTargets={dragValidTargets}
                isCurrentPlayerTurn={isMyTurn}
                isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                movedShipIdsSet={gridMovedShipIdsSet}
                specialType={specialType}
                blockedGrid={blockedGrid}
                scoringGrid={scoringGrid}
                onlyOnceGrid={onlyOnceGrid}
                calculateDamage={calculateDamage}
                getShipAttributes={getShipAttributes}
                disableTooltips={false}
                address={TUTORIAL_PLAYER_ADDRESS}
                currentTurn={gameState.turnState.currentTurn}
                highlightedMovePosition={highlightedMovePosition}
                lastMoveShipId={lastMoveProps.lastMoveShipId}
                lastMoveOldPosition={lastMoveProps.lastMoveOldPosition}
                lastMoveNewPosition={lastMoveProps.lastMoveNewPosition}
                lastMoveActionType={lastMoveProps.lastMoveActionType}
                lastMoveTargetShipId={lastMoveProps.lastMoveTargetShipId}
                lastMoveIsCurrentPlayer={lastMoveProps.lastMoveIsCurrentPlayer}
                showLastMoveEmpReplayWhenSelected={
                  currentStep?.id === "ship-destruction" ||
                  currentStep?.id === "destroy-disabled"
                }
                retreatPrepShipId={retreatPrepShipId}
                retreatPrepIsCreator={retreatPrepIsCreator}
                setSelectedShipId={wrappedSetSelectedShipId}
                setPreviewPosition={wrappedSetPreviewPosition}
                setTargetShipId={wrappedSetTargetShipId}
                setSelectedWeaponType={setSelectedWeaponType}
                setHoveredCell={setHoveredCell}
                setDraggedShipId={setDraggedShipId}
                setDragOverCell={setDragOverCell}
              />
            </div>
          </div>
        </GameBoardLayout>

        {/* Instructions: overlap grid bottom by ~50%, aligned to left */}
        <div className="pointer-events-none absolute inset-x-0 top-full flex justify-start z-[180]">
          <div className="pointer-events-auto max-w-2xl w-full transform -translate-y-1/2">
            <TutorialStepOverlay onQuit={onBack} />
          </div>
        </div>
      </div>

      {/* Last Move panel - reuse GameEvents from live game */}
      <GameEvents
        lastMove={lastMoveForEvents}
        shipMap={shipMap}
        address={TUTORIAL_PLAYER_ADDRESS}
        appendDestroyedText={
          currentStep?.id === "ship-destruction" ||
          currentStep?.id === "rescue"
        }
      />

      {/* Ship Details panel - mirror live game fleet layout using tutorial data */}
      <div
        className="p-4 border border-solid w-full"
        style={{
          backgroundColor: "var(--color-slate)",
          borderColor: "var(--color-gunmetal)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Fleet - Left (tutorial player) */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
                fontSize: "18px",
              }}
            >
              My Fleet
              <span
                className="ml-2"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
              >
                ({gameState.metadata.creator})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.creatorActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(BigInt(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
                    <ShipCard
                      ship={ship}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={true}
                      inGameAttributes={attributes}
                      attributesLoading={false}
                      hideRecycle={true}
                      hideCheckbox={true}
                      isCurrentPlayerShip={true}
                      flipShip={true}
                      reactorCriticalStatus={reactorCriticalStatus}
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent's Fleet - Right */}
          <div>
            <h4
              className="mb-3 uppercase font-bold tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-warning-red)",
                fontSize: "18px",
              }}
            >
              Opponent&apos;s Fleet
              <span
                className="ml-2"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  fontWeight: 400,
                }}
              >
                ({gameState.metadata.joiner})
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.joinerActiveShipIds.map((shipId) => {
                const shipPosition = gameState.shipPositions.find(
                  (sp) => sp.shipId === shipId,
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(BigInt(shipId));

                if (!shipPosition || !attributes || !ship) return null;

                const reactorCriticalStatus =
                  attributes.reactorCriticalTimer > 0 &&
                  attributes.hullPoints === 0
                    ? "critical"
                    : attributes.reactorCriticalTimer > 0
                      ? "warning"
                      : "none";

                const hasMoved = movedShipIdsSet.has(shipId);

                return (
                  <div key={shipId}>
                    <ShipCard
                      ship={ship}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={true}
                      inGameAttributes={attributes}
                      attributesLoading={false}
                      hideRecycle={true}
                      hideCheckbox={true}
                      isCurrentPlayerShip={false}
                      flipShip={false}
                      reactorCriticalStatus={reactorCriticalStatus}
                      hasMoved={hasMoved}
                      gameViewMode={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border border-cyan-400 rounded-none p-4">
          <p className="text-cyan-300 font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name || selectedShipId.toString()}
          </p>
          {currentStep?.allowedActions.moveShip &&
            selectedShipId.toString() ===
              currentStep.allowedActions.moveShip.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted grid cell to move.
              </p>
            )}
          {currentStep?.allowedActions.shoot &&
            selectedShipId.toString() ===
              currentStep.allowedActions.shoot.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted enemy ship to shoot.
              </p>
            )}
          {currentStep?.allowedActions.useSpecial &&
            selectedShipId.toString() ===
              currentStep.allowedActions.useSpecial.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted ship to use your special ability.
              </p>
            )}
          {currentStep?.allowedActions.assist &&
            selectedShipId.toString() ===
              currentStep.allowedActions.assist.shipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click the highlighted friendly ship to assist it.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
