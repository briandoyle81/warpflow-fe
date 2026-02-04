"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import defaultMap from "../../public/default_map.json";
import { TutorialContextValue } from "../types/onboarding";
import {
  ALL_TUTORIAL_SHIPS,
  TUTORIAL_PLAYER_ADDRESS,
} from "../data/tutorialShips";
import { toast } from "react-hot-toast";
import { ActionType, ShipPosition, Attributes, Ship } from "../types/types";
import { GameGrid } from "./GameGrid";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";

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

  // Map of shipId to ship object
  const shipMap = useMemo(() => {
    return new Map<bigint, Ship>(
      ALL_TUTORIAL_SHIPS.map((ship) => [ship.id, ship]),
    );
  }, []);

  // Create grids to track blocked and scoring positions from default map
  const { blockedGrid, scoringGrid, onlyOnceGrid } = useMemo(() => {
    const blockedGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(false));

    const scoringGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(0));

    const onlyOnceGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(false));

    // Process blocked tiles from default map
    if (defaultMap.blockedTiles && Array.isArray(defaultMap.blockedTiles)) {
      defaultMap.blockedTiles.forEach((row, rowIndex) => {
        if (Array.isArray(row)) {
          row.forEach((isBlocked, colIndex) => {
            if (isBlocked && rowIndex < GRID_HEIGHT && colIndex < GRID_WIDTH) {
              blockedGrid[rowIndex][colIndex] = true;
            }
          });
        }
      });
    }

    // Process scoring tiles from default map
    if (defaultMap.scoringTiles && Array.isArray(defaultMap.scoringTiles)) {
      defaultMap.scoringTiles.forEach((row, rowIndex) => {
        if (Array.isArray(row)) {
          row.forEach((points, colIndex) => {
            if (points > 0 && rowIndex < GRID_HEIGHT && colIndex < GRID_WIDTH) {
              scoringGrid[rowIndex][colIndex] = points;
            }
          });
        }
      });
    }

    // Process only once tiles from default map
    if (defaultMap.onlyOnceTiles && Array.isArray(defaultMap.onlyOnceTiles)) {
      defaultMap.onlyOnceTiles.forEach((row, rowIndex) => {
        if (Array.isArray(row)) {
          row.forEach((onlyOnce, colIndex) => {
            if (onlyOnce && rowIndex < GRID_HEIGHT && colIndex < GRID_WIDTH) {
              onlyOnceGrid[rowIndex][colIndex] = true;
            }
          });
        }
      });
    }

    return { blockedGrid, scoringGrid, onlyOnceGrid };
  }, []);

  // Get ship attributes by ship ID from game state
  const getShipAttributes = useCallback(
    (shipId: bigint): Attributes | null => {
      const shipIndex = gameState.shipIds?.findIndex((id) => id === shipId);
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
    (shipId: bigint): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === TUTORIAL_PLAYER_ADDRESS : false;
    },
    [shipMap],
  );

  // Build a set of shipIds that have already moved this round
  const movedShipIdsSet = useMemo(() => {
    const set = new Set<bigint>();
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

    // Place ships on the grid
    gameState.shipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;
      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        newGrid[position.row][position.col] = shipPosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipPosition.shipId && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...shipPosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    return newGrid;
  }, [gameState.shipPositions, selectedShipId, previewPosition]);

  // Calculate movement range for selected ship
  // Show full range for viewing, but filter by tutorial constraints if step requires specific moves
  const movementRange = useMemo(() => {
    if (!selectedShipId) return [];

    const attributes = getShipAttributes(selectedShipId);
    const movementRange = attributes?.movement || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    // If ship is already moved to a different preview position, don't show movement range
    if (
      previewPosition &&
      (previewPosition.row !== currentPosition.position.row ||
        previewPosition.col !== currentPosition.position.col)
    ) {
      return [];
    }

    // Check if this step has specific move constraints
    const allowedMoveAction = currentStep?.allowedActions.moveShip;
    const hasMoveConstraints =
      allowedMoveAction && allowedMoveAction.shipId === selectedShipId;

    const allowedPositionsSet = hasMoveConstraints
      ? new Set(
          (allowedMoveAction?.allowedPositions || []).map(
            (pos) => `${pos.row}-${pos.col}`,
          ),
        )
      : null;

    const validMoves: { row: number; col: number }[] = [];
    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    // Check all positions within movement range
    for (
      let row = Math.max(0, startRow - movementRange);
      row <= Math.min(GRID_HEIGHT - 1, startRow + movementRange);
      row++
    ) {
      for (
        let col = Math.max(0, startCol - movementRange);
        col <= Math.min(GRID_WIDTH - 1, startCol + movementRange);
        col++
      ) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance <= movementRange && distance > 0) {
          const isOccupied = gameState.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col,
          );

          if (!isOccupied) {
            // For step 5 (move-ship), show all valid moves for viewing
            // But only allow moving to the specific allowed position
            // For other steps with constraints, only show allowed positions
            if (!hasMoveConstraints) {
              validMoves.push({ row, col });
            } else if (currentStep?.id === "move-ship") {
              // Step 5: Show all valid moves
              validMoves.push({ row, col });
            } else if (allowedPositionsSet?.has(`${row}-${col}`)) {
              // Other steps: Only show allowed positions
              validMoves.push({ row, col });
            }
          }
        }
      }
    }

    return validMoves;
  }, [
    selectedShipId,
    currentStep,
    gameState.shipPositions,
    getShipAttributes,
    previewPosition,
  ]);

  // Get the highlighted/allowed position for step 5
  const highlightedMovePosition = useMemo(() => {
    if (
      currentStep?.id === "move-ship" &&
      currentStep?.allowedActions.moveShip &&
      selectedShipId === currentStep.allowedActions.moveShip.shipId
    ) {
      const allowedPositions =
        currentStep.allowedActions.moveShip.allowedPositions;
      if (allowedPositions.length > 0) {
        return allowedPositions[0];
      }
    }
    return null;
  }, [currentStep, selectedShipId]);

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
    let allowedTargets: bigint[] | null = null;
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
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const targets: {
      shipId: bigint;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      // If step has constraints, only include allowed targets
      // Otherwise, show all valid targets (for viewing)
      if (allowedTargetsSet && !allowedTargetsSet.has(shipPosition.shipId)) {
        return;
      }

      const ship = shipMap.get(shipPosition.shipId);
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
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const startRow = previewPosition
      ? previewPosition.row
      : currentPosition.position.row;
    const startCol = previewPosition
      ? previewPosition.col
      : currentPosition.position.col;

    const assistableShips: {
      shipId: bigint;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
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
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    const assistableShips: {
      shipId: bigint;
      position: { row: number; col: number };
    }[] = [];

    gameState.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
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
    const movementRange = attributes?.movement || 1;
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = gameState.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const validShootingPositions: { row: number; col: number }[] = [];

    if (
      previewPosition &&
      (previewPosition.row !== currentPosition.position.row ||
        previewPosition.col !== currentPosition.position.col)
    ) {
      // If ship is moved to a different preview position, only show shooting range from that position
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

      // Validate ship selection
      const validation = validateAction({ type: "selectShip", shipId });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      setSelectedShipId(shipId);
      executeAction({ type: "selectShip", shipId });
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
        selectedShipId === currentStep.allowedActions.moveShip.shipId
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
          shipId: selectedShipId,
          position,
        });
        if (!moveValidation.valid) {
          toast.error(moveValidation.message || "Move not allowed");
          return;
        }

        // If step shows transaction after, execute move directly without preview
        if (currentStep?.showTransactionAfter) {
          executeAction({
            type: "moveShip",
            shipId: selectedShipId,
            position,
            actionType: ActionType.Pass,
          });
          // Clear preview since we're executing the move directly
          setPreviewPosition(null);
        } else {
          // Otherwise, show preview first
          setPreviewPosition(position);
          executeAction({
            type: "moveShip",
            shipId: selectedShipId,
            position,
            actionType: ActionType.Pass,
          });
        }
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

      // Check for shoot action
      if (
        currentStep?.allowedActions.shoot &&
        selectedShipId === currentStep.allowedActions.shoot.shipId &&
        currentStep.allowedActions.shoot.allowedTargets.includes(shipId)
      ) {
        const shootValidation = validateAction({
          type: "shoot",
          shipId: selectedShipId,
          targetShipId: shipId,
        });
        if (shootValidation.valid) {
          executeAction({
            type: "shoot",
            shipId: selectedShipId,
            targetShipId: shipId,
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
        selectedShipId === currentStep.allowedActions.useSpecial.shipId &&
        currentStep.allowedActions.useSpecial.allowedTargets.includes(shipId)
      ) {
        const specialValidation = validateAction({
          type: "useSpecial",
          shipId: selectedShipId,
          targetShipId: shipId,
          specialType: currentStep.allowedActions.useSpecial.specialType,
        });
        if (specialValidation.valid) {
          executeAction({
            type: "useSpecial",
            shipId: selectedShipId,
            targetShipId: shipId,
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
        selectedShipId === currentStep.allowedActions.assist.shipId &&
        currentStep.allowedActions.assist.allowedTargets.includes(shipId)
      ) {
        const assistValidation = validateAction({
          type: "assist",
          shipId: selectedShipId,
          targetShipId: shipId,
        });
        if (assistValidation.valid) {
          executeAction({
            type: "assist",
            shipId: selectedShipId,
            targetShipId: shipId,
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
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen p-4">
      <div className="mb-4 bg-black/40 border border-cyan-400 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-300 font-mono">
              Tutorial Game
            </h1>
            <p className="text-sm text-gray-400">Simulated game for learning</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Score</div>
            <div className="text-lg font-bold">
              <span className="text-green-300">
                You: {gameState.creatorScore.toString()}
              </span>{" "}
              /{" "}
              <span className="text-red-300">
                Enemy: {gameState.joinerScore.toString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Max Score: {gameState.maxScore.toString()}
            </div>
          </div>
        </div>
      </div>

      <div
        className="bg-gray-900 rounded-lg p-2 w-full"
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
          setSelectedShipId={wrappedSetSelectedShipId}
          setPreviewPosition={wrappedSetPreviewPosition}
          setTargetShipId={wrappedSetTargetShipId}
          setSelectedWeaponType={setSelectedWeaponType}
          setHoveredCell={setHoveredCell}
          setDraggedShipId={setDraggedShipId}
          setDragOverCell={setDragOverCell}
        />
      </div>

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border border-cyan-400 rounded-lg p-4">
          <p className="text-cyan-300 font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name || selectedShipId.toString()}
          </p>
          {currentStep?.allowedActions.moveShip &&
            currentStep.allowedActions.moveShip.shipId === selectedShipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted grid cell to move.
              </p>
            )}
          {currentStep?.allowedActions.shoot &&
            currentStep.allowedActions.shoot.shipId === selectedShipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted enemy ship to shoot.
              </p>
            )}
          {currentStep?.allowedActions.useSpecial &&
            currentStep.allowedActions.useSpecial.shipId === selectedShipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click a highlighted ship to use your special ability.
              </p>
            )}
          {currentStep?.allowedActions.assist &&
            currentStep.allowedActions.assist.shipId === selectedShipId && (
              <p className="text-yellow-300 text-sm mt-2">
                Click the highlighted friendly ship to assist it.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
