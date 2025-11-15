"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import {
  GameDataView,
  ShipPosition,
  Attributes,
  getMainWeaponName,
  getSpecialName,
  ActionType,
} from "../types/types";
import { useShipsByIds } from "../hooks/useShipsByIds";
import ShipCard from "./ShipCard";
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
import { useTransaction } from "../providers/TransactionContext";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { GameEvents } from "./GameEvents";
import { GameGrid } from "./GameGrid";

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
  // Debug mode toggle
  const [showDebug, setShowDebug] = React.useState(false);
  // Tooltip disable toggle
  const [disableTooltips, setDisableTooltips] = React.useState(false);
  const { address } = useAccount();
  const { clearAllTransactions } = useTransaction();
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
  // Track latest game event for preview
  const [latestGameEvent, setLatestGameEvent] = useState<{
    shipId: bigint;
    newRow: number;
    newCol: number;
    actionType: number;
    targetShipId: bigint;
  } | null>(null);

  const [selectedWeaponType, setSelectedWeaponType] = useState<
    "weapon" | "special"
  >("weapon");
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null>(null);

  // Drag and drop state
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

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

  // Track previous game state to detect if state changed after event
  const prevGameStateRef = React.useRef<{
    currentTurn: string;
    currentRound: bigint;
  } | null>(null);

  // Track if we're expecting a state change (got GameUpdate event)
  const expectingStateChangeRef = React.useRef<boolean>(false);

  // Track retry attempts with exponential backoff
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = React.useRef<number>(0);

  // Track page visibility and window focus for polling intervals
  const [isPageVisible, setIsPageVisible] = React.useState(true);
  const [isWindowFocused, setIsWindowFocused] = React.useState(true);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const playerMoveTimeRef = React.useRef<number | null>(null);
  const [playerMoveTimestamp, setPlayerMoveTimestamp] = React.useState<
    number | null
  >(null);
  const lastPollTimeRef = React.useRef<number>(Date.now());
  const currentPollIntervalRef = React.useRef<number>(30 * 1000);
  const [pollProgress, setPollProgress] = React.useState<number>(0);

  // Register this game's refetch function for global event handling
  React.useEffect(() => {
    const gameId = Number(game.metadata.gameId);

    // Create a refetch function that also clears targeting state
    // and marks that we're expecting a state change
    const refetchWithClear = () => {
      setTargetShipId(null);
      expectingStateChangeRef.current = true;
      refetchGame();
    };

    registerGameRefetch(gameId, refetchWithClear);

    // Cleanup: unregister when component unmounts
    return () => {
      unregisterGameRefetch(gameId);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [refetchGame, game.metadata.gameId, setTargetShipId]);

  // Track page visibility and window focus, refetch immediately when tab regains focus
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      const wasHidden = !isPageVisible;
      const isNowVisible = !document.hidden;
      setIsPageVisible(isNowVisible);

      // If tab was hidden and now has focus, refetch immediately
      if (wasHidden && isNowVisible) {
        refetchGame();
      }
    };

    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    setIsPageVisible(!document.hidden);
    setIsWindowFocused(document.hasFocus());

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isPageVisible, refetchGame]);

  // Set up polling based on page visibility and player moves
  React.useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // Set initial poll time
    lastPollTimeRef.current = Date.now();

    // Get turn time from game (in seconds, convert to milliseconds)
    const turnTimeMs = Number(game.turnState.turnTime || 0n) * 1000;
    const pollIntervalAfterMove = turnTimeMs / 10; // Poll every turnTime/10

    if (playerMoveTimeRef.current) {
      // Player just moved: poll every turnTime/10
      const moveTime = playerMoveTimeRef.current;
      const now = Date.now();
      const timeSinceMove = now - moveTime;

      // If turnTime has passed since move, do one more poll then switch to normal polling
      if (timeSinceMove >= turnTimeMs) {
        // Do one final poll, then switch to normal polling
        const timeUntilNextPoll =
          pollIntervalAfterMove - (timeSinceMove % pollIntervalAfterMove);
        pollingTimeoutRef.current = setTimeout(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          // Switch to normal polling
          playerMoveTimeRef.current = null;
          setPlayerMoveTimestamp(null);
          const normalPollInterval = isPageVisible
            ? isWindowFocused
              ? 30 * 1000 // 30 seconds if window focused
              : 5 * 60 * 1000 // 5 minutes if tab active but window not focused
            : 60 * 60 * 1000; // 60 minutes if tab inactive
          currentPollIntervalRef.current = normalPollInterval;
          pollingIntervalRef.current = setInterval(() => {
            lastPollTimeRef.current = Date.now();
            refetchGame();
          }, normalPollInterval);
        }, timeUntilNextPoll);
      } else {
        // Still within turnTime: poll every turnTime/10
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
        pollingIntervalRef.current = setInterval(() => {
          lastPollTimeRef.current = Date.now();
          refetchGame();
          const now = Date.now();
          const timeSinceMove = now - (playerMoveTimeRef.current || 0);

          // If turnTime has passed, do one more poll then switch
          if (timeSinceMove >= turnTimeMs) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            // Do one final poll
            pollingTimeoutRef.current = setTimeout(() => {
              refetchGame();
              // Switch to normal polling
              playerMoveTimeRef.current = null;
              setPlayerMoveTimestamp(null);
              const normalPollInterval = isPageVisible
                ? isWindowFocused
                  ? 30 * 1000 // 30 seconds if window focused
                  : 5 * 60 * 1000 // 5 minutes if tab active but window not focused
                : 60 * 60 * 1000; // 60 minutes if tab inactive
              currentPollIntervalRef.current = normalPollInterval;
              lastPollTimeRef.current = Date.now();
              pollingIntervalRef.current = setInterval(() => {
                lastPollTimeRef.current = Date.now();
                refetchGame();
              }, normalPollInterval);
            }, pollIntervalAfterMove);
          }
        }, pollIntervalAfterMove);
        currentPollIntervalRef.current = pollIntervalAfterMove;
        lastPollTimeRef.current = Date.now();
      }
    } else {
      // No recent move: poll at normal intervals
      const normalPollInterval = isPageVisible
        ? isWindowFocused
          ? 30 * 1000 // 30 seconds if window focused
          : 5 * 60 * 1000 // 5 minutes if tab active but window not focused
        : 60 * 60 * 1000; // 60 minutes if tab inactive
      currentPollIntervalRef.current = normalPollInterval;
      pollingIntervalRef.current = setInterval(() => {
        lastPollTimeRef.current = Date.now();
        refetchGame();
      }, normalPollInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [
    isPageVisible,
    isWindowFocused,
    playerMoveTimestamp,
    refetchGame,
    game.turnState.turnTime,
  ]);

  // Track polling progress for progress bar
  React.useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollTimeRef.current;
      const interval = currentPollIntervalRef.current;
      const progress = Math.min(100, (timeSinceLastPoll / interval) * 100);
      setPollProgress(progress);
    };

    // Update immediately
    updateProgress();

    // Update every second
    const progressInterval = setInterval(updateProgress, 1000);

    return () => clearInterval(progressInterval);
  }, [isPageVisible, isWindowFocused, playerMoveTimestamp]);

  // Reset move time when turn changes (opponent moved)
  React.useEffect(() => {
    if (gameData) {
      const gameDataTyped = gameData as GameDataView;
      const isMyTurn = gameDataTyped.turnState.currentTurn === address;

      // If it's not my turn, clear the move time (opponent's turn now)
      if (!isMyTurn) {
        playerMoveTimeRef.current = null;
        setPlayerMoveTimestamp(null); // Trigger effect re-run
      }
    }
  }, [gameData, address]);

  // Initialize previous state on mount
  React.useEffect(() => {
    if (gameData && !prevGameStateRef.current) {
      const gameDataTyped = gameData as GameDataView;
      prevGameStateRef.current = {
        currentTurn: gameDataTyped.turnState.currentTurn,
        currentRound: gameDataTyped.turnState.currentRound,
      };
    }
  }, [gameData]);

  // Detect if state changed after event, and implement exponential backoff retry
  React.useEffect(() => {
    if (!gameData) return;

    const gameDataTyped = gameData as GameDataView;
    const currentState = {
      currentTurn: gameDataTyped.turnState.currentTurn,
      currentRound: gameDataTyped.turnState.currentRound,
    };

    // If we have previous state and we're expecting a change
    if (prevGameStateRef.current && expectingStateChangeRef.current) {
      const prevState = prevGameStateRef.current;

      // Check if state actually changed
      const stateChanged =
        prevState.currentTurn !== currentState.currentTurn ||
        prevState.currentRound !== currentState.currentRound;

      if (!stateChanged) {
        // Got event but state didn't change - log error and retry
        const retryDelay = Math.pow(2, retryAttemptRef.current) * 1000; // 2s, 4s, 8s, etc.
        console.error(
          `[GameDisplay] GameUpdate event received but state unchanged. ` +
            `GameId: ${game.metadata.gameId}, ` +
            `Previous: turn=${prevState.currentTurn}, round=${prevState.currentRound}, ` +
            `Current: turn=${currentState.currentTurn}, round=${currentState.currentRound}. ` +
            `Retrying in ${retryDelay}ms (attempt ${
              retryAttemptRef.current + 1
            })`
        );

        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        // Schedule retry with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          retryAttemptRef.current++;
          expectingStateChangeRef.current = true; // Keep expecting change on retry
          refetchGame();
        }, retryDelay);
      } else {
        // State changed - reset retry counter and clear expecting flag
        retryAttemptRef.current = 0;
        expectingStateChangeRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }
    }

    // Update previous state
    prevGameStateRef.current = currentState;
  }, [gameData, game.metadata.gameId, refetchGame]);

  // Countdown for remaining turn time (in seconds)
  const [turnSecondsLeft, setTurnSecondsLeft] = React.useState<number>(0);

  React.useEffect(() => {
    // Helper to compute remaining seconds
    const computeRemaining = (): number => {
      const turnTimeSec = Number(game.turnState.turnTime || 0n);
      const turnStartSec = Number(game.turnState.turnStartTime || 0n);
      if (!turnTimeSec || !turnStartSec) return 0;
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSec - turnStartSec);
      return Math.max(0, turnTimeSec - elapsed);
    };

    // Initialize immediately
    setTurnSecondsLeft(computeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTurnSecondsLeft(computeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [game.turnState.turnTime, game.turnState.turnStartTime]);

  const formatSeconds = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Clear targeting state when game data changes (after successful moves)
  React.useEffect(() => {
    if (gameData && gameData !== initialGame) {
      // Game data has been updated, clear targeting state
      setTargetShipId(null);
    }
  }, [gameData, initialGame]);

  // Grid dimensions from the contract
  const GRID_WIDTH = 25;
  const GRID_HEIGHT = 13;

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

  // Callback to receive latest event from GameEvents
  const handleLatestEventChange = React.useCallback(
    (
      event: {
        shipId: bigint;
        newRow: number;
        newCol: number;
        actionType: number;
        targetShipId: bigint;
      } | null
    ) => {
      setLatestGameEvent(event);
    },
    []
  );

  // Get special range data for the selected ship
  const selectedShip = selectedShipId ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const { specialRange } = useSpecialRange(specialType);
  const { data: specialData } = useSpecialData(specialType);

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
    (
      targetShipId: bigint,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean
    ) => {
      if (!selectedShipId)
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      const shooterAttributes = getShipAttributes(selectedShipId);
      const targetAttributes = getShipAttributes(targetShipId);

      if (!shooterAttributes || !targetAttributes)
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      // Determine which damage value to use based on weapon type
      const currentWeaponType = weaponType || selectedWeaponType;
      let baseDamage: number;

      if (currentWeaponType === "special") {
        // For special abilities, use the special strength
        baseDamage =
          (specialData as SpecialData)?.strength || shooterAttributes.gunDamage;
      } else {
        // Regular weapon damage
        baseDamage = shooterAttributes.gunDamage;
      }

      // For repair special abilities (specialType === 2), always show repair amount
      // even if target has 0 HP (disabled ships can be repaired)
      if (currentWeaponType === "special" && specialType === 2) {
        // Repair abilities ignore damage reduction and always show the repair amount
        return {
          baseDamage,
          reducedDamage: baseDamage,
          willKill: false,
          reactorCritical: false,
        };
      }

      // Handle ships with 0 hull points - they get reactor critical timer increment instead of damage
      // (but not for repair abilities, which we handled above)
      if (targetAttributes.hullPoints === 0) {
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
        };
      }

      const reduction = targetAttributes.damageReduction;
      let reducedDamage: number;

      // For display purposes, flak can show reduced damage even though it ignores reduction in actual combat
      if (currentWeaponType === "special" && !showReducedDamage) {
        // Special abilities ignore damage reduction (actual combat behavior)
        reducedDamage = baseDamage;
      } else {
        // Regular weapons are affected by damage reduction, or show reduced damage for display
        reducedDamage = Math.max(
          0,
          baseDamage - Math.floor((baseDamage * reduction) / 100)
        );
      }

      const willKill = reducedDamage >= targetAttributes.hullPoints;

      return { baseDamage, reducedDamage, willKill, reactorCritical: false };
    },
    [
      selectedShipId,
      getShipAttributes,
      selectedWeaponType,
      specialData,
      specialType,
    ]
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
        // Flak targets ALL ships in range (friendly and enemy) except itself
        if (specialType === 3) {
          // Flak hits everything except the ship using flak
          if (shipPosition.shipId === selectedShipId) return; // Don't target self
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
        // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
        // OR special abilities ignore nebula squares
        // OR regular weapons need line of sight
        const shouldCheckLineOfSight =
          distance > 1 && // Not adjacent
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3)); // Not EMP, Repair, or Flak

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
    gameShips,
    shipMap,
    game.shipPositions,
    getShipAttributes,
    blockedGrid,
    hasLineOfSight,
    previewPosition,
    selectedWeaponType,
    specialRange,
    specialType,
  ]);

  // Calculate valid targets from drag position (when dragging a ship)
  const dragValidTargets = React.useMemo(() => {
    if (!draggedShipId || !dragOverCell || !gameShips) return [];

    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes.range || 1;

    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;

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
        // Flak targets ALL ships in range (friendly and enemy) except itself
        if (specialType === 3) {
          // Flak hits everything except the ship using flak
          if (shipPosition.shipId === draggedShipId) return; // Don't target self
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
        // Ships can always shoot adjacent enemies (distance === 1) regardless of nebula squares
        // OR special abilities ignore nebula squares
        // OR regular weapons need line of sight
        const shouldCheckLineOfSight =
          distance > 1 && // Not adjacent
          (selectedWeaponType !== "special" ||
            (specialType !== 1 && specialType !== 2 && specialType !== 3)); // Not EMP, Repair, or Flak

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
    draggedShipId,
    dragOverCell,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    selectedWeaponType,
    specialRange,
    specialType,
    game.shipPositions,
    blockedGrid,
    hasLineOfSight,
  ]);

  // Calculate shooting range from drag position (when dragging a ship)
  const dragShootingRange = React.useMemo(() => {
    if (!draggedShipId || !dragOverCell || !gameShips) return [];

    const ship = shipMap.get(draggedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes.range || 1;

    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;

    const validShootingPositions: { row: number; col: number }[] = [];

    // First, add all positions that are exactly 1 square away
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

    // Then check all positions within shooting range
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
        if (distance <= shootingRange && distance > 1) {
          const isOccupied = game.shipPositions.some(
            (pos) => pos.position.row === row && pos.position.col === col
          );
          if (!isOccupied) {
            const shouldCheckLineOfSight =
              distance > 1 &&
              (selectedWeaponType !== "special" ||
                (specialType !== 1 && specialType !== 2 && specialType !== 3));

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
  }, [
    draggedShipId,
    dragOverCell,
    gameShips,
    shipMap,
    getShipAttributes,
    selectedWeaponType,
    specialRange,
    specialType,
    game.shipPositions,
    blockedGrid,
    hasLineOfSight,
  ]);

  // Auto-set Flak to target all ships when Flak is first selected
  // Use a ref to track if we've already set it for this selection
  const flakAutoSetRef = React.useRef<{
    shipId: bigint | null;
    weaponType: string;
  }>({
    shipId: null,
    weaponType: "weapon",
  });

  React.useEffect(() => {
    if (
      selectedShipId &&
      selectedWeaponType === "special" &&
      specialType === 3
    ) {
      // Only auto-set if this is a new selection (ship changed or weapon type changed to special)
      const isNewSelection =
        flakAutoSetRef.current.shipId !== selectedShipId ||
        (flakAutoSetRef.current.weaponType !== "special" &&
          selectedWeaponType === "special");

      if (isNewSelection && targetShipId !== null) {
        // Automatically set target to 0n (all ships) for Flak
        setTargetShipId(0n);
        flakAutoSetRef.current = {
          shipId: selectedShipId,
          weaponType: selectedWeaponType,
        };
      }
    } else {
      // Reset the ref when not Flak
      flakAutoSetRef.current = {
        shipId: selectedShipId,
        weaponType: selectedWeaponType,
      };
    }
  }, [selectedShipId, selectedWeaponType, specialType, targetShipId]);

  // Check if it's the current player's turn
  const isMyTurn = game.turnState.currentTurn === address;

  // Determine if we should show move preview (opponent or player's own last move)
  // Show if: no ship selected AND we have latest event AND ship is at that position
  const shouldShowMovePreview = React.useMemo(() => {
    if (
      !selectedShipId &&
      latestGameEvent !== null &&
      game.metadata.winner === "0x0000000000000000000000000000000000000000"
    ) {
      // Check if the event ship exists
      const eventShip = shipMap.get(latestGameEvent.shipId);
      if (eventShip) {
        // Verify the ship is actually at that position in the current game state
        const currentPosition = game.shipPositions.find(
          (pos) => pos.shipId === latestGameEvent.shipId
        );
        if (
          currentPosition &&
          currentPosition.position.row === latestGameEvent.newRow &&
          currentPosition.position.col === latestGameEvent.newCol
        ) {
          return true;
        }
      }
    }
    return false;
  }, [
    selectedShipId,
    latestGameEvent,
    game.metadata.winner,
    game.shipPositions,
    shipMap,
  ]);

  // When showing move preview, set up the preview state
  // to show the same view as before submit (with target selection, damage preview, etc.)
  React.useEffect(() => {
    if (shouldShowMovePreview && latestGameEvent) {
      const eventShip = shipMap.get(latestGameEvent.shipId);
      if (eventShip) {
        // Set preview position
        setPreviewPosition({
          row: latestGameEvent.newRow,
          col: latestGameEvent.newCol,
        });
        // Set target if there is one
        if (latestGameEvent.targetShipId !== 0n) {
          setTargetShipId(latestGameEvent.targetShipId);
        } else {
          setTargetShipId(null);
        }
        // Set weapon type based on action
        if (latestGameEvent.actionType === 1) {
          // Shoot
          setSelectedWeaponType("weapon");
        } else if (latestGameEvent.actionType === 2) {
          // Special
          setSelectedWeaponType("special");
        }
      }
    } else if (!shouldShowMovePreview) {
      // Clear preview when not showing
      if (!selectedShipId) {
        setPreviewPosition(null);
        setTargetShipId(null);
      }
    }
  }, [shouldShowMovePreview, latestGameEvent, shipMap, selectedShipId]);

  const highlightedMovePosition =
    shouldShowMovePreview && latestGameEvent
      ? { row: latestGameEvent.newRow, col: latestGameEvent.newCol }
      : null;

  // Track previous turn state to detect turn changes
  const prevTurnRef = React.useRef<boolean | null>(null);

  // Play alert sound when it becomes the player's turn
  React.useEffect(() => {
    if (isMyTurn && address && prevTurnRef.current === false) {
      // Only play sound when turn changes from opponent to player
      const audio = new Audio("/sound/alert.mp3");
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(() => {
        // Silently fail - some browsers block autoplay
      });
    }
    // Update the previous turn state
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, address]);

  // Clear any pending transaction state when turn changes
  React.useEffect(() => {
    // Clear any stale transaction state when it becomes the player's turn
    if (isMyTurn && address) {
      // Always clear transaction state when it's the player's turn
      // This ensures the submit button is enabled even if there was a pending transaction
      clearAllTransactions();

      // Reset move-related state to ensure clean slate (only when transitioning from opponent)
      if (prevTurnRef.current === false) {
        setPreviewPosition(null);
        setSelectedShipId(null);
        setTargetShipId(null);
        setSelectedWeaponType("weapon");
      }
    }
  }, [isMyTurn, address, clearAllTransactions]);

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

  // Handle Escape key to deselect ship and reset preview position
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        setSelectedWeaponType("weapon");
        setDraggedShipId(null);
        setDragOverCell(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Show loading state if game data is being fetched
  if (gameLoading) {
    return (
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
          >
            ←
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
            ←
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
              ←
            </button>
            <h1 className="text-2xl font-mono text-white flex items-center gap-3">
              <span>Game {game.metadata.gameId.toString()}</span>
              <span className="text-gray-400 text-base">
                Round {game.turnState.currentRound.toString()}
              </span>
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
            ←
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-mono text-white flex items-center gap-3">
              <span>Game {game.metadata.gameId.toString()}</span>
              <span className="text-gray-400 text-base">
                Round {game.turnState.currentRound.toString()}
              </span>
            </h1>
            {/* Turn Indicator and Countdown / Seize Turn */}
            {game.metadata.winner ===
              "0x0000000000000000000000000000000000000000" &&
              (() => {
                const isParticipant =
                  game.metadata.creator === address ||
                  game.metadata.joiner === address;
                const canSeizeTurn =
                  !isMyTurn && isParticipant && turnSecondsLeft <= 0;
                const hasExceededTime =
                  isMyTurn && isParticipant && turnSecondsLeft <= 0;

                if (hasExceededTime) {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="text-blue-400">YOUR TURN</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-red-400 font-mono animate-pulse">
                          00:00
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
                            style={{ width: `${pollProgress}%` }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            lastPollTimeRef.current = Date.now();
                            refetchGame();
                          }}
                          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                          title="Refresh game state"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (canSeizeTurn) {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-sm">
                        <TransactionButton
                          transactionId={`seize-${game.metadata.gameId.toString()}`}
                          contractAddress={gameContractConfig.address}
                          abi={gameContractConfig.abi}
                          functionName="forceMoveOnTimeout"
                          args={[game.metadata.gameId]}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-mono transition-colors"
                          loadingText="Seizing..."
                          errorText="Failed"
                          onSuccess={() => {
                            toast.success("Turn seized. Opponent timed out.");
                            refetchGame();
                            refetch?.();
                          }}
                        >
                          Seize Turn
                        </TransactionButton>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
                            style={{ width: `${pollProgress}%` }}
                          />
                        </div>
                        <button
                          onClick={() => {
                            lastPollTimeRef.current = Date.now();
                            refetchGame();
                          }}
                          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                          title="Refresh game state"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span
                        className={isMyTurn ? "text-blue-400" : "text-red-400"}
                      >
                        {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span
                        className={
                          turnSecondsLeft <= 10
                            ? "text-red-400 font-mono"
                            : "text-cyan-400 font-mono"
                        }
                      >
                        {formatSeconds(turnSecondsLeft)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
                          style={{ width: `${pollProgress}%` }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          lastPollTimeRef.current = Date.now();
                          refetchGame();
                        }}
                        className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                        title="Refresh game state"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
          {/* Scores box aligned left, to the right of title */}
          <div className="ml-6 bg-gray-800 rounded p-2 border border-gray-700 w-48 text-lg">
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-400">My Score:</span>
                <span className="text-white">
                  {game.metadata.creator === address
                    ? game.creatorScore?.toString() || "0"
                    : game.joinerScore?.toString() || "0"}
                  /{game.maxScore?.toString() || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opponent:</span>
                <span className="text-white">
                  {game.metadata.creator === address
                    ? game.joinerScore?.toString() || "0"
                    : game.creatorScore?.toString() || "0"}
                  /{game.maxScore?.toString() || "0"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Move Confirmation UI - positioned between left and right sections */}
        {/* Show for player's own moves OR move preview (opponent or player's last move) */}
        {((selectedShipId &&
          isMyTurn &&
          isShipOwnedByCurrentPlayer(selectedShipId)) ||
          (shouldShowMovePreview && latestGameEvent)) && (
          <div className="flex-1 mx-6 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center gap-6 p-4">
              {/* Left: Ship Info */}
              <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">
                    {(() => {
                      if (shouldShowMovePreview && latestGameEvent) {
                        const eventShip = shipMap.get(latestGameEvent.shipId);
                        return (
                          eventShip?.name ||
                          `Ship #${latestGameEvent.shipId.toString()}`
                        );
                      }
                      if (selectedShipId) {
                        const selectedShip = shipMap.get(selectedShipId);
                        return (
                          selectedShip?.name ||
                          `Ship #${selectedShipId.toString()}`
                        );
                      }
                      return "Unknown Ship";
                    })()}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-300 font-mono">
                    {previewPosition
                      ? `(${previewPosition.row}, ${previewPosition.col})`
                      : (() => {
                          const currentPosition = game.shipPositions.find(
                            (pos) => pos.shipId === selectedShipId
                          );
                          return currentPosition
                            ? `(${currentPosition.position.row}, ${currentPosition.position.col})`
                            : "Unknown";
                        })()}
                  </span>
                  {(() => {
                    const points = (() => {
                      if (previewPosition) {
                        const row = previewPosition.row;
                        const col = previewPosition.col;
                        return (scoringGrid[row] && scoringGrid[row][col]) || 0;
                      }
                      const currentPosition = game.shipPositions.find(
                        (pos) => pos.shipId === selectedShipId
                      );
                      if (!currentPosition) return 0;
                      const r = currentPosition.position.row;
                      const c = currentPosition.position.col;
                      return (scoringGrid[r] && scoringGrid[r][c]) || 0;
                    })();
                    return points > 0 ? (
                      <span className="text-yellow-400 text-sm">
                        ⭐ {points}
                      </span>
                    ) : null;
                  })()}
                </div>
                {selectedShip && selectedShip.equipment.special > 0 && (
                  <select
                    value={selectedWeaponType}
                    onChange={(e) => {
                      const newWeaponType = e.target.value as
                        | "weapon"
                        | "special";
                      setSelectedWeaponType(newWeaponType);
                      if (newWeaponType === "special" && specialType === 3) {
                        setTargetShipId(0n);
                      } else {
                        setTargetShipId(null);
                      }
                    }}
                    className="px-3 py-1.5 text-sm rounded bg-gray-800 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
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
                )}
              </div>

              {/* Center: Target Selection */}
              {(validTargets.length > 0 ||
                assistableTargets.length > 0 ||
                assistableTargetsFromStart.length > 0) && (
                <div className="flex-1">
                  <div className="bg-gray-800 rounded border border-gray-700 p-3">
                    <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                      Select Target (Optional)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedWeaponType === "special" && specialType === 3 ? (
                        <>
                          <button
                            onClick={() => setTargetShipId(0n)}
                            className={`px-3 py-1.5 text-sm rounded transition-colors ${
                              targetShipId === 0n
                                ? "bg-orange-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                          >
                            💥 Flak ({validTargets.length})
                          </button>
                          {previewPosition && (
                            <button
                              onClick={() => setTargetShipId(null)}
                              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                targetShipId === null
                                  ? "bg-gray-600 text-white"
                                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                              }`}
                            >
                              Move Only
                            </button>
                          )}
                        </>
                      ) : selectedWeaponType === "special" &&
                        specialType === 1 ? (
                        validTargets.map((target) => {
                          const targetShip = shipMap.get(target.shipId);
                          return (
                            <button
                              key={target.shipId.toString()}
                              onClick={() => setTargetShipId(target.shipId)}
                              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                targetShipId === target.shipId
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-700 text-red-300 hover:bg-gray-600"
                              }`}
                            >
                              ⚡ EMP{" "}
                              {targetShip?.name ||
                                `#${target.shipId.toString()}`}
                            </button>
                          );
                        })
                      ) : (
                        <>
                          {validTargets.map((target) => {
                            const targetShip = shipMap.get(target.shipId);
                            const damage = calculateDamage(target.shipId);
                            return (
                              <button
                                key={target.shipId.toString()}
                                onClick={() => setTargetShipId(target.shipId)}
                                className={`px-3 py-1.5 text-sm rounded transition-colors ${
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
                                  <span className="ml-1.5">
                                    🔧 {damage.reducedDamage}
                                  </span>
                                ) : damage.reactorCritical ? (
                                  <span className="ml-1.5">⚡ +1</span>
                                ) : damage.willKill ? (
                                  <span className="ml-1.5">
                                    💀 {damage.reducedDamage}
                                  </span>
                                ) : (
                                  <span className="ml-1.5">
                                    ⚔️ {damage.reducedDamage}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {(assistableTargets.length > 0 ||
                            assistableTargetsFromStart.length > 0) && (
                            <>
                              {[
                                ...assistableTargets,
                                ...assistableTargetsFromStart,
                              ].map((target) => {
                                const targetShip = shipMap.get(target.shipId);
                                return (
                                  <button
                                    key={`assist-${target.shipId.toString()}`}
                                    onClick={() =>
                                      setTargetShipId(target.shipId)
                                    }
                                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                      targetShipId === target.shipId
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-700 text-blue-300 hover:bg-gray-600"
                                    }`}
                                  >
                                    🆘 Assist #{target.shipId.toString()}
                                    {targetShip && ` (${targetShip.name})`}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                      {!(
                        selectedWeaponType === "special" &&
                        specialType === 3 &&
                        previewPosition
                      ) && (
                        <button
                          onClick={() => setTargetShipId(null)}
                          className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                        >
                          {previewPosition ? "Move Only" : "Stay"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Right: Actions */}
              {/* Always show this section to keep buttons on the right, but only show buttons when not in preview mode */}
              <div className="flex flex-col gap-2 flex-shrink-0 ml-auto">
                {!shouldShowMovePreview && (
                  <>
                    {(() => {
                      // Compute the actual actionType that will be submitted (same as args)
                      const computedActionType =
                        targetShipId !== null && targetShipId !== 0n
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
                          : targetShipId === 0n &&
                            selectedWeaponType === "special" &&
                            specialType === 3
                          ? ActionType.Special // Flak AOE (targetShipId is 0n)
                          : ActionType.Pass; // Stay instead (targetShipId is null) or no target

                      const computedRow = previewPosition
                        ? previewPosition.row
                        : (() => {
                            const currentPosition = game.shipPositions.find(
                              (pos) => pos.shipId === selectedShipId
                            );
                            return currentPosition
                              ? currentPosition.position.row
                              : 0;
                          })();
                      const computedCol = previewPosition
                        ? previewPosition.col
                        : (() => {
                            const currentPosition = game.shipPositions.find(
                              (pos) => pos.shipId === selectedShipId
                            );
                            return currentPosition
                              ? currentPosition.position.col
                              : 0;
                          })();

                      // Determine button text based on computed actionType
                      const getButtonText = () => {
                        if (previewPosition) {
                          // Moving
                          if (computedActionType === ActionType.Assist) {
                            return scoringGrid[computedRow] &&
                              scoringGrid[computedRow][computedCol] > 0
                              ? "➡️⭐🆘"
                              : "➡️🆘";
                          }
                          if (
                            computedActionType === ActionType.Special &&
                            specialType === 3
                          ) {
                            return scoringGrid[computedRow] &&
                              scoringGrid[computedRow][computedCol] > 0
                              ? "➡️⭐💥"
                              : "➡️💥";
                          }
                          if (computedActionType === ActionType.Special) {
                            const specialIcon =
                              specialType === 1
                                ? "⚡"
                                : specialType === 2
                                ? "🔧"
                                : "✨";
                            return scoringGrid[computedRow] &&
                              scoringGrid[computedRow][computedCol] > 0
                              ? `➡️⭐${specialIcon}`
                              : `➡️${specialIcon}`;
                          }
                          if (computedActionType === ActionType.Shoot) {
                            return scoringGrid[computedRow] &&
                              scoringGrid[computedRow][computedCol] > 0
                              ? "➡️⚔️⭐"
                              : "➡️⚔️";
                          }
                          // Pass (shouldn't happen with previewPosition, but handle it)
                          return scoringGrid[computedRow] &&
                            scoringGrid[computedRow][computedCol] > 0
                            ? "➡️⭐"
                            : "➡️";
                        } else {
                          // Not moving (staying in place)
                          const currentPosition = game.shipPositions.find(
                            (pos) => pos.shipId === selectedShipId
                          );
                          const isOnScoringTile =
                            currentPosition &&
                            scoringGrid[currentPosition.position.row] &&
                            scoringGrid[currentPosition.position.row][
                              currentPosition.position.col
                            ] > 0;

                          if (computedActionType === ActionType.Pass) {
                            return isOnScoringTile ? "⏸️⭐" : "✓";
                          }
                          if (computedActionType === ActionType.Assist) {
                            return "🆘";
                          }
                          if (
                            computedActionType === ActionType.Special &&
                            specialType === 3
                          ) {
                            return isOnScoringTile ? "⏸️⭐💥" : "💥";
                          }
                          if (computedActionType === ActionType.Special) {
                            const specialIcon =
                              specialType === 1
                                ? "⚡"
                                : specialType === 2
                                ? "🔧"
                                : "✨";
                            return isOnScoringTile
                              ? `⏸️⭐${specialIcon}`
                              : specialIcon;
                          }
                          if (computedActionType === ActionType.Shoot) {
                            return "⚔️";
                          }
                          return "✓";
                        }
                      };

                      return (
                        <TransactionButton
                          transactionId={`move-ship-${selectedShipId}-${game.metadata.gameId}`}
                          contractAddress={gameContractConfig.address}
                          abi={gameContractConfig.abi}
                          functionName="moveShip"
                          args={[
                            game.metadata.gameId,
                            selectedShipId,
                            computedRow,
                            computedCol,
                            computedActionType,
                            targetShipId || 0n,
                          ]}
                          className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                          loadingText="Submitting..."
                          errorText="Error"
                          onSuccess={() => {
                            // Deselect ship after transaction receipt is received
                            setPreviewPosition(null);
                            setSelectedShipId(null);
                            setTargetShipId(null);
                            setSelectedWeaponType("weapon");
                            toast.success("Move submitted successfully!");
                            // Track when player moved to trigger polling schedule
                            const moveTime = Date.now();
                            playerMoveTimeRef.current = moveTime;
                            setPlayerMoveTimestamp(moveTime); // Trigger effect re-run
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
                            } else if (
                              errorMessage.includes("insufficient funds")
                            ) {
                              toast.error("Insufficient funds for transaction");
                            } else if (errorMessage.includes("gas")) {
                              toast.error(
                                "Transaction failed due to gas estimation error"
                              );
                            } else if (
                              errorMessage.includes("execution reverted")
                            ) {
                              toast.error(
                                "Transaction reverted - check if it&apos;s your turn and ship is valid"
                              );
                            } else if (errorMessage.includes("NotYourTurn")) {
                              toast.error("It&apos;s not your turn to move");
                            } else if (errorMessage.includes("ShipNotFound")) {
                              toast.error("Ship not found in this game");
                            } else if (errorMessage.includes("InvalidMove")) {
                              toast.error(
                                "Invalid move - check ship position and movement range"
                              );
                            } else if (
                              errorMessage.includes("PositionOccupied")
                            ) {
                              toast.error(
                                "Target position is already occupied"
                              );
                            } else {
                              toast.error(
                                `Transaction failed: ${errorMessage}`
                              );
                            }
                          }}
                          validateBeforeTransaction={() => {
                            // Validate based on computed values (same logic as args that will be submitted)
                            if (!selectedShipId) {
                              return "No ship selected";
                            }
                            if (
                              !game.metadata.gameId ||
                              game.metadata.gameId === 0n
                            ) {
                              return "Invalid game ID";
                            }
                            if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
                              return "You can only move your own ships";
                            }
                            if (movedShipIdsSet.has(selectedShipId)) {
                              return "This ship has already moved this round";
                            }
                            if (
                              computedRow < 0 ||
                              computedRow >= GRID_HEIGHT ||
                              computedCol < 0 ||
                              computedCol >= GRID_WIDTH
                            ) {
                              return "Invalid position coordinates";
                            }
                            return true;
                          }}
                        >
                          Submit {getButtonText()}
                        </TransactionButton>
                      );
                    })()}
                    <button
                      onClick={handleCancelMove}
                      className="px-4 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Debug: show moveShip params */}
            {showDebug && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-700 text-xs text-gray-400 font-mono">
                {(() => {
                  const currentPosition = game.shipPositions.find(
                    (pos) => pos.shipId === selectedShipId
                  );
                  const row = previewPosition
                    ? previewPosition.row
                    : currentPosition
                    ? currentPosition.position.row
                    : 0;
                  const col = previewPosition
                    ? previewPosition.col
                    : currentPosition
                    ? currentPosition.position.col
                    : 0;

                  const isAssistAction =
                    targetShipId !== null &&
                    (assistableTargets.some(
                      (target) => target.shipId === targetShipId
                    ) ||
                      assistableTargetsFromStart.some(
                        (target) => target.shipId === targetShipId
                      ));

                  const actionType =
                    targetShipId !== null && targetShipId !== 0n
                      ? isAssistAction
                        ? ActionType.Assist
                        : selectedWeaponType === "special"
                        ? ActionType.Special
                        : ActionType.Shoot
                      : targetShipId === 0n &&
                        selectedWeaponType === "special" &&
                        specialType === 3
                      ? ActionType.Special // Flak AOE (targetShipId is 0n)
                      : ActionType.Pass; // Stay instead (targetShipId is null) or no target

                  const params = [
                    String(game.metadata.gameId),
                    String(selectedShipId || 0n),
                    row,
                    col,
                    actionType,
                    String(targetShipId || 0n),
                  ];

                  return (
                    <div>
                      <span className="opacity-60 mr-1">Debug params:</span>
                      <span>
                        [gameId: {params[0]}, shipId: {params[1]}, row: {row},
                        col: {col}, actionType: {actionType}, target:{" "}
                        {params[5]}]
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Right side: Emergency Flee Safety Switch and Game Status */}
        <div className="flex items-center space-x-4">
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
      <div
        className="bg-gray-900 rounded-lg p-2 w-full"
        style={{
          outline: `2px solid ${
            game.turnState.currentTurn === address ? "#60a5fa" : "#f87171"
          }`, // blue-400 when my turn, red-400 when opponent's
          outlineOffset: 0,
          borderColor: "#374151", // keep the subtle internal border color
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
          isCurrentPlayerTurn={game.turnState.currentTurn === address}
          isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
          movedShipIdsSet={movedShipIdsSet}
          specialType={specialType}
          blockedGrid={blockedGrid}
          scoringGrid={scoringGrid}
          onlyOnceGrid={onlyOnceGrid}
          calculateDamage={calculateDamage}
          getShipAttributes={getShipAttributes}
          disableTooltips={disableTooltips}
          address={address}
          currentTurn={game.turnState.currentTurn}
          highlightedMovePosition={highlightedMovePosition}
          setSelectedShipId={setSelectedShipId}
          setPreviewPosition={setPreviewPosition}
          setTargetShipId={setTargetShipId}
          setSelectedWeaponType={setSelectedWeaponType}
          setHoveredCell={setHoveredCell}
          setDraggedShipId={setDraggedShipId}
          setDragOverCell={setDragOverCell}
        />

        {/* Legend and Test Controls Row */}
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center space-x-6">
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

          {/* Test controls moved to the right of the key */}
          {game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" && (
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => setShowDebug(e.target.checked)}
                  className="rounded"
                />
                <span>Show Debug</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disableTooltips}
                  onChange={(e) => setDisableTooltips(e.target.checked)}
                  className="rounded"
                />
                <span>Disable Tooltips</span>
              </label>
              <button
                onClick={() => {
                  refetchGame();
                }}
                className="px-2 py-1 border border-cyan-400 text-cyan-400 rounded font-mono hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10"
              >
                Test Refetch
              </button>
              <button
                onClick={() => {
                  globalGameRefetchFunctions.forEach((refetchFn) => {
                    refetchFn();
                  });
                }}
                className="px-2 py-1 border border-green-400 text-green-400 rounded font-mono hover:border-green-300 hover:text-green-300 hover:bg-green-400/10"
              >
                Test Events
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Events */}
      <GameEvents
        gameId={game.metadata.gameId}
        shipMap={shipMap}
        onLatestEventChange={handleLatestEventChange}
        shipPositions={game.shipPositions}
        address={address}
      />

      {/* Ship Details */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Determine order based on player: creator has My Fleet left, joiner has Opponent's Fleet left */}
          {game.metadata.creator === address ? (
            <>
              {/* My Fleet - Left for creator */}
              <div>
                <h4 className="text-blue-400 font-mono mb-3">
                  My Fleet
                  <span className="ml-2 text-gray-400">
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "warning" // Yellow outline for reactor critical
                        : "none";

                    return (
                      <div key={shipId.toString()}>
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
                          flipShip={game.metadata.creator === address}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                        />
                        {(() => {
                          const isAssistableTarget =
                            selectedShipId &&
                            (assistableTargets.some(
                              (target) => target.shipId === shipId
                            ) ||
                              assistableTargetsFromStart.some(
                                (target) => target.shipId === shipId
                              ));

                          if (isAssistableTarget) {
                            return (
                              <button
                                onClick={() => {
                                  setTargetShipId(shipId);
                                  setSelectedWeaponType("weapon"); // Reset to weapon for assist
                                }}
                                className="mt-2 w-full text-blue-400 font-mono text-xs hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to assist this ship"
                              >
                                Click to assist this ship
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Opponent's Fleet - Right for creator */}
              <div>
                <h4 className="text-red-400 font-mono mb-3">
                  Opponent&apos;s Fleet
                  <span className="ml-2 text-gray-400">
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "warning" // Yellow outline for reactor critical
                        : "none";

                    return (
                      <div key={shipId.toString()}>
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
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Opponent's Fleet - Left for joiner */}
              <div>
                <h4 className="text-red-400 font-mono mb-3">
                  Opponent&apos;s Fleet
                  <span className="ml-2 text-gray-400">
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "warning" // Yellow outline for reactor critical
                        : "none";

                    return (
                      <div key={shipId.toString()}>
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
                          flipShip={true}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* My Fleet - Right for joiner */}
              <div>
                <h4 className="text-blue-400 font-mono mb-3">
                  My Fleet
                  <span className="ml-2 text-gray-400">
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId
                    );
                    const attributes = getShipAttributes(shipId);
                    const ship = shipMap.get(shipId);

                    if (!shipPosition || !attributes || !ship) return null;

                    // Determine reactor critical status
                    const reactorCriticalStatus =
                      attributes.reactorCriticalTimer > 0 &&
                      attributes.hullPoints === 0
                        ? "critical" // Red outline for reactor critical + 0 HP
                        : attributes.reactorCriticalTimer > 0
                        ? "warning" // Yellow outline for reactor critical
                        : "none";

                    return (
                      <div key={shipId.toString()}>
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
                          flipShip={false}
                          reactorCriticalStatus={reactorCriticalStatus}
                          hasMoved={movedShipIdsSet.has(shipId)}
                          gameViewMode={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDisplay;
