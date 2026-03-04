"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import defaultMap from "../../public/default_map.json";
import { TutorialContextValue, TutorialShipId } from "../types/onboarding";
import {
  ALL_TUTORIAL_SHIPS,
  TUTORIAL_PLAYER_ADDRESS,
} from "../data/tutorialShips";
import {
  buildMapGridsFromDefaultMap,
  type DefaultMapShape,
} from "../utils/mapGridUtils";
import { toast } from "react-hot-toast";
import { ActionType, ShipPosition, Attributes, Ship } from "../types/types";
import { GameGrid } from "./GameGrid";
import { TutorialStepOverlay } from "./TutorialStepOverlay";
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
}

const GRID_WIDTH = 17;
const GRID_HEIGHT = 11;

export function SimulatedGameDisplay({
  tutorialContext,
}: SimulatedGameDisplayProps) {
  const {
    gameState,
    currentStep,
    currentStepIndex,
    validateAction,
    executeAction,
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

  // Deselect all ships when moving between steps
  useEffect(() => {
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
      const idString =
        typeof shipId === "bigint" ? shipId.toString() : shipId;
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

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

  // Check if a ship belongs to the tutorial player
  const isShipOwnedByCurrentPlayer = useCallback(
    (shipId: TutorialShipId): boolean => {
      const ship = shipMap.get(BigInt(shipId));
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
    gameState.shipPositions.forEach((shipPosition) => {
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
        };
        newGrid[position.row][position.col] = basePosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipPosition.shipId && previewPosition) {
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
      gameState.lastMove &&
      gameState.lastMove.shipId !== undefined;
    if (canShowLastMove && gameState.lastMove) {
      const lm = gameState.lastMove;
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
        const lastMoveShipPosition = gameState.shipPositions.find(
          (pos) => pos.shipId === lm.shipId,
        );
        if (lastMoveShipPosition) {
          newGrid[oldPos.row][oldPos.col] = {
            shipId: BigInt(lm.shipId),
            position: oldPos,
            isCreator: lastMoveShipPosition.isCreator,
            isPreview: true,
          };
        }
      }
    }

    return newGrid;
  }, [gameState.shipPositions, gameState.lastMove, selectedShipId, previewPosition]);

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
          const isOccupied = gameState.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

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
      gameState.lastMove &&
      gameState.lastMove.actionType !== ActionType.Retreat &&
      gameState.lastMove.newRow >= 0 &&
      gameState.lastMove.newCol >= 0
    ) {
      return {
        row: gameState.lastMove.newRow,
        col: gameState.lastMove.newCol,
      };
    }
    // Step 5: highlight the allowed move target
    if (
      currentStep?.id === "move-ship" &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId &&
      selectedShipId.toString() ===
        currentStep.allowedActions.moveShip.shipId
    ) {
      const allowedPositions =
        currentStep.allowedActions.moveShip.allowedPositions;
      if (allowedPositions.length > 0) {
        return allowedPositions[0];
      }
    }
    return null;
  }, [currentStep, selectedShipId, gameState.lastMove]);

  // Last move UI props for GameGrid (same as in-game: ghost at old position, pulse at new)
  const lastMoveProps = useMemo(() => {
    if (selectedShipId !== null || !gameState.lastMove) {
      return {
        lastMoveShipId: null as bigint | null,
        lastMoveOldPosition: null as { row: number; col: number } | null,
        lastMoveActionType: null as ActionType | null,
        lastMoveTargetShipId: null as bigint | null,
        lastMoveIsCurrentPlayer: undefined as boolean | undefined,
      };
    }
    const lm = gameState.lastMove;
    const ship = shipMap.get(BigInt(lm.shipId));
    return {
      lastMoveShipId: BigInt(lm.shipId),
      lastMoveOldPosition: { row: lm.oldRow, col: lm.oldCol },
      lastMoveActionType: lm.actionType,
      lastMoveTargetShipId:
        lm.actionType === ActionType.Special && lm.targetShipId
          ? BigInt(lm.targetShipId)
          : null,
      lastMoveIsCurrentPlayer: ship
        ? ship.owner === TUTORIAL_PLAYER_ADDRESS
        : undefined,
    };
  }, [gameState.lastMove, selectedShipId, shipMap]);

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
    [selectedShipId, getShipAttributes, selectedWeaponType, specialData],
  );

  // Get valid targets
  // Show full range for viewing, but filter by tutorial constraints if step requires specific targets
  const validTargets = useMemo(() => {
    if (!selectedShipId) return [];

    // Get allowed targets from tutorial step (if step has specific constraints)
    let allowedTargets: TutorialShipId[] | null = null;
    if (
      currentStep?.allowedActions.shoot &&
      currentStep.allowedActions.shoot.shipId === selectedShipId
    ) {
      allowedTargets = currentStep.allowedActions.shoot.allowedTargets;
    } else if (
      currentStep?.allowedActions.useSpecial &&
      currentStep.allowedActions.useSpecial.shipId === selectedShipId
    ) {
      allowedTargets = currentStep.allowedActions.useSpecial.allowedTargets;
    } else if (
      currentStep?.allowedActions.assist &&
      currentStep.allowedActions.assist.shipId === selectedShipId
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
          if (shipPosition.shipId === selectedShipId) return;
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

      if (canShoot && distance > 0) {
        const shouldCheckLineOfSight =
          distance > 1 &&
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3));

        if (
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
      if (shipPosition.shipId === selectedShipId) return;

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
      if (shipPosition.shipId === selectedShipId) return;

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
            const isOccupied = gameState.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );

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
            const isOccupied = gameState.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );

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
          const isOccupied = gameState.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

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
                  const isMoveOccupied = gameState.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol,
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
          const isOccupied = gameState.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

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
                  const isMoveOccupied = gameState.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol,
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

  // Wrap setters to intercept and validate actions
  const wrappedSetSelectedShipId = useCallback(
    (shipId: bigint | null) => {
      if (shipId === null) {
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        return;
      }

      const idString = shipId.toString() as TutorialShipId;

      // Validate ship selection
      const validation = validateAction({ type: "selectShip", shipId: idString });
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
    [validateAction, executeAction],
  );

  const wrappedSetPreviewPosition = useCallback(
    (position: { row: number; col: number } | null) => {
      if (!position) {
        setPreviewPosition(null);
        return;
      }

      // Validate move action
      if (
        selectedShipId &&
        currentStep?.allowedActions.moveShip &&
        selectedShipId.toString() ===
          currentStep.allowedActions.moveShip.shipId
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

        // Always show the preview (same as main game), then execute the action.
        setPreviewPosition(position);
        executeAction({
          type: "moveShip",
          shipId: selectedShipId.toString() as TutorialShipId,
          position,
          actionType: ActionType.Pass,
        });
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
        selectedShipId.toString() ===
          currentStep.allowedActions.shoot.shipId &&
        currentStep.allowedActions.shoot.allowedTargets.includes(idString)
      ) {
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
          executeAction({
            type: "useSpecial",
            shipId: selectedShipId.toString() as TutorialShipId,
            targetShipId: idString,
            actionType: ActionType.Special,
          });
          setSelectedShipId(null);
          setTargetShipId(null);
          setPreviewPosition(null);
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
    [selectedShipId, currentStep, validateAction, executeAction],
  );

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen p-4 space-y-4">
      {/* Game-style header (mirrors main GameDisplay layout, simplified for tutorial) */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-mono text-white flex items-center gap-3">
            <span>Tutorial Game {gameState.gameId}</span>
            <span className="text-gray-400 text-base">
              Round {gameState.turnState.currentRound.toString()}
            </span>
          </h1>
          <div className="text-sm text-gray-400 mt-1">
            Your turn is always active in this simulated game.
          </div>
        </div>
        {/* Score box styled like the live game */}
        <div
          className="ml-6 p-2 border border-solid w-48 text-lg"
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
                {gameState.creatorScore.toString()}/{gameState.maxScore.toString()}
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
                {gameState.joinerScore.toString()}/{gameState.maxScore.toString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <div
          className="bg-gray-900 rounded-none p-2 w-full"
          style={{
            outline: `2px solid #60a5fa`, // Always blue for tutorial player
            outlineOffset: 0,
            borderColor: "#374151",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <GameGrid
            grid={grid}
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
            validTargets={validTargets}
            assistableTargets={assistableTargets}
            assistableTargetsFromStart={assistableTargetsFromStart}
            dragShootingRange={dragShootingRange}
            dragValidTargets={dragValidTargets}
            isCurrentPlayerTurn={true}
            isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
            movedShipIdsSet={movedShipIdsSet}
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
            lastMoveActionType={lastMoveProps.lastMoveActionType}
            lastMoveTargetShipId={lastMoveProps.lastMoveTargetShipId}
            lastMoveIsCurrentPlayer={lastMoveProps.lastMoveIsCurrentPlayer}
            setSelectedShipId={wrappedSetSelectedShipId}
            setPreviewPosition={wrappedSetPreviewPosition}
            setTargetShipId={wrappedSetTargetShipId}
            setSelectedWeaponType={setSelectedWeaponType}
            setHoveredCell={setHoveredCell}
            setDraggedShipId={setDraggedShipId}
            setDragOverCell={setDragOverCell}
          />
        </div>

        {/* Instructions: overlap grid bottom by ~50%, aligned to left */}
        <div className="pointer-events-none absolute inset-x-0 top-full flex justify-start">
          <div className="pointer-events-auto max-w-2xl w-full transform -translate-y-1/2">
            <TutorialStepOverlay />
          </div>
        </div>
      </div>

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border border-cyan-400 rounded-none p-4">
          <p className="text-cyan-300 font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name ||
              selectedShipId.toString()}
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
