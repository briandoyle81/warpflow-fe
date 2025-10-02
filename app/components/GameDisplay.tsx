"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import {
  GameDataView,
  ShipPosition,
  Attributes,
  getMainWeaponName,
  getSpecialName,
  ActionType,
} from "../types/types";
import { useShipsByIds } from "../hooks/useShipsByIds";
import { ShipImage } from "./ShipImage";
import { useGetGameMapState } from "../hooks/useMapsContract";
import { gameContractConfig, useGetGame } from "../hooks/useGameContract";
import {
  useContractEvents,
  registerGameRefetch,
  unregisterGameRefetch,
  globalGameRefetchFunctions,
} from "../hooks/useContractEvents";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { useSpecialRange } from "../hooks/useSpecialRange";
import { FleeSafetySwitch } from "./FleeSafetySwitch";

interface GameDisplayProps {
  game: GameDataView;
  onBack: () => void;
  refetch?: () => void;
}

const GameDisplay: React.FC<GameDisplayProps> = ({
  game: initialGame,
  onBack,
  refetch,
}) => {
  const { address } = useAccount();
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special"
  >("weapon");

  // Fetch the current game data to get real-time updates
  const {
    data: gameData,
    isLoading: gameLoading,
    error: gameError,
    refetch: refetchGame,
  } = useGetGame(Number(initialGame.metadata.gameId));

  // Use the fetched game data if available, otherwise fall back to initial game
  const game = (gameData as GameDataView) || initialGame;

  // Enable real-time event listening for game updates
  useContractEvents();

  // Register this game's refetch function for global event handling
  React.useEffect(() => {
    const gameId = Number(game.metadata.gameId);
    console.log(`Registering refetch function for game ${gameId}`);

    // Create a refetch function that also clears targeting state
    const refetchWithClear = () => {
      setTargetShipId(null);
      refetchGame();
    };

    registerGameRefetch(gameId, refetchWithClear);

    // Cleanup: unregister when component unmounts
    return () => {
      console.log(`Unregistering refetch function for game ${gameId}`);
      unregisterGameRefetch(gameId);
    };
  }, [refetchGame, game.metadata.gameId, setTargetShipId]);

  // Clear targeting state when game data changes (after successful moves)
  React.useEffect(() => {
    if (gameData && gameData !== initialGame) {
      // Game data has been updated, clear targeting state
      setTargetShipId(null);
    }
  }, [gameData, initialGame]);

  // Grid dimensions from the contract
  const GRID_WIDTH = 30;
  const GRID_HEIGHT = 20;

  // Get game map state directly from the Maps contract
  const { data: gameMapState, isLoading: mapLoading } = useGetGameMapState(
    Number(game.metadata.gameId)
  );

  // Create grids to track blocked and scoring positions
  const { blockedGrid, scoringGrid, onlyOnceGrid } = React.useMemo(() => {
    const blockedGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(false));

    const scoringGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(0));

    const onlyOnceGrid = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(false));

    // The contract returns [blockedPositions, scoringPositions] as a tuple
    // blockedPositions: Array<Position> where Position = { row: int16, col: int16 }
    // scoringPositions: Array<ScoringPosition> where ScoringPosition = { row: int16, col: int16, points: uint8, onlyOnce: bool }
    const gameMapData = gameMapState as
      | [
          Array<{ row: number; col: number }>,
          Array<{ row: number; col: number; points: number; onlyOnce: boolean }>
        ]
      | undefined;

    const blockedPositions = gameMapData?.[0];
    const scoringPositions = gameMapData?.[1];

    // Process blocked positions
    if (blockedPositions && Array.isArray(blockedPositions)) {
      console.log(`Processing ${blockedPositions.length} blocked positions`);
      blockedPositions.forEach((pos: { row: number; col: number }) => {
        if (
          pos.row >= 0 &&
          pos.row < GRID_HEIGHT &&
          pos.col >= 0 &&
          pos.col < GRID_WIDTH
        ) {
          blockedGrid[pos.row][pos.col] = true;
        }
      });
    }

    // Process scoring positions
    if (scoringPositions && Array.isArray(scoringPositions)) {
      console.log(`Processing ${scoringPositions.length} scoring positions`);
      scoringPositions.forEach(
        (pos: {
          row: number;
          col: number;
          points: number;
          onlyOnce: boolean;
        }) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_WIDTH
          ) {
            scoringGrid[pos.row][pos.col] = pos.points;
            // Track if this scoring position can only be claimed once
            if (pos.onlyOnce) {
              onlyOnceGrid[pos.row][pos.col] = true;
            }
          }
        }
      );
    }

    // Count positions
    const blockedCount = blockedGrid.flat().filter(Boolean).length;
    const scoringCount = scoringGrid
      .flat()
      .filter((points) => points > 0).length;
    const onlyOnceCount = onlyOnceGrid.flat().filter(Boolean).length;
    console.log(
      `Map loaded: ${blockedCount} blocked, ${scoringCount} scoring positions, ${onlyOnceCount} only-once positions`
    );

    return { blockedGrid, scoringGrid, onlyOnceGrid };
  }, [gameMapState]);

  // Get all ship IDs from the game
  const allShipIds = [
    ...game.creatorActiveShipIds,
    ...game.joinerActiveShipIds,
  ];

  // Fetch ship details for all ships in the game
  const { ships: gameShips, isLoading: shipsLoading } =
    useShipsByIds(allShipIds);

  // Create a map of ship ID to ship object for quick lookup
  const shipMap = React.useMemo(() => {
    const map = new Map<bigint, (typeof gameShips)[0]>();
    gameShips.forEach((ship) => {
      map.set(ship.id, ship);
    });
    return map;
  }, [gameShips]);

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);

  // Get ship attributes by ship ID from game data
  const getShipAttributes = React.useCallback(
    (shipId: bigint): Attributes | null => {
      // Find the ship ID in the shipIds array to get the correct index
      const shipIndex = game.shipIds?.findIndex((id) => id === shipId);

      if (
        shipIndex === -1 ||
        !game.shipAttributes ||
        !game.shipAttributes[shipIndex]
      ) {
        return null;
      }

      const attributes = game.shipAttributes[shipIndex];

      return attributes;
    },
    [game.shipAttributes, game.shipIds]
  );

  // Build a set of shipIds that have already moved this round (from game data)
  const movedShipIdsSet = React.useMemo(() => {
    const set = new Set<bigint>();
    // Add creator ships that have moved
    if (game.creatorMovedShipIds) {
      game.creatorMovedShipIds.forEach((id) => set.add(id));
    }
    // Add joiner ships that have moved
    if (game.joinerMovedShipIds) {
      game.joinerMovedShipIds.forEach((id) => set.add(id));
    }
    return set;
  }, [game.creatorMovedShipIds, game.joinerMovedShipIds]);

  // Check line of sight between two positions using Bresenham's algorithm
  const hasLineOfSight = React.useCallback(
    (
      row0: number,
      col0: number,
      row1: number,
      col1: number,
      blockedGrid: boolean[][]
    ): boolean => {
      // Early checks - always check start and end
      if (blockedGrid[row0] && blockedGrid[row0][col0]) {
        return false;
      }

      if (row0 === row1 && col0 === col1) {
        return !(blockedGrid[row1] && blockedGrid[row1][col1]);
      }

      // Use Bresenham's algorithm for line of sight
      const dRow = Math.abs(row1 - row0);
      const dCol = Math.abs(col1 - col0);
      const sRow = row1 > row0 ? 1 : row1 < row0 ? -1 : 0;
      const sCol = col1 > col0 ? 1 : col1 < col0 ? -1 : 0;

      let err = dCol - dRow;
      let row = row0;
      let col = col0;

      while (true) {
        // Check if we've reached the target
        if (row === row1 && col === col1) {
          return !(blockedGrid[row1] && blockedGrid[row1][col1]);
        }

        const e2 = err * 2;

        // Handle tie case (corner) - exclusive with other branches
        if (e2 === 0) {
          // Check flankers before moving
          if (
            blockedGrid[row] &&
            blockedGrid[row][col + sCol] &&
            blockedGrid[row + sRow] &&
            blockedGrid[row + sRow][col]
          ) {
            return false;
          }

          // Advance diagonally
          col += sCol;
          err -= dRow;
          row += sRow;
          err += dCol;

          // Check new cell unless it's the target
          if (
            (row !== row1 || col !== col1) &&
            blockedGrid[row] &&
            blockedGrid[row][col]
          ) {
            return false;
          }
          continue;
        }

        // Column step
        if (e2 > -dRow) {
          err -= dRow;
          col += sCol;
          if (
            (row !== row1 || col !== col1) &&
            blockedGrid[row] &&
            blockedGrid[row][col]
          ) {
            return false;
          }
        }

        // Row step
        if (e2 < dCol) {
          err += dCol;
          row += sRow;
          if (
            (row !== row1 || col !== col1) &&
            blockedGrid[row] &&
            blockedGrid[row][col]
          ) {
            return false;
          }
        }
      }
    },
    []
  );

  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = React.useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid
    game.shipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;
      if (
        position.row >= 0 &&
        position.row < GRID_HEIGHT &&
        position.col >= 0 &&
        position.col < GRID_WIDTH
      ) {
        // Always place the original ship in its original position
        newGrid[position.row][position.col] = shipPosition;

        // If this ship is selected and has a preview position, also place a preview copy
        if (selectedShipId === shipPosition.shipId && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...shipPosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true, // Mark as preview for styling
          };
        }
      }
    });

    return newGrid;
  }, [game.shipPositions, selectedShipId, previewPosition]);

  // Calculate movement range for selected ship (any ship, for viewing)
  const movementRange = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    const movementRange = attributes?.movement || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId
    );

    if (!currentPosition) return [];

    // If ship is already moved to a different preview position, don't show movement range
    // But if preview position is the same as current position (staying on scoring tile), treat as no preview
    if (
      previewPosition &&
      (previewPosition.row !== currentPosition.position.row ||
        previewPosition.col !== currentPosition.position.col)
    ) {
      return [];
    }

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
          // Check if position is not occupied by another ship
          // Blocked tiles only block line of sight, not movement
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col
          );

          if (!isOccupied) {
            validMoves.push({ row, col });
          }
        }
      }
    }

    return validMoves;
  }, [
    selectedShipId,
    gameShips,
    shipMap,
    game.shipPositions,
    getShipAttributes,
    previewPosition,
  ]);

  // Calculate damage for a target ship
  const calculateDamage = React.useCallback(
    (targetShipId: bigint) => {
      if (!selectedShipId)
        return { baseDamage: 0, reducedDamage: 0, willKill: false };

      const shooterAttributes = getShipAttributes(selectedShipId);
      const targetAttributes = getShipAttributes(targetShipId);

      if (!shooterAttributes || !targetAttributes)
        return { baseDamage: 0, reducedDamage: 0, willKill: false };

      // Handle ships with 0 hull points - they get reactor critical timer increment instead of damage
      if (targetAttributes.hullPoints === 0) {
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      // Calculate damage based on contract logic
      const baseDamage = shooterAttributes.gunDamage;
      const reduction = targetAttributes.damageReduction;
      const reducedDamage = Math.max(
        0,
        baseDamage - Math.floor((baseDamage * reduction) / 100)
      );

      const willKill = reducedDamage >= targetAttributes.hullPoints;

      return { baseDamage, reducedDamage, willKill, reactorCritical: false };
    },
    [selectedShipId, getShipAttributes]
  );

  // Get valid targets (enemy ships in shooting range from preview position or current position)
  const validTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    // Use preview position if available, otherwise use current position
    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId
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

    // Check all ships within shooting range
    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      // Filter targets based on weapon type
      if (selectedWeaponType === "special") {
        // Flak targets ALL ships in range (friendly and enemy)
        if (specialType === 3) {
          // Flak hits everything - don't filter by ownership
        } else if (specialType === 1) {
          // EMP targets enemy ships
          if (ship.owner === address) return; // Don't target friendly ships
        } else {
          // Other special abilities target friendly ships (allies)
          if (ship.owner !== address) return;
        }
      } else {
        // Weapons target enemy ships
        if (ship.owner === address) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      // Ships can always shoot enemies that are exactly 1 square away
      // OR within their normal shooting range
      const canShoot = distance === 1 || distance <= shootingRange;

      if (canShoot && distance > 0) {
        // Check line of sight
        if (
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
    previewPosition,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    hasLineOfSight,
    blockedGrid,
    game.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Get friendly ships with 0 hitpoints that are adjacent to the current ship
  const assistableTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId
    );

    if (!currentPosition) return [];

    // Use preview position if available, otherwise use current position
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

    // Check all ships for adjacency
    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      // Only friendly ships can be assisted
      if (ship.owner !== address) return;

      // Skip the current ship itself
      if (shipPosition.shipId === selectedShipId) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      // Check if adjacent (distance of 1)
      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        // Check if the ship has 0 hitpoints
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
    gameShips,
    shipMap,
    address,
    game.shipPositions,
    getShipAttributes,
  ]);

  // Get friendly ships with 0 hitpoints that are adjacent to the current ship's starting position
  // This is used to show assist options even when not moving
  const assistableTargetsFromStart = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId
    );

    if (!currentPosition) return [];

    const startRow = currentPosition.position.row;
    const startCol = currentPosition.position.col;

    const assistableShips: {
      shipId: bigint;
      position: { row: number; col: number };
    }[] = [];

    // Check all ships for adjacency from starting position
    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      // Only friendly ships can be assisted
      if (ship.owner !== address) return;

      // Skip the current ship itself
      if (shipPosition.shipId === selectedShipId) return;

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance =
        Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);

      // Check if adjacent (distance of 1)
      if (distance === 1) {
        const targetAttributes = getShipAttributes(shipPosition.shipId);
        // Check if the ship has 0 hitpoints
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
    gameShips,
    shipMap,
    address,
    game.shipPositions,
    getShipAttributes,
  ]);

  // Calculate shooting range for selected ship (where it could shoot from any valid move position)
  const shootingRange = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    const movementRange = attributes?.movement || 1;
    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId
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
            const isOccupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col
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
            const isOccupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col
            );

            if (!isOccupied) {
              // Check line of sight from preview position
              if (hasLineOfSight(startRow, startCol, row, col, blockedGrid)) {
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
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col
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
                  const isMoveOccupied = game.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol
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
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col
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
                  const isMoveOccupied = game.shipPositions.some(
                    (pos) =>
                      pos.position.row === moveRow &&
                      pos.position.col === moveCol
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
                      // Check line of sight using the blocked grid
                      if (
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
    gameShips,
    shipMap,
    game.shipPositions,
    getShipAttributes,
    blockedGrid,
    hasLineOfSight,
    previewPosition,
    selectedWeaponType,
    specialRange,
  ]);

  // Check if it's the current player's turn
  const isMyTurn = game.turnState.currentTurn === address;

  // Check if a ship belongs to the current player
  const isShipOwnedByCurrentPlayer = (shipId: bigint): boolean => {
    const ship = shipMap.get(shipId);
    return ship ? ship.owner === address : false;
  };

  // Handle move submission - now handled by TransactionButton

  // Handle move cancellation
  const handleCancelMove = () => {
    setPreviewPosition(null);
    setSelectedShipId(null);
    setTargetShipId(null);
    setSelectedWeaponType("weapon");
  };

  // Show loading state if game data is being fetched
  if (gameLoading) {
    return (
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">Loading game data...</p>
        </div>
      </div>
    );
  }

  // Show error state if game data failed to load
  if (gameError) {
    return (
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
          >
            ← Back to Games
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400">
            Error loading game data: {gameError.message}
          </p>
          <button
            onClick={() => refetchGame()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-mono hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while ships and map data are being fetched
  if (shipsLoading || mapLoading) {
    return (
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
            >
              ← BACK TO GAMES
            </button>
            <h1 className="text-2xl font-mono text-white">
              Game #{game.metadata.gameId.toString()}
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-cyan-400 font-mono">Loading ship data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
          >
            ← BACK TO GAMES
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-mono text-white">
              Game #{game.metadata.gameId.toString()}
            </h1>
            {/* Turn Indicator */}
            {game.metadata.winner ===
              "0x0000000000000000000000000000000000000000" && (
              <div className="text-sm text-gray-400">
                <span className={isMyTurn ? "text-blue-400" : "text-red-400"}>
                  {isMyTurn ? "YOUR TURN" : "OPPONENT" + "'" + "S TURN"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Game Info Cards - Center */}
        <div className="flex gap-2 text-xs">
          <div className="bg-gray-800 rounded p-2 border border-gray-700 w-48">
            <h4 className="text-white font-mono mb-1">Scores</h4>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-400">My Score:</span>
                <span className="text-white">
                  {game.metadata.creator === address
                    ? game.creatorScore?.toString() || "0"
                    : game.joinerScore?.toString() || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opponent:</span>
                <span className="text-white">
                  {game.metadata.creator === address
                    ? game.joinerScore?.toString() || "0"
                    : game.creatorScore?.toString() || "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded p-2 border border-gray-700 w-48">
            <h4 className="text-white font-mono mb-1">Game Info</h4>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Round:</span>
                <span className="text-white">
                  {game.turnState.currentRound.toString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Score Target:</span>
                <span className="text-white">
                  {game.maxScore?.toString() || "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded p-2 border border-gray-700 w-48">
            <h4 className="text-white font-mono mb-1">Players</h4>
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Creator:</span>
                <span className="text-white font-mono text-xs">
                  {game.metadata.creator.slice(0, 6)}...
                  {game.metadata.creator.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Joiner:</span>
                <span className="text-white font-mono text-xs">
                  {game.metadata.joiner.slice(0, 6)}...
                  {game.metadata.joiner.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug buttons and Emergency Flee */}
        <div className="flex items-center space-x-4">
          {/* Debug buttons - remove these later */}
          {game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  console.log("Manual refetch triggered");
                  refetchGame();
                }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
              >
                Test Refetch
              </button>
              <button
                onClick={() => {
                  console.log(
                    "Testing event system - triggering refetch for all games"
                  );
                  globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
                    console.log(
                      `Manually triggering refetch for game ${gameId}`
                    );
                    refetchFn();
                  });
                }}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded"
              >
                Test Events
              </button>
            </div>
          )}

          {/* Emergency Flee Safety Switch */}
          {game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" && (
            <FleeSafetySwitch
              gameId={game.metadata.gameId}
              onFlee={() => {
                // Handle successful flee - could navigate back or show message
                toast.success("You have fled the battle!");
                refetch?.();
              }}
            />
          )}

          {/* Game Status */}
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {game.metadata.winner !==
                "0x0000000000000000000000000000000000000000" && (
                <span
                  className={
                    game.metadata.winner === address
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {game.metadata.winner === address ? "VICTORY" : "DEFEAT"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Map */}
      <div className="bg-gray-900 rounded-lg p-2 border border-gray-700 w-full">
        <h3 className="text-white font-mono mb-4">Battle Map</h3>

        {/* Map Grid */}
        <div className="w-full px-2">
          <div
            key="game-grid"
            className="grid gap-0 border border-gray-900"
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
              width: "100%",
              aspectRatio: "3 / 2",
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const ship = cell ? shipMap.get(cell.shipId) : null;
                const isSelected = selectedShipId === cell?.shipId;
                const isMovementTile = movementRange.some(
                  (pos) => pos.row === rowIndex && pos.col === colIndex
                );
                const isShootingTile = shootingRange.some(
                  (pos) => pos.row === rowIndex && pos.col === colIndex
                );
                const isCurrentPlayerTurn =
                  game.turnState.currentTurn === address;

                // Check if this ship has already moved this round
                const hasShipMoved = cell && movedShipIdsSet.has(cell.shipId);

                // Check if this cell contains a valid target
                const isValidTarget =
                  cell &&
                  selectedShipId &&
                  isCurrentPlayerTurn &&
                  isShipOwnedByCurrentPlayer(selectedShipId) &&
                  (() => {
                    // Check if this is a valid target based on weapon type
                    const isValidTargetType =
                      selectedWeaponType === "special"
                        ? specialType === 3 // Flak
                          ? true // Flak hits ALL ships in range (friendly and enemy)
                          : specialType === 1 // EMP
                          ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                          : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                        : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships
                    return isValidTargetType;
                  })() &&
                  validTargets.some((target) => target.shipId === cell.shipId);

                // Check if this cell contains an assistable target (friendly ship with 0 HP)
                const isAssistableTarget =
                  cell &&
                  selectedShipId &&
                  isCurrentPlayerTurn &&
                  isShipOwnedByCurrentPlayer(selectedShipId) &&
                  (assistableTargets.some(
                    (target) => target.shipId === cell.shipId
                  ) ||
                    assistableTargetsFromStart.some(
                      (target) => target.shipId === cell.shipId
                    ));
                const isSelectedTarget = cell && targetShipId === cell.shipId;

                const handleCellClick = () => {
                  if (cell) {
                    // Check for repair drone auto-switch FIRST (before any other logic)
                    if (
                      selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId)
                    ) {
                      const isFriendlyShip = isShipOwnedByCurrentPlayer(
                        cell.shipId
                      );
                      const selectedShip = shipMap.get(selectedShipId);
                      const hasRepairDrones =
                        selectedShip?.equipment.special === 2; // Repair special

                      if (isFriendlyShip && hasRepairDrones) {
                        // Check if the friendly ship is in repair range
                        const isInRepairRange = validTargets.some(
                          (target) => target.shipId === cell.shipId
                        );
                        if (isInRepairRange) {
                          // Switch to repair drones and target this ship
                          setSelectedWeaponType("special");
                          setTargetShipId(cell.shipId);
                          return;
                        }
                      }
                    }

                    // If we have a selected ship and this is a valid target in range, select as target
                    if (
                      selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId)
                    ) {
                      // Check if this is a valid target based on weapon type
                      const isValidTargetType =
                        selectedWeaponType === "special"
                          ? specialType === 3 // Flak
                            ? true // Flak hits ALL ships in range (friendly and enemy)
                            : specialType === 1 // EMP
                            ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                            : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                          : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships

                      if (isValidTargetType) {
                        const isInShootingRange = validTargets.some(
                          (target) => target.shipId === cell.shipId
                        );
                        if (isInShootingRange) {
                          // For flak special, select all targets in range
                          if (
                            selectedWeaponType === "special" &&
                            specialType === 3
                          ) {
                            // Flak affects all targets in range, so we don't need to set a specific target
                            // Just indicate that flak is ready to fire
                            setTargetShipId(0n); // Use 0 to indicate area-of-effect
                          } else {
                            // EMP and other specials target individual ships
                            setTargetShipId(cell.shipId);
                          }
                          return;
                        }
                      }

                      // Check if this is a friendly ship with 0 hitpoints that can be assisted
                      const isAssistableTarget = assistableTargets.some(
                        (target) => target.shipId === cell.shipId
                      );
                      const isAssistableFromStart =
                        assistableTargetsFromStart.some(
                          (target) => target.shipId === cell.shipId
                        );
                      if (isAssistableTarget || isAssistableFromStart) {
                        setTargetShipId(cell.shipId);
                        return;
                      }
                    }

                    // If clicking on the same ship, deselect it and reset preview
                    if (selectedShipId === cell.shipId) {
                      setSelectedShipId(null);
                      setPreviewPosition(null);
                      setTargetShipId(null);
                    } else {
                      // Check if this is the current player's turn and they're trying to select a moved ship
                      if (
                        isCurrentPlayerTurn &&
                        isShipOwnedByCurrentPlayer(cell.shipId) &&
                        movedShipIdsSet.has(cell.shipId)
                      ) {
                        // Don't allow selecting ships that have already moved this round
                        return;
                      }

                      // Allow selecting any ship (for viewing stats/range)
                      setSelectedShipId(cell.shipId);
                      setTargetShipId(null);
                      setSelectedWeaponType("weapon"); // Reset to weapon when selecting new ship

                      // If it's the current player's turn and they own this ship and it's on a scoring tile, set preview position
                      if (
                        isCurrentPlayerTurn &&
                        isShipOwnedByCurrentPlayer(cell.shipId) &&
                        !movedShipIdsSet.has(cell.shipId) &&
                        scoringGrid[rowIndex] &&
                        scoringGrid[rowIndex][colIndex] > 0
                      ) {
                        setPreviewPosition({ row: rowIndex, col: colIndex });
                      } else {
                        setPreviewPosition(null);
                      }
                    }
                  } else if (
                    isMovementTile &&
                    selectedShipId &&
                    isCurrentPlayerTurn &&
                    isShipOwnedByCurrentPlayer(selectedShipId) &&
                    !movedShipIdsSet.has(selectedShipId)
                  ) {
                    // Only allow moving ships owned by the current player
                    setPreviewPosition({ row: rowIndex, col: colIndex });
                    setTargetShipId(null); // Clear target when moving
                  }
                };

                const canMoveShip = selectedShipId
                  ? isShipOwnedByCurrentPlayer(selectedShipId) && isMyTurn
                  : false;

                // Check if this cell has a ship on a scoring tile
                const isShipOnScoringTile =
                  cell &&
                  scoringGrid[rowIndex] &&
                  scoringGrid[rowIndex][colIndex] > 0;

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`w-full h-full border border-gray-900 relative cursor-pointer ${
                      isSelected
                        ? canMoveShip
                          ? "bg-blue-900 ring-2 ring-blue-400"
                          : "bg-purple-900 ring-2 ring-purple-400"
                        : hasShipMoved &&
                          isCurrentPlayerTurn &&
                          isShipOwnedByCurrentPlayer(cell.shipId)
                        ? "bg-gray-700 opacity-60 cursor-not-allowed"
                        : isSelectedTarget
                        ? (() => {
                            // Check if this is an assist action
                            const isAssistAction =
                              assistableTargets.some(
                                (target) => target.shipId === cell.shipId
                              ) ||
                              assistableTargetsFromStart.some(
                                (target) => target.shipId === cell.shipId
                              );
                            if (isAssistAction) {
                              return "bg-cyan-900 ring-2 ring-cyan-400";
                            }
                            // Otherwise use weapon-based styling
                            return selectedWeaponType === "special"
                              ? specialType === 3 // Flak
                                ? "bg-red-900 ring-2 ring-red-400" // Flak uses red highlighting like regular weapons
                                : "bg-blue-900 ring-2 ring-blue-400" // Other specials use blue
                              : "bg-red-900 ring-2 ring-red-400";
                          })()
                        : isValidTarget
                        ? selectedWeaponType === "special"
                          ? specialType === 3 // Flak
                            ? "bg-red-900/50 ring-1 ring-red-400" // Flak uses red highlighting like regular weapons
                            : "bg-blue-900/50 ring-1 ring-blue-400" // Other specials use blue
                          : "bg-orange-900/50 ring-1 ring-orange-400"
                        : isAssistableTarget
                        ? "bg-cyan-900/50 ring-1 ring-cyan-400"
                        : isMovementTile
                        ? "bg-green-900/50"
                        : "bg-gray-950"
                    } ${isShipOnScoringTile ? "ring-2 ring-yellow-400" : ""}`}
                    onClick={handleCellClick}
                    title={
                      cell
                        ? (() => {
                            const attributes = getShipAttributes(cell.shipId);
                            const ship = shipMap.get(cell.shipId);
                            const gunName = ship
                              ? getMainWeaponName(ship.equipment.mainWeapon)
                              : "Unknown";
                            const shipName = ship?.name || "Unknown Ship";
                            const moved = movedShipIdsSet.has(cell.shipId)
                              ? "Yes"
                              : "No";
                            const criticalWarning =
                              attributes && attributes.hullPoints === 0
                                ? `
🚨 CRITICAL: This ship will be destroyed at the end of the round unless healed or assisted to flee!`
                                : "";

                            const movedWarning =
                              hasShipMoved &&
                              isCurrentPlayerTurn &&
                              isShipOwnedByCurrentPlayer(cell.shipId)
                                ? `
⚠️ This ship has already moved this round and cannot be selected for moves!`
                                : "";

                            return `${shipName} (${
                              cell.isCreator ===
                              (address === game.metadata.creator)
                                ? "My Fleet"
                                : "Enemy Fleet"
                            }) ${
                              isSelected ? "(Selected)" : ""
                            }${criticalWarning}${movedWarning}
${
  attributes
    ? `
Attributes:
• Gun: ${gunName}
• Movement: ${attributes.movement}
• Range: ${attributes.range}
• Gun Damage: ${attributes.gunDamage}
• Hull: ${attributes.hullPoints}/${attributes.maxHullPoints}
• Damage Reduction: ${attributes.damageReduction}
• Reactor Critical: ${attributes.reactorCriticalTimer}/3
• Moved this round: ${moved}`
    : "Attributes: Loading..."
}`;
                          })()
                        : onlyOnceGrid[rowIndex][colIndex]
                        ? `Crystal Deposit: ${scoringGrid[rowIndex][colIndex]} points (only once) (${rowIndex}, ${colIndex})`
                        : scoringGrid[rowIndex][colIndex] > 0
                        ? `Gold Deposit: ${scoringGrid[rowIndex][colIndex]} points (${rowIndex}, ${colIndex})`
                        : blockedGrid[rowIndex][colIndex]
                        ? `Blocked Line of Sight (${rowIndex}, ${colIndex})`
                        : isMovementTile
                        ? `Move here (${rowIndex}, ${colIndex})`
                        : isShootingTile
                        ? `Shooting range (${rowIndex}, ${colIndex})`
                        : isAssistableTarget
                        ? `Click to assist this ship (${rowIndex}, ${colIndex})`
                        : isValidTarget
                        ? `Click to target this ship (${rowIndex}, ${colIndex})`
                        : `Empty (${rowIndex}, ${colIndex})`
                    }
                  >
                    {/* Blocked line of sight tile - lowest layer */}
                    {blockedGrid[rowIndex][colIndex] && (
                      <div className="absolute inset-0 z-0">
                        <Image
                          src="/img/nebula-tile.png"
                          alt="Blocked line of sight"
                          fill
                          className="object-cover opacity-30"
                        />
                      </div>
                    )}

                    {/* Crystal for scoring positions that can only be claimed once */}
                    {onlyOnceGrid[rowIndex][colIndex] && (
                      <div className="absolute inset-0 z-1">
                        <Image
                          src="/img/crystal.png"
                          alt="Crystal deposit"
                          fill
                          className="object-cover opacity-80"
                        />
                      </div>
                    )}

                    {/* Gold deposit for regular scoring positions */}
                    {scoringGrid[rowIndex][colIndex] > 0 &&
                      !onlyOnceGrid[rowIndex][colIndex] && (
                        <div className="absolute inset-0 z-1">
                          <Image
                            src="/img/gold-deposit.png"
                            alt="Gold deposit"
                            fill
                            className="object-cover opacity-80"
                          />
                        </div>
                      )}

                    {/* Movement range highlight */}
                    {isMovementTile && (
                      <div className="absolute inset-0 z-2 border-2 border-green-400 bg-green-500/20 pointer-events-none" />
                    )}

                    {/* Shooting range highlight */}
                    {isShootingTile && (
                      <div className="absolute inset-0 z-2 border-2 border-orange-400 bg-orange-500/20 pointer-events-none" />
                    )}

                    {/* Critical hull glow effect */}
                    {cell &&
                      (() => {
                        const attributes = getShipAttributes(cell.shipId);
                        return attributes && attributes.hullPoints === 0;
                      })() && (
                        <div className="absolute inset-0 z-1 border-2 border-red-400 bg-red-500/10 pointer-events-none animate-pulse" />
                      )}

                    {cell && ship ? (
                      <div className="w-full h-full relative z-10">
                        {/* Damage display for selected target */}
                        {isSelectedTarget &&
                          (previewPosition ||
                            selectedWeaponType === "special") && (
                            <div
                              className={`absolute -top-8 left-1/2 transform -translate-x-1/2 z-20 rounded px-2 py-1 text-xs font-mono text-white whitespace-nowrap ${
                                selectedWeaponType === "special"
                                  ? "bg-blue-900 border border-blue-500"
                                  : "bg-red-900 border border-red-500"
                              }`}
                            >
                              {(() => {
                                const damage = calculateDamage(cell.shipId);
                                if (selectedWeaponType === "special") {
                                  // Special abilities - show repair/heal effect
                                  return `🔧 Repair ${damage.reducedDamage} HP`;
                                } else if (damage.reactorCritical) {
                                  return "⚡ Reactor Critical +1";
                                } else if (damage.willKill) {
                                  return `💀 ${damage.reducedDamage} DMG (KILL)`;
                                } else {
                                  return `⚔️ ${damage.reducedDamage} DMG`;
                                }
                              })()}
                            </div>
                          )}

                        {/* Health bar for damaged ships */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          if (
                            !attributes ||
                            attributes.hullPoints >= attributes.maxHullPoints
                          )
                            return null;

                          const healthPercentage =
                            (attributes.hullPoints / attributes.maxHullPoints) *
                            100;
                          const isLowHealth = healthPercentage <= 25;

                          return (
                            <div className="absolute -top-2 left-0 right-0 z-15">
                              <div className="w-full h-1 bg-gray-700 rounded-sm">
                                <div
                                  className={`h-full rounded-sm transition-all duration-300 ${
                                    isLowHealth ? "bg-red-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${healthPercentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        <ShipImage
                          ship={ship}
                          className={`w-full h-full ${
                            cell.isCreator ? "scale-x-[-1]" : ""
                          } ${
                            cell.isPreview
                              ? "animate-pulse-preview"
                              : selectedShipId === cell.shipId &&
                                previewPosition
                              ? "animate-pulse-original"
                              : ""
                          }`}
                          showLoadingState={true}
                        />
                        {/* Moved badge */}
                        {movedShipIdsSet.has(cell.shipId) && (
                          <div
                            className={`absolute ${
                              cell.isCreator
                                ? "bottom-0 right-0"
                                : "bottom-0 left-0"
                            } m-0.5 w-3 h-3 rounded-full text-[8px] font-mono flex items-center justify-center ${
                              isShipOwnedByCurrentPlayer(cell.shipId)
                                ? "bg-blue-700/80"
                                : "bg-red-700/80"
                            } text-white`}
                          >
                            M
                          </div>
                        )}
                        {/* Reactor damage skulls */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          console.log(
                            `Ship ${cell.shipId}: reactorTimer=${attributes?.reactorCriticalTimer}`
                          );
                          if (
                            !attributes ||
                            attributes.reactorCriticalTimer === 0
                          )
                            return null;

                          const skullCount = Math.min(
                            attributes.reactorCriticalTimer,
                            3
                          );
                          const skulls = "💀".repeat(skullCount);

                          return (
                            <div
                              className={`absolute ${
                                cell.isCreator
                                  ? "bottom-0 left-0"
                                  : "bottom-0 right-0"
                              } m-0.5 text-[8px] font-mono`}
                            >
                              {skulls}
                            </div>
                          );
                        })()}
                        {/* Critical hull indicator */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          return attributes && attributes.hullPoints === 0;
                        })() && (
                          <div className="absolute top-0 right-0 m-0.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center animate-pulse">
                            <span className="text-[10px]">💀</span>
                          </div>
                        )}
                        {/* Team indicator overlay */}
                        <div
                          className={`absolute top-0 ${
                            cell.isCreator ? "left-0" : "right-0"
                          } w-2 h-2 rounded-full ${
                            isShipOwnedByCurrentPlayer(cell.shipId)
                              ? "bg-blue-500"
                              : "bg-red-500"
                          } ${
                            cell.isPreview
                              ? "animate-pulse-preview"
                              : selectedShipId === cell.shipId &&
                                previewPosition
                              ? "animate-pulse-original"
                              : ""
                          }`}
                        />
                        {/* Movement path borders */}
                        {(cell.isPreview ||
                          (selectedShipId === cell.shipId &&
                            previewPosition)) && (
                          <div
                            className={`absolute inset-0 border-2 border-yellow-400 border-dashed rounded-sm pointer-events-none ${
                              cell.isPreview
                                ? "animate-pulse-preview"
                                : "animate-pulse-original"
                            }`}
                          />
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 border border-gray-700"></div>
            <span className="text-gray-300">Creator Ships</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 border border-gray-700"></div>
            <span className="text-gray-300">Joiner Ships</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-green-400 bg-green-500/20"></div>
            <span className="text-gray-300">Movement Range</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-orange-400 bg-orange-500/20"></div>
            <span className="text-gray-300">Shooting Range</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-600 border border-gray-700"></div>
            <span className="text-gray-300">Moved This Round</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-400 bg-blue-900"></div>
            <span className="text-gray-300">Your Ship (Movable)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-purple-400 bg-purple-900"></div>
            <span className="text-gray-300">Opponent Ship (View Only)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-1 border-orange-400 bg-orange-900/50"></div>
            <span className="text-gray-300">Valid Target</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-red-400 bg-red-900"></div>
            <span className="text-gray-300">Selected Target</span>
          </div>
        </div>
      </div>

      {/* Move Confirmation UI */}
      {selectedShipId &&
        isMyTurn &&
        isShipOwnedByCurrentPlayer(selectedShipId) && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 w-full">
            <h3 className="text-white font-mono mb-4">Confirm Move</h3>

            {/* Debug info */}
            <div className="text-xs text-gray-500 mb-2">
              Debug: selectedShipId={selectedShipId?.toString()},
              previewPosition=
              {previewPosition
                ? `${previewPosition.row},${previewPosition.col}`
                : "null"}
              , targetShipId={targetShipId?.toString() || "none"}, isMyTurn=
              {isMyTurn.toString()}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-gray-300">
                  <span className="text-white font-mono">
                    {(() => {
                      const selectedShip = shipMap.get(selectedShipId);
                      return (
                        selectedShip?.name ||
                        `Ship #${selectedShipId.toString()}`
                      );
                    })()}
                  </span>
                  <span className="mx-2">→</span>
                  <span className="text-white font-mono">
                    {previewPosition
                      ? `(${previewPosition.row}, ${previewPosition.col})`
                      : (() => {
                          const currentPosition = game.shipPositions.find(
                            (pos) => pos.shipId === selectedShipId
                          );
                          return currentPosition
                            ? `(${currentPosition.position.row}, ${currentPosition.position.col}) - Stay`
                            : "Unknown Position";
                        })()}
                  </span>
                  {targetShipId ? (
                    <>
                      <span className="mx-2">🎯</span>
                      {selectedWeaponType === "special" && specialType === 3 ? (
                        // Flak special - affects all targets in range
                        <>
                          <span className="text-orange-400 font-mono">
                            Flak: All Enemies in Range
                          </span>
                          <span className="ml-2 text-orange-400">
                            💥 {validTargets.length} targets
                          </span>
                        </>
                      ) : selectedWeaponType === "special" &&
                        specialType === 1 ? (
                        // EMP special - targets individual enemy ship
                        <>
                          <span className="text-blue-400 font-mono">
                            EMP: Target Enemy Ship
                          </span>
                          <span className="ml-2 text-blue-400">
                            ⚡ Reactor Critical +1
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-red-400 font-mono">
                            Target: #{targetShipId.toString()}
                          </span>
                          {(() => {
                            const damage = calculateDamage(targetShipId);
                            if (selectedWeaponType === "special") {
                              // Special abilities - show repair/heal effect
                              return (
                                <span className="ml-2 text-blue-400">
                                  🔧 Repair {damage.reducedDamage} HP
                                </span>
                              );
                            } else if (damage.reactorCritical) {
                              return (
                                <span className="ml-2 text-yellow-400">
                                  ⚡ Reactor Critical +1
                                </span>
                              );
                            } else if (damage.willKill) {
                              return (
                                <span className="ml-2 text-red-400">
                                  💀 {damage.reducedDamage} DMG (KILL)
                                </span>
                              );
                            } else {
                              return (
                                <span className="ml-2 text-orange-400">
                                  ⚔️ {damage.reducedDamage} DMG
                                </span>
                              );
                            }
                          })()}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="mx-2">💰</span>
                      <span className="text-yellow-400 font-mono">
                        {previewPosition
                          ? scoringGrid[previewPosition.row] &&
                            scoringGrid[previewPosition.row][
                              previewPosition.col
                            ] > 0
                            ? "Claim Points"
                            : "Move Only"
                          : (() => {
                              const currentPosition = game.shipPositions.find(
                                (pos) => pos.shipId === selectedShipId
                              );
                              return currentPosition &&
                                scoringGrid[currentPosition.position.row] &&
                                scoringGrid[currentPosition.position.row][
                                  currentPosition.position.col
                                ] > 0
                                ? "Claim Points"
                                : "Stay in Position";
                            })()}
                      </span>
                    </>
                  )}
                </div>

                {/* Weapon/Special Selection Dropdown */}
                {selectedShip && selectedShip.equipment.special > 0 && (
                  <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
                    <h4 className="text-sm text-gray-300 mb-2">
                      Select Weapon Type
                    </h4>
                    <select
                      value={selectedWeaponType}
                      onChange={(e) =>
                        setSelectedWeaponType(
                          e.target.value as "weapon" | "special"
                        )
                      }
                      className="px-3 py-1 text-sm rounded font-mono bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="weapon">
                        {selectedShip
                          ? getMainWeaponName(selectedShip.equipment.mainWeapon)
                          : "Weapon"}
                      </option>
                      <option value="special">
                        {selectedShip
                          ? getSpecialName(selectedShip.equipment.special)
                          : "Special"}
                      </option>
                    </select>
                  </div>
                )}

                {/* Show ship attributes for context */}
                {(() => {
                  const attributes = getShipAttributes(selectedShipId);
                  const ship = shipMap.get(selectedShipId);
                  const gunName = ship
                    ? getMainWeaponName(ship.equipment.mainWeapon)
                    : "Unknown";

                  return attributes ? (
                    <div className="text-sm text-gray-400">
                      <span className="text-white">
                        {selectedWeaponType === "special"
                          ? getSpecialName(ship?.equipment.special || 0)
                          : gunName}
                      </span>
                      <span className="mx-2">•</span>
                      <span>
                        Range:{" "}
                        {selectedWeaponType === "special" &&
                        specialRange !== undefined
                          ? specialRange
                          : attributes.range}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Damage: {attributes.gunDamage}</span>
                      <span className="mx-2">•</span>
                      <span>Movement: {attributes.movement}</span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Target Selection */}
              {validTargets.length > 0 && (
                <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-600">
                  <h4 className="text-sm text-gray-300 mb-2">
                    Select Target (Optional)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWeaponType === "special" && specialType === 3 ? (
                      // Flak special - show area-of-effect button
                      <button
                        onClick={() => setTargetShipId(0n)}
                        className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                          targetShipId === 0n
                            ? "bg-orange-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        💥 Flak All Enemies ({validTargets.length} targets)
                      </button>
                    ) : selectedWeaponType === "special" &&
                      specialType === 1 ? (
                      // EMP special - show individual target buttons
                      validTargets.map((target) => {
                        const targetShip = shipMap.get(target.shipId);
                        return (
                          <button
                            key={target.shipId.toString()}
                            onClick={() => setTargetShipId(target.shipId)}
                            className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                              targetShipId === target.shipId
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            ⚡ EMP{" "}
                            {targetShip?.name ||
                              `Ship #${target.shipId.toString()}`}
                          </button>
                        );
                      })
                    ) : (
                      validTargets.map((target) => {
                        const targetShip = shipMap.get(target.shipId);
                        const damage = calculateDamage(target.shipId);
                        return (
                          <button
                            key={target.shipId.toString()}
                            onClick={() => setTargetShipId(target.shipId)}
                            className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                              targetShipId === target.shipId
                                ? selectedWeaponType === "special"
                                  ? "bg-blue-600 text-white"
                                  : "bg-red-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            Target #{target.shipId.toString()}
                            {targetShip && ` (${targetShip.name})`}
                            {selectedWeaponType === "special" ? (
                              <span className="ml-1 text-blue-400">
                                🔧 {damage.reducedDamage}
                              </span>
                            ) : damage.reactorCritical ? (
                              <span className="ml-1 text-yellow-400">
                                ⚡ +1
                              </span>
                            ) : damage.willKill ? (
                              <span className="ml-1 text-red-400">
                                💀 {damage.reducedDamage}
                              </span>
                            ) : (
                              <span className="ml-1 text-orange-400">
                                ⚔️ {damage.reducedDamage}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                    <button
                      onClick={() => setTargetShipId(null)}
                      className="px-3 py-1 text-xs rounded font-mono bg-gray-600 text-gray-300 hover:bg-gray-500"
                    >
                      {previewPosition
                        ? scoringGrid[previewPosition.row] &&
                          scoringGrid[previewPosition.row][
                            previewPosition.col
                          ] > 0
                          ? "Claim Points Instead"
                          : "Move Only Instead"
                        : (() => {
                            const currentPosition = game.shipPositions.find(
                              (pos) => pos.shipId === selectedShipId
                            );
                            return currentPosition &&
                              scoringGrid[currentPosition.position.row] &&
                              scoringGrid[currentPosition.position.row][
                                currentPosition.position.col
                              ] > 0
                              ? "Claim Points Instead"
                              : "Stay Instead";
                          })()}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancelMove}
                  className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <TransactionButton
                  transactionId={`move-ship-${selectedShipId}-${game.metadata.gameId}`}
                  contractAddress={gameContractConfig.address}
                  abi={gameContractConfig.abi}
                  functionName="moveShip"
                  args={[
                    game.metadata.gameId,
                    selectedShipId,
                    previewPosition
                      ? (previewPosition.row as number)
                      : (() => {
                          const currentPosition = game.shipPositions.find(
                            (pos) => pos.shipId === selectedShipId
                          );
                          return currentPosition
                            ? currentPosition.position.row
                            : 0;
                        })(),
                    previewPosition
                      ? (previewPosition.col as number)
                      : (() => {
                          const currentPosition = game.shipPositions.find(
                            (pos) => pos.shipId === selectedShipId
                          );
                          return currentPosition
                            ? currentPosition.position.col
                            : 0;
                        })(),
                    targetShipId
                      ? (() => {
                          // Check if this is an assist action (friendly ship with 0 HP)
                          const isAssistAction =
                            assistableTargets.some(
                              (target) => target.shipId === targetShipId
                            ) ||
                            assistableTargetsFromStart.some(
                              (target) => target.shipId === targetShipId
                            );
                          if (isAssistAction) {
                            return ActionType.Assist;
                          }
                          // Otherwise, check weapon type for shooting/special
                          return selectedWeaponType === "special"
                            ? ActionType.Special
                            : ActionType.Shoot;
                        })()
                      : ActionType.ClaimPoints,
                    targetShipId || 0n,
                  ]}
                  className="px-6 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
                  loadingText="Submitting..."
                  errorText="Error"
                  onSuccess={() => {
                    toast.success("Move submitted successfully!");
                    setPreviewPosition(null);
                    setSelectedShipId(null);
                    setTargetShipId(null);
                    setSelectedWeaponType("weapon");
                    // Refetch both the specific game and the game list
                    refetchGame();
                    refetch?.();
                  }}
                  onError={(error) => {
                    console.error("Error submitting move:", error);
                    const errorMessage =
                      (error as Error)?.message ||
                      String(error) ||
                      "Unknown error";

                    if (
                      errorMessage.includes("User rejected") ||
                      errorMessage.includes("User denied")
                    ) {
                      toast.error("Transaction declined by user");
                    } else if (errorMessage.includes("insufficient funds")) {
                      toast.error("Insufficient funds for transaction");
                    } else if (errorMessage.includes("gas")) {
                      toast.error(
                        "Transaction failed due to gas estimation error"
                      );
                    } else if (errorMessage.includes("execution reverted")) {
                      toast.error(
                        "Transaction reverted - check if it" +
                          "'" +
                          "s your turn and ship is valid"
                      );
                    } else if (errorMessage.includes("NotYourTurn")) {
                      toast.error("It" + "'" + "s not your turn to move");
                    } else if (errorMessage.includes("ShipNotFound")) {
                      toast.error("Ship not found in this game");
                    } else if (errorMessage.includes("InvalidMove")) {
                      toast.error(
                        "Invalid move - check ship position and movement range"
                      );
                    } else if (errorMessage.includes("PositionOccupied")) {
                      toast.error("Target position is already occupied");
                    } else {
                      toast.error(`Transaction failed: ${errorMessage}`);
                    }
                  }}
                  validateBeforeTransaction={() => {
                    if (!selectedShipId) {
                      return "No ship selected";
                    }
                    if (!game.metadata.gameId || game.metadata.gameId === 0n) {
                      return "Invalid game ID";
                    }
                    if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
                      return "You can only move your own ships";
                    }
                    if (movedShipIdsSet.has(selectedShipId)) {
                      return "This ship has already moved this round";
                    }
                    if (previewPosition) {
                      if (
                        previewPosition.row < 0 ||
                        previewPosition.row >= GRID_HEIGHT ||
                        previewPosition.col < 0 ||
                        previewPosition.col >= GRID_WIDTH
                      ) {
                        return "Invalid position coordinates";
                      }
                    }
                    return true;
                  }}
                >
                  Submit Move{" "}
                  {targetShipId
                    ? (() => {
                        // Check if this is an assist action
                        const isAssistAction =
                          assistableTargets.some(
                            (target) => target.shipId === targetShipId
                          ) ||
                          assistableTargetsFromStart.some(
                            (target) => target.shipId === targetShipId
                          );
                        if (isAssistAction) {
                          return "(Assist)";
                        }
                        // Otherwise show weapon type
                        return selectedWeaponType === "special"
                          ? specialType === 3
                            ? "(Flak)"
                            : specialType === 1
                            ? "(EMP)"
                            : `(${
                                selectedShip
                                  ? getSpecialName(
                                      selectedShip.equipment.special
                                    )
                                  : "Special"
                              })`
                          : "(Shoot)";
                      })()
                    : previewPosition
                    ? scoringGrid[previewPosition.row] &&
                      scoringGrid[previewPosition.row][previewPosition.col] > 0
                      ? "(Claim Points)"
                      : "(Move Only)"
                    : (() => {
                        const currentPosition = game.shipPositions.find(
                          (pos) => pos.shipId === selectedShipId
                        );
                        return currentPosition &&
                          scoringGrid[currentPosition.position.row] &&
                          scoringGrid[currentPosition.position.row][
                            currentPosition.position.col
                          ] > 0
                          ? "(Claim Points)"
                          : "(Stay)";
                      })()}
                </TransactionButton>
              </div>
            </div>
          </div>
        )}

      {/* Ship Details */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 w-full">
        <h3 className="text-white font-mono mb-4">Ship Details</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Fleet - Always on the left */}
          <div>
            <h4 className="text-blue-400 font-mono mb-3">My Fleet</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(game.metadata.creator === address
                ? game.creatorActiveShipIds
                : game.joinerActiveShipIds
              ).map((shipId) => {
                const shipPosition = game.shipPositions.find(
                  (sp) => sp.shipId === shipId
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(shipId);

                if (!shipPosition || !attributes) return null;

                return (
                  <div
                    key={shipId.toString()}
                    className={`bg-gray-800 rounded p-2 border ${
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "border-red-500" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "border-yellow-500" // Yellow outline for reactor critical
                        : "border-gray-700" // Default gray outline
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {ship && (
                        <div className="w-64 h-64 flex-shrink-0">
                          <ShipImage
                            ship={ship}
                            className="w-full h-full"
                            showLoadingState={true}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-white font-mono text-xs truncate">
                              {ship?.name || `Ship #${shipId.toString()}`}
                            </span>
                            {movedShipIdsSet.has(shipId) && (
                              <span className="px-1 py-0.5 bg-gray-600 text-white text-xs rounded font-mono">
                                M
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            ({shipPosition.position.row},{" "}
                            {shipPosition.position.col})
                          </span>
                        </div>
                        {attributes.reactorCriticalTimer > 0 && (
                          <div className="text-xs text-red-400 mt-1">
                            Reactor Critical: {attributes.reactorCriticalTimer}
                            /3
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <span className="text-gray-400">Hull:</span>
                        <span className="text-white ml-1">
                          {attributes.hullPoints}/{attributes.maxHullPoints}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Range:</span>
                        <span className="text-white ml-1">
                          {attributes.range}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Armor:</span>
                        <span className="text-white ml-1">
                          {attributes.damageReduction}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Movement:</span>
                        <span className="text-white ml-1">
                          {attributes.movement}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-white ml-1">
                          {attributes.gunDamage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Special:</span>
                        <span className="text-white ml-1">
                          {ship
                            ? getSpecialName(ship.equipment.special)
                            : "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent's Fleet - Always on the right */}
          <div>
            <h4 className="text-red-400 font-mono mb-3">
              {"Opponent" + "'" + "s Fleet"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(game.metadata.creator === address
                ? game.joinerActiveShipIds
                : game.creatorActiveShipIds
              ).map((shipId) => {
                const shipPosition = game.shipPositions.find(
                  (sp) => sp.shipId === shipId
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(shipId);

                if (!shipPosition || !attributes) return null;

                return (
                  <div
                    key={shipId.toString()}
                    className={`bg-gray-800 rounded p-2 border ${
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "border-red-500" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "border-yellow-500" // Yellow outline for reactor critical
                        : "border-gray-700" // Default gray outline
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {ship && (
                        <div className="w-64 h-64 flex-shrink-0">
                          <ShipImage
                            ship={ship}
                            className="w-full h-full"
                            showLoadingState={true}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-white font-mono text-xs truncate">
                              {ship?.name || `Ship #${shipId.toString()}`}
                            </span>
                            {movedShipIdsSet.has(shipId) && (
                              <span className="px-1 py-0.5 bg-gray-600 text-white text-xs rounded font-mono">
                                M
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            ({shipPosition.position.row},{" "}
                            {shipPosition.position.col})
                          </span>
                        </div>
                        {attributes.reactorCriticalTimer > 0 && (
                          <div className="text-xs text-red-400 mt-1">
                            Reactor Critical: {attributes.reactorCriticalTimer}
                            /3
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <span className="text-gray-400">Hull:</span>
                        <span className="text-white ml-1">
                          {attributes.hullPoints}/{attributes.maxHullPoints}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Range:</span>
                        <span className="text-white ml-1">
                          {attributes.range}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Armor:</span>
                        <span className="text-white ml-1">
                          {attributes.damageReduction}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Movement:</span>
                        <span className="text-white ml-1">
                          {attributes.movement}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-white ml-1">
                          {attributes.gunDamage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Special:</span>
                        <span className="text-white ml-1">
                          {ship
                            ? getSpecialName(ship.equipment.special)
                            : "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDisplay;
