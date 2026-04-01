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
  LastMove,
} from "../types/types";
import { useShipsByIds } from "../hooks/useShipsByIds";
import ShipCard from "./ShipCard";
import { useGetGameMapState } from "../hooks/useMapsContract";
import { useGameContract, useGetGame } from "../hooks/useGameContract";
import {
  useContractEvents,
  registerGameRefetch,
  unregisterGameRefetch,
  globalGameRefetchFunctions,
} from "../hooks/useContractEvents";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { useTransaction } from "../providers/TransactionContext";
import {
  GAME_VIEW_SIDE_ROOT_CLASS,
  useGameViewChromeLayout,
} from "../hooks/useGameViewChromeLayout";
import { useSpecialRange } from "../hooks/useSpecialRange";
import {
  useSpecialData,
  SpecialData,
} from "../hooks/useShipAttributesContract";
import { FleeSafetySwitch } from "./FleeSafetySwitch";
import { GameEvents } from "./GameEvents";
import { GameBoardLayout } from "./GameBoardLayout";
import { GameGrid } from "./GameGrid";
import { computeMovementRange } from "../utils/gameGridRanges";
import { buildMapGridsFromContractMap } from "../utils/mapGridUtils";

interface GameDisplayProps {
  game: GameDataView;
  onBack: () => void;
  refetch?: () => void;
  readOnly?: boolean;
}

const GameDisplay: React.FC<GameDisplayProps> = ({
  game: initialGame,
  onBack,
  refetch,
  readOnly = false,
}) => {
  // Debug mode toggle
  const [showDebug, setShowDebug] = React.useState(false);
  // Tooltip disable toggle
  const [disableTooltips, setDisableTooltips] = React.useState(false);
  const { address } = useAccount();
  const gameContract = useGameContract();
  const { clearAllTransactions, transactionState } = useTransaction();
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [targetShipId, setTargetShipId] = useState<bigint | null>(null);
  // Explicit per-ship action override (e.g. Retreat/Flee)
  const [actionOverride, setActionOverride] = useState<ActionType | null>(null);

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
  const [isLastMovePanelMinimized, setIsLastMovePanelMinimized] =
    useState(true);
  const gameViewRootRef = React.useRef<HTMLDivElement | null>(null);
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const chromeLayout = useGameViewChromeLayout(
    gameViewRootRef,
    gridContainerRef,
  );
  const chromeOnSide = chromeLayout === "side";

  const proposedMoveTargetListClass = chromeOnSide
    ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
    : "flex flex-wrap gap-2 min-h-[5rem]";
  const proposedMoveTargetBtnClass = chromeOnSide
    ? "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex w-full shrink-0 items-center justify-center"
    : "h-9 px-3 py-0 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 flex items-center shrink-0";

  // If the user starts targeting or moving, clear any explicit "retreat" override.
  React.useEffect(() => {
    if (actionOverride !== ActionType.Retreat) return;
    if (targetShipId !== null || previewPosition !== null) {
      setActionOverride(null);
    }
  }, [actionOverride, targetShipId, previewPosition]);

  // Fetch the current game data to get real-time updates
  const {
    data: gameData,
    isLoading: gameLoading,
    error: gameError,
    refetch: refetchGame,
  } = useGetGame(Number(initialGame.metadata.gameId));

  // Use the fetched game data if available, otherwise fall back to initial game
  const game = (gameData as GameDataView) || initialGame;
  const aliveShipPositions = React.useMemo(
    () => game.shipPositions.filter((shipPosition) => (shipPosition.status ?? 0) === 0),
    [game.shipPositions],
  );

  // Optimistic last-move handling:
  // When a tx is confirmed, there can be a short delay before the
  // blockchain/refetch updates `game.lastMove`. During that gap we want
  // to keep the submitted move rendered as the "last move".
  const [optimisticLastMove, setOptimisticLastMove] = React.useState<
    LastMove | null
  >(null);
  const displayedLastMove: LastMove | undefined =
    optimisticLastMove ?? game.lastMove;

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
  const isWindowFocusedRef = React.useRef(true);
  const wasHiddenRef = React.useRef(false);
  const wasInactiveRef = React.useRef(false);
  const lastRefetchOnFocusAtRef = React.useRef(0);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const playerMoveTimeRef = React.useRef<number | null>(null);
  const [playerMoveTimestamp, setPlayerMoveTimestamp] = React.useState<
    number | null
  >(null);
  const lastPollTimeRef = React.useRef<number>(Date.now());
  const currentPollIntervalRef = React.useRef<number>(30 * 1000);

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

  // Track page visibility and window focus.
  // If the tab was inactive and then comes into focus, refetch immediately once.
  React.useEffect(() => {
    const initialHidden = !!document.hidden;
    const initialFocused = document.hasFocus();
    wasHiddenRef.current = initialHidden;
    isWindowFocusedRef.current = initialFocused;
    wasInactiveRef.current = initialHidden || !initialFocused;
    setIsPageVisible(!initialHidden);
    setIsWindowFocused(initialFocused);

    const maybeRefetchOnActive = (wasInactive: boolean) => {
      const now = Date.now();
      const pageVisible = !document.hidden;
      const hasFocus = document.hasFocus();
      if (!pageVisible || !hasFocus) return;

      // Prevent bursts from multiple focus-related events.
      if (now - lastRefetchOnFocusAtRef.current < 5000) return;

      // Only do the immediate refetch when transitioning inactive -> active.
      if (wasInactive) {
        lastRefetchOnFocusAtRef.current = now;
        refetchGame();
      }
    };

    const syncActivityState = () => {
      const nowHidden = !!document.hidden;
      const nowFocused = document.hasFocus();
      const wasInactive = wasInactiveRef.current;
      const nowInactive = nowHidden || !nowFocused;

      wasHiddenRef.current = nowHidden;
      isWindowFocusedRef.current = nowFocused;
      wasInactiveRef.current = nowInactive;

      setIsPageVisible(!nowHidden);
      setIsWindowFocused(nowFocused);
      maybeRefetchOnActive(wasInactive);
    };

    const handleVisibilityChange = () => {
      syncActivityState();
    };

    const handleFocus = () => {
      syncActivityState();
    };

    const handleBlur = () => {
      syncActivityState();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("focusin", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("focusin", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focusout", handleBlur);
    };
  }, [refetchGame]);

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
            })`,
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
  const turnTimeSec = React.useMemo(
    () => Number(game.turnState.turnTime || 0n),
    [game.turnState.turnTime],
  );
  const turnPercentRemaining = React.useMemo(() => {
    if (!turnTimeSec || turnTimeSec <= 0) return 0;
    const pct = (turnSecondsLeft / turnTimeSec) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [turnSecondsLeft, turnTimeSec]);

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
  const GRID_WIDTH = 17;
  const GRID_HEIGHT = 11;

  // Get game map state directly from the Maps contract
  const { data: gameMapState, isLoading: mapLoading } = useGetGameMapState(
    Number(game.metadata.gameId),
  );

  // Create grids from contract map (same format as tutorial map grids)
  const { blockedGrid, scoringGrid, onlyOnceGrid } = React.useMemo(() => {
    const gameMapData = gameMapState as
      | [
          Array<{ row: number; col: number }>,
          Array<{
            row: number;
            col: number;
            points: number;
            onlyOnce: boolean;
          }>,
        ]
      | undefined;
    return buildMapGridsFromContractMap(
      gameMapData?.[0],
      gameMapData?.[1],
      GRID_WIDTH,
      GRID_HEIGHT,
    );
  }, [gameMapState]);

  // Get all ship IDs that may need rendering in this view.
  // Include active IDs plus any IDs present in shipPositions (destroyed/fled can
  // now be present there and still need metadata for tooltip/render path).
  const allShipIds = React.useMemo(() => {
    const ids = new Set<bigint>();
    game.creatorActiveShipIds.forEach((id) => ids.add(id));
    game.joinerActiveShipIds.forEach((id) => ids.add(id));
    game.shipPositions.forEach((shipPosition) => ids.add(shipPosition.shipId));
    return Array.from(ids);
  }, [game.creatorActiveShipIds, game.joinerActiveShipIds, game.shipPositions]);

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
    [game.shipAttributes, game.shipIds],
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
      blockedGrid: boolean[][],
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
    [],
  );

  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = React.useMemo(() => {
    const newGrid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(null));

    // Place ships on the grid
    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;

      // Optimistic last move:
      // If we've confirmed a tx but the contract state hasn't been refetched
      // yet, render the ship at the submitted destination (or remove it for
      // retreat). This prevents the board from snapping back to the old
      // state between tx receipt and the next blockchain update.
      if (optimisticLastMove && shipPosition.shipId === optimisticLastMove.shipId) {
        if (optimisticLastMove.actionType === ActionType.Retreat) {
          // Ship left the board: don't render it at its old position.
          return;
        }

        if (
          optimisticLastMove.newRow >= 0 &&
          optimisticLastMove.newRow < GRID_HEIGHT &&
          optimisticLastMove.newCol >= 0 &&
          optimisticLastMove.newCol < GRID_WIDTH
        ) {
          // Only place if the target cell is empty in our grid snapshot.
          if (!newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol]) {
            newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol] = {
              ...shipPosition,
              position: {
                row: optimisticLastMove.newRow,
                col: optimisticLastMove.newCol,
              },
            };
          }
        }

        // Skip the original placement (we rendered the optimistic position).
        return;
      }

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

    // Also show last move preview if we're displaying it (and not showing a proposed move)
    // Check conditions directly to avoid dependency order issues
    const isMyTurnNow = game.turnState.currentTurn === address;
    const shouldShowLastMoveNow =
      game.metadata.winner === "0x0000000000000000000000000000000000000000" &&
      displayedLastMove &&
      displayedLastMove.shipId !== 0n &&
      selectedShipId === null;

    const isShowingProposedMoveNow = (() => {
      if (selectedShipId === null || !isMyTurnNow || previewPosition === null) {
        return false;
      }
      const ship = shipMap.get(selectedShipId);
      return ship ? ship.owner === address : false;
    })();

    // Only show last move if not showing a proposed move
    const canShowLastMove = shouldShowLastMoveNow && !isShowingProposedMoveNow;

    if (canShowLastMove && displayedLastMove) {
      const lastMoveShipPosition = aliveShipPositions.find(
        (pos) => pos.shipId === displayedLastMove.shipId,
      );

      if (lastMoveShipPosition) {
        // The ship is currently at its new position
        // Show a preview copy at the old position (ghosted/flashing)
        const oldPos = {
          row: displayedLastMove.oldRow,
          col: displayedLastMove.oldCol,
        };
        const newPos = {
          row: displayedLastMove.newRow,
          col: displayedLastMove.newCol,
        };

        // If the ship moved (old position != new position), show preview at old position
        if (oldPos.row !== newPos.row || oldPos.col !== newPos.col) {
          if (
            oldPos.row >= 0 &&
            oldPos.row < GRID_HEIGHT &&
            oldPos.col >= 0 &&
            oldPos.col < GRID_WIDTH &&
            // Don't overwrite if there's already a ship there (shouldn't happen, but safety check)
            !newGrid[oldPos.row][oldPos.col]
          ) {
            // Place preview ship at old position (ghosted/flashing effect)
            newGrid[oldPos.row][oldPos.col] = {
              ...lastMoveShipPosition,
              position: oldPos,
              isPreview: true, // Mark as preview for styling (ghosted/flashing)
            };
          }
        }
        // The ship at new position will show pulse effect via lastMoveShipId prop in GameGrid
      }

      // For destroyed-target last-move UI, render the target ship at its
      // reported position with status=destroyed so GameGrid can replace normal
      // art with destroyed art in the regular ship rendering path.
      const isTargetingLastMove =
        displayedLastMove.actionType === ActionType.Shoot ||
        displayedLastMove.actionType === ActionType.Special;
      if (isTargetingLastMove && displayedLastMove.targetShipId !== 0n) {
        const destroyedTargetShipPosition = game.shipPositions.find(
          (shipPosition) =>
            shipPosition.shipId === displayedLastMove.targetShipId &&
            shipPosition.status === 1,
        );
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (
            row >= 0 &&
            row < GRID_HEIGHT &&
            col >= 0 &&
            col < GRID_WIDTH &&
            !newGrid[row][col]
          ) {
            newGrid[row][col] = destroyedTargetShipPosition;
          }
        }
      }
    }

    return newGrid;
  }, [
    aliveShipPositions,
    selectedShipId,
    previewPosition,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    game.metadata.winner,
    game.turnState.currentTurn,
    address,
    shipMap,
  ]);

  // Calculate movement range for selected ship (any ship, for viewing).
  // Logic is shared with the tutorial via computeMovementRange.
  const movementRange = React.useMemo(
    () =>
      computeMovementRange({
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        selectedShipId,
        hasShips: !!gameShips,
        shipMap,
        getShipAttributes,
        shipPositions: aliveShipPositions,
        previewPosition,
      }),
    [
      selectedShipId,
      gameShips,
      shipMap,
      aliveShipPositions,
      getShipAttributes,
      previewPosition,
    ],
  );

  // Calculate damage for a target ship (shooterShipIdOverride used for last-move display when no ship selected)
  const calculateDamage = React.useCallback(
    (
      targetShipId: bigint,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
      shooterShipIdOverride?: bigint,
    ) => {
      const shooterId = shooterShipIdOverride ?? selectedShipId;
      if (shooterId == null)
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: false,
        };

      const shooterAttributes = getShipAttributes(shooterId);
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

      // EMP special applies reactor damage (previewed as +1 reactor level).
      if (currentWeaponType === "special" && specialType === 1) {
        return {
          baseDamage: 0,
          reducedDamage: 0,
          willKill: false,
          reactorCritical: true,
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
          baseDamage - Math.floor((baseDamage * reduction) / 100),
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
    ],
  );

  // Valid targets: only ships in range from current position (or from preview position when move is set). Used for selection logic.
  const validTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) cannot shoot; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
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

    game.shipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId) return;
        } else if (specialType === 1) {
          if (ship.owner === address) return;
        } else {
          if (ship.owner !== address) return;
        }
      } else {
        if (ship.owner === address) return;
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

  // Targets for damage labels:
  // - When showing move + gun range (no preview), include any enemy ship that could be shot from
  //   the current position OR from any valid move position (full threat range).
  // - When showing only gun range (preview set), include only targets in range from the preview position.
  const labelTargets = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const attributes = getShipAttributes(selectedShipId);
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRangeAttr = attributes?.movement || 1;
    const shootingRangeAttr =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );
    if (!currentPosition) return [];

    // Origins:
    // - With preview: single origin = previewPosition (only gun range)
    // - Without preview: current position + all valid move positions (threat range)
    const origins: { row: number; col: number }[] = [];
    if (previewPosition) {
      origins.push({ row: previewPosition.row, col: previewPosition.col });
    } else {
      origins.push({
        row: currentPosition.position.row,
        col: currentPosition.position.col,
      });
      for (
        let row = Math.max(
          0,
          currentPosition.position.row - movementRangeAttr,
        );
        row <=
        Math.min(
          GRID_HEIGHT - 1,
          currentPosition.position.row + movementRangeAttr,
        );
        row++
      ) {
        for (
          let col = Math.max(
            0,
            currentPosition.position.col - movementRangeAttr,
          );
          col <=
          Math.min(
            GRID_WIDTH - 1,
            currentPosition.position.col + movementRangeAttr,
          );
          col++
        ) {
          const dist =
            Math.abs(row - currentPosition.position.row) +
            Math.abs(col - currentPosition.position.col);
          if (dist <= movementRangeAttr && dist > 0) {
            const occupied = game.shipPositions.some(
              (pos) => pos.position.row === row && pos.position.col === col,
            );
            if (!occupied) origins.push({ row, col });
          }
        }
      }
    }

    const targetMap = new Map<
      bigint,
      { shipId: bigint; position: { row: number; col: number } }
    >();

    for (const { row: startRow, col: startCol } of origins) {
      game.shipPositions.forEach((shipPosition) => {
        const ship = shipMap.get(shipPosition.shipId);
        if (!ship) return;

        // Same ownership/weapon-type filtering as validTargets
        if (selectedWeaponType === "special") {
          if (specialType === 3) {
            if (shipPosition.shipId === selectedShipId) return;
          } else if (specialType === 1) {
            if (ship.owner === address) return;
          } else {
            if (ship.owner !== address) return;
          }
        } else {
          if (ship.owner === address) return;
        }

        const targetRow = shipPosition.position.row;
        const targetCol = shipPosition.position.col;
        const distance =
          Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
        const canShoot =
          distance === 1 || distance <= shootingRangeAttr;

        if (canShoot && distance > 0) {
          const shouldCheckLineOfSight =
            distance > 1 &&
            (selectedWeaponType !== "special" ||
              (specialType !== 1 &&
                specialType !== 2 &&
                specialType !== 3));

          if (
            !shouldCheckLineOfSight ||
            hasLineOfSight(
              startRow,
              startCol,
              targetRow,
              targetCol,
              blockedGrid,
            )
          ) {
            targetMap.set(shipPosition.shipId, {
              shipId: shipPosition.shipId,
              position: { row: targetRow, col: targetCol },
            });
          }
        }
      });
    }

    return Array.from(targetMap.values());
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

  // Assist action removed from contract; keep empty arrays for API compatibility
  const assistableTargets = React.useMemo(() => [], []);
  const assistableTargetsFromStart = React.useMemo(() => [], []);

  // Calculate shooting range for selected ship (where it could shoot from any valid move position)
  const shootingRange = React.useMemo(() => {
    if (!selectedShipId || !gameShips) return [];

    const ship = shipMap.get(selectedShipId);
    if (!ship) return [];

    const attributes = getShipAttributes(selectedShipId);
    // Disabled ships (0 HP) have no move or threat range; only retreat is available
    if (attributes && attributes.hullPoints === 0) return [];

    const movementRange = attributes?.movement || 1;
    // Use special range if special is selected, otherwise use weapon range
    const shootingRange =
      selectedWeaponType === "special" && specialRange !== undefined
        ? specialRange
        : attributes?.range || 1;

    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === selectedShipId,
    );

    if (!currentPosition) return [];

    const validShootingPositions: { row: number; col: number }[] = [];

    // When a move is entered (preview set), show gun range from that single origin only (same as after moving to another square)
    if (previewPosition) {
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
            const isOccupied = game.shipPositions.some(
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
          const isOccupied = game.shipPositions.some(
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
                  const isMoveOccupied = game.shipPositions.some(
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
          const isOccupied = game.shipPositions.some(
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
                  const isMoveOccupied = game.shipPositions.some(
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
            (pos) => pos.position.row === row && pos.position.col === col,
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
            (pos) => pos.position.row === row && pos.position.col === col,
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
  const [awaitingTurnSyncAfterSubmit, setAwaitingTurnSyncAfterSubmit] =
    React.useState(false);
  const isMyTurnEffective = isMyTurn && !awaitingTurnSyncAfterSubmit;
  const canActInGame = !readOnly && isMyTurnEffective;

  // Track if we're currently displaying the last move (to avoid infinite loops)
  const isDisplayingLastMoveRef = React.useRef(false);
  const lastDisplayedMoveRef = React.useRef<{
    shipId: bigint;
    newRow: number;
    newCol: number;
  } | null>(null);

  // Determine if we should show last move preview
  // Show to both players UNLESS:
  // - They have a ship selected, OR
  // - It's their turn AND they have proposed but not submitted a move
  const shouldShowLastMove = React.useMemo(() => {
    // Don't show if game is won
    if (game.metadata.winner !== "0x0000000000000000000000000000000000000000") {
      return false;
    }

    // Don't show if no last move exists
    if (!displayedLastMove || displayedLastMove.shipId === 0n) {
      return false;
    }

    // Don't show if player has a ship selected
    if (selectedShipId !== null) {
      return false;
    }

    // For Retreat, the ship has left the board. Use only last move data (oldRow, oldCol); do not require ship in shipMap or shipPositions.
    if (
      (displayedLastMove.actionType as ActionType) === ActionType.Retreat
    ) {
      return true;
    }

    // For other actions, the last move ship must exist in cache
    const lastMoveShip = shipMap.get(displayedLastMove.shipId);
    if (!lastMoveShip) {
      return false;
    }

    // If we are optimistically displaying the last move, don't require the
    // contract state to have caught up yet (shipPositions will lag).
    if (optimisticLastMove) {
      return true;
    }

    // Verify the ship is actually at the new position in the current game state
    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === displayedLastMove.shipId,
    );
    if (
      currentPosition &&
      currentPosition.position.row === displayedLastMove.newRow &&
      currentPosition.position.col === displayedLastMove.newCol
    ) {
      return true;
    }

    return false;
  }, [
    game.metadata.winner,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    selectedShipId,
    shipMap,
  ]);

  // Last-move arrow, borders, and replay overlays: same visibility as ghost tiles.
  // Hide whenever any ship is selected so the grid focuses on the active selection.
  const shouldShowLastMoveOnGrid = React.useMemo(() => {
    if (game.metadata.winner !== "0x0000000000000000000000000000000000000000") {
      return false;
    }
    if (!displayedLastMove || displayedLastMove.shipId === 0n) {
      return false;
    }
    if (selectedShipId !== null) {
      return false;
    }
    if ((displayedLastMove.actionType as ActionType) === ActionType.Retreat) {
      return true;
    }
    const lastMoveShip = shipMap.get(displayedLastMove.shipId);
    if (!lastMoveShip) {
      return false;
    }
    if (optimisticLastMove) {
      return true;
    }
    const currentPosition = game.shipPositions.find(
      (pos) => pos.shipId === displayedLastMove.shipId,
    );
    if (
      currentPosition &&
      currentPosition.position.row === displayedLastMove.newRow &&
      currentPosition.position.col === displayedLastMove.newCol
    ) {
      return true;
    }
    return false;
  }, [
    game.metadata.winner,
    displayedLastMove,
    optimisticLastMove,
    game.shipPositions,
    shipMap,
    selectedShipId,
  ]);

  // Check if a ship belongs to the current player
  const isShipOwnedByCurrentPlayer = React.useCallback(
    (shipId: bigint): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === address : false;
    },
    [shipMap, address],
  );

  // Track if we're showing a proposed move (not last move)
  const isShowingProposedMove = React.useMemo(() => {
    // Show move submission UI whenever it's your turn and you have one of your
    // ships selected that hasn't moved yet, OR a disabled (0 HP) ship selected
    // that can only Retreat.
    if (selectedShipId === null) {
      return false;
    }
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;

    const moveShipTxId = `move-ship-${selectedShipId}-${game.metadata.gameId}`;
    const waitingOnMoveTx =
      (transactionState.isPending &&
        transactionState.activeTransactionId === moveShipTxId) ||
      awaitingTurnSyncAfterSubmit;

    if (movedShipIdsSet.has(selectedShipId)) {
      const attrs = getShipAttributes(selectedShipId);
      const isDisabled = attrs && attrs.hullPoints === 0;
      if (!isDisabled) return false;
    }

    if (!canActInGame && !waitingOnMoveTx) {
      return false;
    }
    return true;
  }, [
    selectedShipId,
    canActInGame,
    awaitingTurnSyncAfterSubmit,
    transactionState.isPending,
    transactionState.activeTransactionId,
    game.metadata.gameId,
    isShipOwnedByCurrentPlayer,
    movedShipIdsSet,
    getShipAttributes,
  ]);

  const isSelectedShipDisabled = React.useMemo(() => {
    if (!selectedShipId) return false;
    const attrs = getShipAttributes(selectedShipId);
    return !!attrs && attrs.hullPoints === 0;
  }, [selectedShipId, getShipAttributes]);

  // When selecting a disabled ship (0 HP), default to Retreat and clear move/target.
  React.useEffect(() => {
    if (selectedShipId === null) return;
    const attrs = getShipAttributes(selectedShipId);
    if (attrs && attrs.hullPoints === 0) {
      setActionOverride(ActionType.Retreat);
      setTargetShipId(null);
      setPreviewPosition(null);
    }
  }, [selectedShipId, getShipAttributes]);

  // When showing last move, set up the preview state to display it
  // This should NOT interfere with proposed moves
  React.useEffect(() => {
    // Don't show last move if user has selected a ship or is making a proposed move
    if (selectedShipId !== null || isShowingProposedMove) {
      if (isDisplayingLastMoveRef.current) {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        // Only clear preview if we're not showing a proposed move
        if (!isShowingProposedMove) {
          setPreviewPosition(null);
          setTargetShipId(null);
        }
      }
      return;
    }

    // Check if last move has changed
    const lastMoveChanged =
      !lastDisplayedMoveRef.current ||
      !displayedLastMove ||
      lastDisplayedMoveRef.current.shipId !== displayedLastMove.shipId ||
      lastDisplayedMoveRef.current.newRow !== displayedLastMove.newRow ||
      lastDisplayedMoveRef.current.newCol !== displayedLastMove.newCol;

    // Only set up last move preview if conditions are met
    if (shouldShowLastMove && displayedLastMove && lastMoveChanged) {
      const lastMoveShip = shipMap.get(displayedLastMove.shipId);
      if (lastMoveShip) {
        // Mark that we're displaying the last move
        isDisplayingLastMoveRef.current = true;
        lastDisplayedMoveRef.current = {
          shipId: displayedLastMove.shipId,
          newRow: displayedLastMove.newRow,
          newCol: displayedLastMove.newCol,
        };

        // Set preview position for last move
        setPreviewPosition({
          row: displayedLastMove.newRow,
          col: displayedLastMove.newCol,
        });
        // Set target if there is one
        if (displayedLastMove.targetShipId !== 0n) {
          setTargetShipId(displayedLastMove.targetShipId);
        } else {
          setTargetShipId(null);
        }
        // Set weapon type based on action
        if (displayedLastMove.actionType === ActionType.Shoot) {
          setSelectedWeaponType("weapon");
        } else if (displayedLastMove.actionType === ActionType.Special) {
          setSelectedWeaponType("special");
        }
      }
    } else if (!shouldShowLastMove && isDisplayingLastMoveRef.current) {
      // Clear preview when not showing last move
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
      setPreviewPosition(null);
      setTargetShipId(null);
    }
  }, [
    shouldShowLastMove,
    displayedLastMove,
    isShowingProposedMove,
    shipMap,
    selectedShipId,
  ]);

  // Clear optimistic last move once the contract state catches up.
  React.useEffect(() => {
    if (!optimisticLastMove) return;
    if (!game.lastMove) return;

    const matches =
      game.lastMove.shipId === optimisticLastMove.shipId &&
      game.lastMove.actionType === optimisticLastMove.actionType &&
      game.lastMove.targetShipId === optimisticLastMove.targetShipId &&
      game.lastMove.oldRow === optimisticLastMove.oldRow &&
      game.lastMove.oldCol === optimisticLastMove.oldCol &&
      game.lastMove.newRow === optimisticLastMove.newRow &&
      game.lastMove.newCol === optimisticLastMove.newCol;

    if (matches) {
      setOptimisticLastMove(null);
      setAwaitingTurnSyncAfterSubmit(false);
      // The blockchain state has caught up to the submitted preview.
      // Clear local proposal UI now (not immediately on submit) so the
      // previewed board state remains visible during the sync gap.
      setPreviewPosition(null);
      setSelectedShipId(null);
      setTargetShipId(null);
    }
  }, [
    optimisticLastMove,
    game.lastMove,
    optimisticLastMove?.shipId,
    optimisticLastMove?.actionType,
    optimisticLastMove?.targetShipId,
    optimisticLastMove?.oldRow,
    optimisticLastMove?.oldCol,
    optimisticLastMove?.newRow,
    optimisticLastMove?.newCol,
  ]);

  // If chain state already says it is no longer our turn, allow local UI to
  // resume normal turn derivation immediately.
  React.useEffect(() => {
    if (!awaitingTurnSyncAfterSubmit) return;
    if (!isMyTurn) {
      setAwaitingTurnSyncAfterSubmit(false);
      // Turn advanced on-chain; clear any locally held proposal state.
      setPreviewPosition(null);
      setSelectedShipId(null);
      setTargetShipId(null);
    }
  }, [awaitingTurnSyncAfterSubmit, isMyTurn]);

  // For Retreat, newRow/newCol are -1 (fled); don't highlight a cell
  const highlightedMovePosition =
    shouldShowLastMove &&
    displayedLastMove &&
    !isShowingProposedMove &&
    (displayedLastMove.actionType as ActionType) !== ActionType.Retreat &&
    displayedLastMove.newRow >= 0 &&
    displayedLastMove.newCol >= 0
      ? { row: displayedLastMove.newRow, col: displayedLastMove.newCol }
      : null;

  // Last move props for GameGrid
  const lastMoveShipId =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? displayedLastMove.shipId
      : null;
  const lastMoveOldPosition =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? { row: displayedLastMove.oldRow, col: displayedLastMove.oldCol }
      : null;

  const lastMoveNewPosition =
    shouldShowLastMoveOnGrid &&
    displayedLastMove &&
    !isShowingProposedMove &&
    displayedLastMove.newRow >= 0 &&
    displayedLastMove.newCol >= 0
      ? { row: displayedLastMove.newRow, col: displayedLastMove.newCol }
      : null;

  const lastMoveActionType =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? displayedLastMove.actionType
      : null;

  const lastMoveTargetShipId =
    shouldShowLastMoveOnGrid &&
    displayedLastMove &&
    !isShowingProposedMove &&
    ((displayedLastMove.actionType as ActionType) === ActionType.Special ||
      (displayedLastMove.actionType as ActionType) === ActionType.Shoot) &&
    displayedLastMove.targetShipId !== 0n
      ? displayedLastMove.targetShipId
      : null;

  // Who made the last move: use ship owner when ship is in map; otherwise derive from turn (after a move, turn switches to the other player)
  const lastMoveIsCurrentPlayer =
    shouldShowLastMoveOnGrid && displayedLastMove && !isShowingProposedMove
      ? (() => {
          const ship = shipMap.get(displayedLastMove!.shipId);
          if (ship) return ship.owner === address;
          return game.turnState.currentTurn !== address;
        })()
      : undefined;

  const appendDestroyedTextToLastMove = React.useMemo(() => {
    if (!displayedLastMove) return false;
    if (displayedLastMove.targetShipId === 0n) return false;

    const isTargetingAction =
      displayedLastMove.actionType === ActionType.Shoot ||
      displayedLastMove.actionType === ActionType.Special;
    if (!isTargetingAction) return false;

    return !game.shipPositions.some(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );
  }, [displayedLastMove, game.shipPositions]);

  const lastMoveTargetPositionDebugSuffix = React.useMemo(() => {
    if (!displayedLastMove) return "";
    if (displayedLastMove.targetShipId === 0n) return "";

    const targetPos = game.shipPositions.find(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );

    if (!targetPos) {
      return "[target shipPositions row,col: missing]";
    }

    return `[target shipPositions row,col: ${targetPos.position.row},${targetPos.position.col}]`;
  }, [displayedLastMove, game.shipPositions]);

  React.useEffect(() => {
    if (!displayedLastMove) return;
    if (displayedLastMove.targetShipId === 0n) return;

    const targetExists = game.shipPositions.some(
      (sp) => sp.shipId === displayedLastMove.targetShipId,
    );
    if (targetExists) return;

    console.log(
      "[GameDisplay debug] lastMove target missing in game.shipPositions",
      {
        gameId: game.metadata.gameId.toString(),
        lastMove: {
          shipId: displayedLastMove.shipId.toString(),
          targetShipId: displayedLastMove.targetShipId.toString(),
          actionType: displayedLastMove.actionType,
          oldRow: displayedLastMove.oldRow,
          oldCol: displayedLastMove.oldCol,
          newRow: displayedLastMove.newRow,
          newCol: displayedLastMove.newCol,
        },
        shipPositions: game.shipPositions.map((sp) => ({
          shipId: sp.shipId.toString(),
          row: sp.position.row,
          col: sp.position.col,
          isCreator: sp.isCreator,
        })),
      },
    );
  }, [displayedLastMove, game.metadata.gameId, game.shipPositions]);

  const retreatPrepShipId =
    selectedShipId != null && actionOverride === ActionType.Retreat
      ? selectedShipId
      : null;

  const retreatPrepIsCreator =
    retreatPrepShipId != null
      ? (() => {
          const ship = shipMap.get(retreatPrepShipId);
          return ship ? ship.owner === game.metadata.creator : null;
        })()
      : null;

  // Track previous turn state to detect turn changes
  const prevTurnRef = React.useRef<boolean | null>(null);

  // Play alert sound when it becomes the player's turn
  React.useEffect(() => {
    if (
      !readOnly &&
      isMyTurnEffective &&
      address &&
      prevTurnRef.current === false
    ) {
      // Only play sound when turn changes from opponent to player
      const audio = new Audio("/sound/alert.mp3");
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(() => {
        // Silently fail - some browsers block autoplay
      });
    }
    // Update the previous turn state
    prevTurnRef.current = isMyTurnEffective;
  }, [isMyTurnEffective, address, readOnly]);

  // Clear any pending transaction state when turn changes
  React.useEffect(() => {
    // Clear any stale transaction state when it becomes the player's turn
    if (!readOnly && isMyTurnEffective && address) {
      // Always clear transaction state when it's the player's turn
      // This ensures the submit button is enabled even if there was a pending transaction
      clearAllTransactions();

      // Reset move-related state to ensure clean slate (only when transitioning from opponent)
      if (prevTurnRef.current === false) {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        setPreviewPosition(null);
        setSelectedShipId(null);
        setTargetShipId(null);
        // Keep selectedWeaponType so it only changes when player uses the dropdown
      }
    }
  }, [isMyTurnEffective, address, clearAllTransactions, readOnly]);

  // Handle move submission - now handled by TransactionButton

  // Clear last move display when user selects a ship or makes a proposed move
  React.useEffect(() => {
    if (selectedShipId !== null || isShowingProposedMove) {
      isDisplayingLastMoveRef.current = false;
      lastDisplayedMoveRef.current = null;
    }
  }, [selectedShipId, isShowingProposedMove]);

  // Handle move cancellation
  const handleCancelMove = () => {
    isDisplayingLastMoveRef.current = false;
    lastDisplayedMoveRef.current = null;
    setPreviewPosition(null);
    setSelectedShipId(null);
    setTargetShipId(null);
    // Keep selectedWeaponType so it only changes when player uses the dropdown
  };

  /** Tutorial parity: pulse is driven by tutorial steps in SimulatedGameDisplay; live game leaves it off. */
  const shouldPulseSubmitMoveButton = React.useMemo(() => false, []);

  /** Top of proposed-move panel: 2/3 submit + 1/3 cancel (side), or horizontal row (wide). */
  const renderProposedMoveSubmitCancelRow = (): React.ReactNode => {
    const isRail = chromeOnSide;
    return (
      <div
        className={
          isRail
            ? "flex w-full min-w-0 shrink-0 flex-row gap-2"
            : "flex w-full min-w-0 shrink-0 flex-row flex-wrap items-center gap-2"
        }
      >
        <>
          {(() => {
            const computedActionType =
              actionOverride != null
                ? actionOverride
                : targetShipId !== null && targetShipId !== 0n
                  ? selectedWeaponType === "special"
                    ? ActionType.Special
                    : ActionType.Shoot
                  : targetShipId === 0n &&
                      selectedWeaponType === "special" &&
                      specialType === 3
                    ? ActionType.Special
                    : ActionType.Pass;

            const computedRow = previewPosition
              ? previewPosition.row
              : (() => {
                  const currentPosition = game.shipPositions.find(
                    (pos) => pos.shipId === selectedShipId,
                  );
                  return currentPosition
                    ? currentPosition.position.row
                    : 0;
                })();
            const computedCol = previewPosition
              ? previewPosition.col
              : (() => {
                  const currentPosition = game.shipPositions.find(
                    (pos) => pos.shipId === selectedShipId,
                  );
                  return currentPosition
                    ? currentPosition.position.col
                    : 0;
                })();

            const submitMoveButtonStyle: React.CSSProperties = {
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-phosphor-green)",
              borderTopColor: "var(--color-phosphor-green)",
              borderLeftColor: "var(--color-phosphor-green)",
              color: "var(--color-phosphor-green)",
              backgroundColor: "var(--color-steel)",
              borderWidth: "2px",
              borderStyle: "solid",
            };

            return (
                <TransactionButton
                  transactionId={`move-ship-${selectedShipId}-${game.metadata.gameId}`}
                  contractAddress={gameContract.address}
                  abi={gameContract.abi}
                  functionName="moveShip"
                  args={[
                    game.metadata.gameId,
                    selectedShipId,
                    computedRow,
                    computedCol,
                    computedActionType,
                    targetShipId || 0n,
                  ]}
                  style={submitMoveButtonStyle}
                  className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150 ${
                    isRail ? "min-w-0 flex-[2] h-full w-full" : ""
                  }${
                    shouldPulseSubmitMoveButton
                      ? " animate-pulse ring-2 ring-yellow-400 ring-offset-2 ring-offset-[var(--color-near-black)]"
                      : ""
                  }`}
                  loadingText="Submitting..."
                  errorText="Error"
                  onTransactionSent={() => {
                    setAwaitingTurnSyncAfterSubmit(true);
                  }}
                  onSuccess={() => {
                    const currentPosition = game.shipPositions.find(
                      (pos) => pos.shipId === selectedShipId,
                    );
                    const oldRow = currentPosition
                      ? currentPosition.position.row
                      : computedRow;
                    const oldCol = currentPosition
                      ? currentPosition.position.col
                      : computedCol;

                    const submittedTargetShipId = targetShipId ?? 0n;

                    setOptimisticLastMove({
                      shipId: selectedShipId!,
                      oldRow,
                      oldCol,
                      newRow:
                        computedActionType === ActionType.Retreat
                          ? -1
                          : computedRow,
                      newCol:
                        computedActionType === ActionType.Retreat
                          ? -1
                          : computedCol,
                      actionType: computedActionType,
                      targetShipId: submittedTargetShipId,
                      timestamp: BigInt(Date.now()),
                    });

                    toast.success("Move submitted successfully!");
                    const moveTime = Date.now();
                    playerMoveTimeRef.current = moveTime;
                    setPlayerMoveTimestamp(moveTime);
                    refetchGame();
                    refetch?.();
                  }}
                  onError={(error) => {
                    setAwaitingTurnSyncAfterSubmit(false);
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
                        "Transaction failed due to gas estimation error",
                      );
                    } else if (errorMessage.includes("execution reverted")) {
                      toast.error(
                        "Transaction reverted - check if it&apos;s your turn and ship is valid",
                      );
                    } else if (errorMessage.includes("NotYourTurn")) {
                      toast.error("It&apos;s not your turn to move");
                    } else if (errorMessage.includes("ShipNotFound")) {
                      toast.error("Ship not found in this game");
                    } else if (errorMessage.includes("InvalidMove")) {
                      toast.error(
                        "Invalid move - check ship position and movement range",
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
                    if (
                      !game.metadata.gameId ||
                      game.metadata.gameId === 0n
                    ) {
                      return "Invalid game ID";
                    }
                    if (!isShipOwnedByCurrentPlayer(selectedShipId)) {
                      return "You can only move your own ships";
                    }
                    if (
                      (computedActionType as ActionType) !==
                      ActionType.Retreat
                    ) {
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
                    }
                    return true;
                  }}
                >
                  {isSelectedShipDisabled ? "Submit Retreat" : "Submit"}
                </TransactionButton>
            );
          })()}
          <button
            type="button"
            onClick={handleCancelMove}
            className={`px-4 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150${
              isRail ? " min-w-0 flex-[1]" : ""
            }`}
            style={
              isRail
                ? {
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
                  }
                : {
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
                  }
            }
            onMouseEnter={
              isRail
                ? undefined
                : (e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-slate)";
                    e.currentTarget.style.borderColor = "var(--color-cyan)";
                    e.currentTarget.style.color = "var(--color-cyan)";
                  }
            }
            onMouseLeave={
              isRail
                ? undefined
                : (e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                    e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                    e.currentTarget.style.color =
                      "var(--color-text-secondary)";
                  }
            }
          >
            Cancel
          </button>
        </>
      </div>
    );
  };

  // Handle Escape key to deselect ship and reset preview position
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        isDisplayingLastMoveRef.current = false;
        lastDisplayedMoveRef.current = null;
        setSelectedShipId(null);
        setPreviewPosition(null);
        setTargetShipId(null);
        // Keep selectedWeaponType so it only changes when player uses the dropdown
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
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
        </div>
        <div className="text-center py-8">
          <p className="text-red-400">
            Error loading game data: {gameError.message}
          </p>
          <button
            onClick={() => refetchGame()}
            className="mt-4 px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor: "var(--color-cyan)",
              color: "var(--color-cyan)",
              backgroundColor: "var(--color-steel)",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-slate)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-steel)";
            }}
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
      <div className="w-full sm:w-[92%] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
            <div
              className="animate-spin h-12 w-12 border-b-2 mx-auto mb-4"
              style={{
                borderColor: "var(--color-cyan)",
                borderRadius: 0, // Square spinner
              }}
            ></div>
            <p className="text-cyan-400 font-mono">Loading ship data...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderProposedMoveActivePanel = (): React.ReactNode => (
    <>
      <div
        className={
          chromeOnSide
            ? "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4"
            : "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4"
        }
      >
        {renderProposedMoveSubmitCancelRow()}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div
            className={
              chromeOnSide
                ? "flex min-h-0 min-w-0 flex-1 flex-col gap-4"
                : "flex min-h-0 min-w-0 flex-1 flex-row items-stretch gap-6"
            }
          >
        <div className="flex min-w-0 flex-shrink-0 flex-col gap-1">
          {(() => {
            const ship = selectedShipId
              ? shipMap.get(selectedShipId)
              : undefined;
            const name =
              ship?.name ||
              (selectedShipId
                ? `Ship #${selectedShipId.toString()}`
                : "Unknown Ship");
            const currentPos = game.shipPositions.find(
              (pos) => pos.shipId === selectedShipId,
            );
            const fromRow = currentPos?.position.row ?? 0;
            const fromCol = currentPos?.position.col ?? 0;
            const toRow = previewPosition ? previewPosition.row : fromRow;
            const toCol = previewPosition ? previewPosition.col : fromCol;
            return (
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-sm font-semibold text-white">{name}</div>
                <div className="text-sm font-mono text-gray-300">
                  ({fromRow}, {fromCol}) → ({toRow}, {toCol})
                </div>
              </div>
            );
          })()}
          {(() => {
            if (isSelectedShipDisabled) return null;
            if (!selectedShipId) return null;
            const ship = shipMap.get(selectedShipId);
            if (!ship || ship.equipment.special <= 0) return null;
            return (
              <div className="mt-1 w-full">
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
                  className="w-full px-3 py-1.5 text-sm uppercase font-semibold tracking-wider"
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
              </div>
            );
          })()}
        </div>

        {!isSelectedShipDisabled && validTargets.length > 0 && (
          <div
            className={
              chromeOnSide
                ? "flex min-h-0 min-w-0 flex-1 flex-col"
                : "min-h-0 flex-1"
            }
          >
            <div
              className={
                chromeOnSide
                  ? "flex min-h-0 min-w-0 flex-1 flex-col border border-solid p-3"
                  : "min-h-[7.5rem] border border-solid p-3"
              }
              style={{
                backgroundColor: "var(--color-near-black)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0,
              }}
            >
              <div
                className="shrink-0 text-xs mb-2 uppercase tracking-wide"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                }}
              >
                Select Target (Optional)
              </div>
              <div className={proposedMoveTargetListClass}>
                {validTargets.map((target) => {
                  const targetShip = shipMap.get(target.shipId);
                  const isSelectedTarget =
                    targetShipId !== null && targetShipId === target.shipId;
                  return (
                    <button
                      key={target.shipId.toString()}
                      type="button"
                      onClick={() => setTargetShipId(target.shipId)}
                      className={proposedMoveTargetBtnClass}
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
                        `#${target.shipId.toString()}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {chromeOnSide &&
          (validTargets.length === 0 || isSelectedShipDisabled) && (
            <div className="min-h-0 min-w-0 flex-1" aria-hidden />
          )}
          </div>
          <button
            type="button"
            onClick={() => {
              setActionOverride(ActionType.Retreat);
              setTargetShipId(null);
              setPreviewPosition(null);
            }}
            className="w-full shrink-0 px-3 py-1.5 text-sm uppercase font-semibold tracking-wider transition-colors duration-150"
            style={{
              fontFamily:
                "var(--font-rajdhani), 'Arial Black', sans-serif",
              borderColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-gunmetal)",
              borderTopColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              borderLeftColor:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-steel)",
              color:
                actionOverride === ActionType.Retreat
                  ? "var(--color-warning-red)"
                  : "var(--color-text-secondary)",
              backgroundColor:
                actionOverride === ActionType.Retreat
                  ? "rgba(255, 77, 77, 0.15)"
                  : "var(--color-slate)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderRadius: 0,
            }}
            onMouseEnter={(e) => {
              if (actionOverride !== ActionType.Retreat) {
                e.currentTarget.style.borderColor = "var(--color-warning-red)";
                e.currentTarget.style.color = "var(--color-warning-red)";
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 77, 77, 0.12)";
              }
            }}
            onMouseLeave={(e) => {
              if (actionOverride !== ActionType.Retreat) {
                e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
                e.currentTarget.style.backgroundColor = "var(--color-slate)";
              }
            }}
          >
            Retreat
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      ref={gameViewRootRef}
      className={`flex flex-col gap-6 ${
        chromeOnSide ? GAME_VIEW_SIDE_ROOT_CLASS : "mx-auto w-full"
      }`}
      style={
        chromeOnSide
          ? {
              marginLeft: "8px",
            }
          : undefined
      }
    >
      <div
        className={
          chromeOnSide
            ? "flex min-h-0 min-w-0 flex-row items-stretch gap-4"
            : "flex flex-col gap-6"
        }
      >
      {/* Header chrome (top bar or left rail) */}
      <div
        className={
          chromeOnSide
            ? "flex min-h-0 self-stretch w-[min(18rem,34vw)] max-w-[20rem] shrink-0 flex-col gap-3 overflow-hidden pl-2 pr-1"
            : "flex items-center justify-between"
        }
      >
        <div
          className={
            chromeOnSide
              ? "flex shrink-0 flex-col items-stretch gap-3"
              : "flex items-center space-x-4"
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="flex w-full min-w-0 items-stretch gap-2">
              <div className="flex w-1/5 min-h-0 shrink-0 justify-start">
                <button
                  onClick={onBack}
                  className="flex min-h-0 w-full items-center justify-center px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
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
              </div>
              <div className="flex min-h-0 w-4/5 min-w-0 flex-col justify-center">
                {game.metadata.winner ===
                  "0x0000000000000000000000000000000000000000" && (
                  <FleeSafetySwitch
                    gameId={game.metadata.gameId}
                    onFlee={() => {
                      toast.success("You have fled the battle!");
                      refetch?.();
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2">
              <div className="w-1/5 shrink-0" aria-hidden />
              <div className="w-4/5 min-w-0 text-right">
                <div className="text-sm text-gray-400">
                  {game.metadata.winner !==
                    "0x0000000000000000000000000000000000000000" && (
                    <span
                      className="uppercase font-bold tracking-wider"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        color:
                          game.metadata.winner === address
                            ? "var(--color-phosphor-green)"
                            : "var(--color-warning-red)",
                      }}
                    >
                      {game.metadata.winner === address ? "VICTORY" : "DEFEAT"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className={
              chromeOnSide ? "flex flex-col gap-2" : "contents"
            }
          >
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
                  !readOnly &&
                  !isMyTurnEffective &&
                  isParticipant &&
                  turnSecondsLeft <= 0;
                const hasExceededTime =
                  !readOnly &&
                  isMyTurnEffective &&
                  isParticipant &&
                  turnSecondsLeft <= 0;

                if (hasExceededTime) {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="text-sm flex items-center gap-2 uppercase font-semibold tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        <span style={{ color: "var(--color-cyan)" }}>
                          YOUR TURN
                        </span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          •
                        </span>
                        <span
                          className="font-mono animate-timeout-soft"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-cyan)",
                          }}
                        >
                          00:00
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
                            className="h-full animate-timeout-bar"
                            style={{
                              width: `100%`,
                              backgroundColor: "var(--color-warning-red)",
                              borderRadius: 0,
                            }}
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
                        <div
                          className="inline-block"
                          style={{
                            fontFamily:
                              "var(--font-rajdhani), 'Arial Black', sans-serif",
                            borderColor: "var(--color-amber)",
                            color: "var(--color-amber)",
                            backgroundColor: "var(--color-steel)",
                            borderWidth: "2px",
                            borderStyle: "solid",
                            borderRadius: 0,
                          }}
                        >
                          <TransactionButton
                            transactionId={`timeout-${game.metadata.gameId.toString()}`}
                            contractAddress={gameContract.address}
                            abi={gameContract.abi}
                            functionName="endGameOnTimeout"
                            args={[game.metadata.gameId]}
                            className="px-3 py-1 uppercase font-semibold tracking-wider transition-colors duration-150 w-full h-full animate-timeout-soft"
                            loadingText="Claiming..."
                            errorText="Failed"
                            onSuccess={() => {
                              toast.success(
                                "Game ended. Opponent forfeited by timeout.",
                              );
                              refetchGame();
                              refetch?.();
                            }}
                          >
                            Claim win (timeout)
                          </TransactionButton>
                        </div>
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
                            className="h-full animate-timeout-bar"
                            style={{
                              width: `100%`,
                              backgroundColor: "var(--color-warning-red)",
                              borderRadius: 0,
                            }}
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
                          color: isMyTurnEffective
                            ? "var(--color-cyan)"
                            : "var(--color-warning-red)",
                        }}
                      >
                        {isMyTurnEffective ? "YOUR TURN" : "OPPONENT'S TURN"}
                      </span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        •
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: isMyTurnEffective
                            ? "var(--color-cyan)"
                            : "var(--color-warning-red)",
                        }}
                      >
                        {formatSeconds(turnSecondsLeft)}
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
                          className="h-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${turnPercentRemaining}%`,
                            backgroundColor: "var(--color-warning-red)",
                            borderRadius: 0,
                          }}
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
          <div
            className={
              chromeOnSide
                ? "w-full shrink-0 border border-solid p-2 text-lg"
                : "ml-6 w-48 border border-solid p-2 text-lg"
            }
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
                  {game.metadata.creator === address
                    ? game.creatorScore?.toString() || "0"
                    : game.joinerScore?.toString() || "0"}
                  /{game.maxScore?.toString() || "0"}
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
                  {game.metadata.creator === address
                    ? game.joinerScore?.toString() || "0"
                    : game.creatorScore?.toString() || "0"}
                  /{game.maxScore?.toString() || "0"}
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Proposed move body lives in the left rail (side chrome), not between rail and map. */}
        {chromeOnSide && isShowingProposedMove && (
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border border-solid p-3"
            style={{
              backgroundColor: "var(--color-near-black)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            {renderProposedMoveActivePanel()}
          </div>
        )}
      </div>

        {/* Move confirmation: stacked layout (wide chrome), matches SimulatedGameDisplay. */}
        {!chromeOnSide && isShowingProposedMove && (
          <div
            className="min-h-0 flex-1 border border-solid p-3"
            style={{
              backgroundColor: "var(--color-near-black)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
              borderRadius: 0,
            }}
          >
            {renderProposedMoveActivePanel()}
          </div>
        )}

      {/* Game map: same stack as tutorial (GameBoardLayout + 17×11 aspect clip). */}
      <div
        className={
          chromeOnSide
            ? "relative min-h-0 min-w-0 flex-1"
            : "relative w-full"
        }
      >
        <GameBoardLayout
          isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
          containerRef={gridContainerRef}
          onBoardChromeMouseDown={handleCancelMove}
          rightControls={
            game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" ? (
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDebug}
                    onChange={(e) => setShowDebug(e.target.checked)}
                    className="w-4 h-4"
                    style={{
                      accentColor: "var(--color-cyan)",
                      borderColor: "var(--color-cyan)",
                      backgroundColor: "var(--color-near-black)",
                      borderRadius: 0,
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      width: "16px",
                      height: "16px",
                      border: "2px solid",
                    }}
                  />
                  <span>Show Debug</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disableTooltips}
                    onChange={(e) => setDisableTooltips(e.target.checked)}
                    className="w-4 h-4"
                    style={{
                      accentColor: "var(--color-cyan)",
                      borderColor: "var(--color-cyan)",
                      backgroundColor: "var(--color-near-black)",
                      borderRadius: 0,
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      width: "16px",
                      height: "16px",
                      border: "2px solid",
                    }}
                  />
                  <span>Disable Tooltips</span>
                </label>
                <button
                  onClick={() => {
                    refetchGame();
                  }}
                  className="px-2 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-slate)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                  }}
                >
                  Test Refetch
                </button>
                <button
                  onClick={() => {
                    globalGameRefetchFunctions.forEach((refetchFn) => {
                      refetchFn();
                    });
                  }}
                  className="px-2 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-phosphor-green)",
                    color: "var(--color-phosphor-green)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-slate)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                  }}
                >
                  Test Events
                </button>
              </div>
            ) : undefined
          }
        >
          <div
            className="relative w-full"
            style={{ aspectRatio: `${GRID_WIDTH} / ${GRID_HEIGHT}` }}
          >
            <div className="absolute inset-0 min-h-0 overflow-hidden">
              <GameGrid
                grid={grid}
                allShipPositions={game.shipPositions}
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
                labelTargets={labelTargets}
                assistableTargets={assistableTargets}
                assistableTargetsFromStart={assistableTargetsFromStart}
                dragShootingRange={dragShootingRange}
                dragValidTargets={dragValidTargets}
                isCurrentPlayerTurn={!readOnly && isMyTurnEffective}
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
                lastMoveShipId={lastMoveShipId}
                lastMoveOldPosition={lastMoveOldPosition}
                lastMoveNewPosition={lastMoveNewPosition}
                lastMoveActionType={lastMoveActionType}
                lastMoveTargetShipId={lastMoveTargetShipId}
                lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
                retreatPrepShipId={retreatPrepShipId}
                retreatPrepIsCreator={retreatPrepIsCreator}
                setSelectedShipId={setSelectedShipId}
                setPreviewPosition={setPreviewPosition}
                setTargetShipId={setTargetShipId}
                setSelectedWeaponType={setSelectedWeaponType}
                setHoveredCell={setHoveredCell}
                setDraggedShipId={setDraggedShipId}
                setDragOverCell={setDragOverCell}
              />
            </div>
            <div className="absolute bottom-0 right-0 z-[220] pointer-events-none">
              <div className="pointer-events-auto">
                {isLastMovePanelMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsLastMovePanelMinimized(false)}
                    className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-xs transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                      borderColor: "var(--color-purple, #a855f7)",
                      color: "var(--color-purple, #d8b4fe)",
                      backgroundColor: "rgba(10, 10, 15, 0.88)",
                      borderRadius: 0,
                    }}
                  >
                    Last Move
                  </button>
                ) : (
                  <div className="w-[min(30rem,70vw)] max-w-full">
                    <div className="mb-1 flex items-center justify-between border border-solid px-2 py-1 bg-black/80">
                      <span
                        className="text-xs uppercase tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color: "var(--color-purple, #d8b4fe)",
                        }}
                      >
                        Last Move
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLastMovePanelMinimized(true)}
                        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          borderColor: "var(--color-purple, #a855f7)",
                          color: "var(--color-purple, #d8b4fe)",
                          backgroundColor: "var(--color-near-black)",
                          borderRadius: 0,
                        }}
                      >
                        Minimize
                      </button>
                    </div>
                    <GameEvents
                      lastMove={
                        selectedShipId !== null ? undefined : displayedLastMove
                      }
                      shipMap={shipMap}
                      address={address}
                      appendDestroyedText={appendDestroyedTextToLastMove}
                      debugSuffix={lastMoveTargetPositionDebugSuffix}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </GameBoardLayout>
      </div>
      </div>

      {/* Ship Details */}
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
          {/* Determine order based on player: creator has My Fleet left, joiner has Opponent's Fleet left */}
          {game.metadata.creator === address ? (
            <>
              {/* My Fleet - Left for creator */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-cyan)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Creator Fleet" : "My Fleet"}
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
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
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
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Opponent's Fleet - Right for creator */}
              <div>
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-warning-red)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Joiner Fleet" : "Opponent&apos;s Fleet"}
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
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
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
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-warning-red)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Creator Fleet" : "Opponent&apos;s Fleet"}
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
                    ({game.metadata.creator})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.creatorActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
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
                <h4
                  className="mb-3 uppercase font-bold tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-cyan)",
                    fontSize: "18px",
                  }}
                >
                  {readOnly ? "Joiner Fleet" : "My Fleet"}
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
                    ({game.metadata.joiner})
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {game.joinerActiveShipIds.map((shipId) => {
                    const shipPosition = game.shipPositions.find(
                      (sp) => sp.shipId === shipId,
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

