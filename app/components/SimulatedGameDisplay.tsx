"use client";

import React, { useState, useMemo, useCallback } from "react";
import defaultMap from "../../public/default_map.json";
import { TutorialContextValue } from "../types/onboarding";
import { ALL_TUTORIAL_SHIPS } from "../data/tutorialShips";
import { ShipImage } from "./ShipImage";
import { toast } from "react-hot-toast";
import { ActionType } from "../types/types";

interface SimulatedGameDisplayProps {
  tutorialContext: TutorialContextValue;
}

const GRID_WIDTH = 25;
const GRID_HEIGHT = 13;

export function SimulatedGameDisplay({ tutorialContext }: SimulatedGameDisplayProps) {
  const { gameState, currentStep, validateAction, executeAction } = tutorialContext;

  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);

  // Map of shipId to ship object
  const shipMap = useMemo(() => {
    return new Map(ALL_TUTORIAL_SHIPS.map((ship) => [ship.id, ship]));
  }, []);

  // Map of cell key to ship position info
  const cellPositionMap = useMemo(() => {
    const map = new Map<string, (typeof gameState.shipPositions)[number]>();
    gameState.shipPositions.forEach((pos) => {
      map.set(`${pos.position.row}-${pos.position.col}`, pos);
    });
    return map;
  }, [gameState.shipPositions]);

  const allowedSelectShips = useMemo(() => {
    return new Set(currentStep?.allowedActions.selectShip || []);
  }, [currentStep]);

  const allowedMoveShipId = currentStep?.allowedActions.moveShip?.shipId ?? null;
  const allowedMovePositions = useMemo(() => {
    if (!currentStep?.allowedActions.moveShip) return new Set<string>();
    return new Set(
      currentStep.allowedActions.moveShip.allowedPositions.map(
        (pos) => `${pos.row}-${pos.col}`
      )
    );
  }, [currentStep]);

  const allowedShootTargets = useMemo(() => {
    if (!currentStep?.allowedActions.shoot) return new Set<bigint>();
    return new Set(currentStep.allowedActions.shoot.allowedTargets);
  }, [currentStep]);

  const allowedSpecialTargets = useMemo(() => {
    if (!currentStep?.allowedActions.useSpecial) return new Set<bigint>();
    return new Set(currentStep.allowedActions.useSpecial.allowedTargets);
  }, [currentStep]);

  const allowedAssistTargets = useMemo(() => {
    if (!currentStep?.allowedActions.assist) return new Set<bigint>();
    return new Set(currentStep.allowedActions.assist.allowedTargets);
  }, [currentStep]);

  const highlightPositions = useMemo(() => {
    return new Set(
      currentStep?.highlightElements?.mapPositions?.map(
        (pos) => `${pos.row}-${pos.col}`
      ) || []
    );
  }, [currentStep]);

  const highlightShips = useMemo(() => {
    return new Set(currentStep?.highlightElements?.ships || []);
  }, [currentStep]);

  const handleShipSelect = useCallback(
    (shipId: bigint) => {
      if (selectedShipId && selectedShipId !== shipId) {
        if (
          currentStep?.allowedActions.shoot &&
          selectedShipId === currentStep.allowedActions.shoot.shipId &&
          allowedShootTargets.has(shipId)
        ) {
          const validation = validateAction({
            type: "shoot",
            shipId: selectedShipId,
            targetShipId: shipId,
          });
          if (validation.valid) {
            executeAction({
              type: "shoot",
              shipId: selectedShipId,
              targetShipId: shipId,
              actionType: ActionType.Shoot,
            });
            setSelectedShipId(null);
            return;
          }
        }

        if (
          currentStep?.allowedActions.useSpecial &&
          selectedShipId === currentStep.allowedActions.useSpecial.shipId &&
          allowedSpecialTargets.has(shipId)
        ) {
          const validation = validateAction({
            type: "useSpecial",
            shipId: selectedShipId,
            targetShipId: shipId,
            specialType: currentStep.allowedActions.useSpecial.specialType,
          });
          if (validation.valid) {
            executeAction({
              type: "useSpecial",
              shipId: selectedShipId,
              targetShipId: shipId,
              actionType: ActionType.Special,
            });
            setSelectedShipId(null);
            return;
          }
        }

        if (
          currentStep?.allowedActions.assist &&
          selectedShipId === currentStep.allowedActions.assist.shipId &&
          allowedAssistTargets.has(shipId)
        ) {
          const validation = validateAction({
            type: "assist",
            shipId: selectedShipId,
            targetShipId: shipId,
          });
          if (validation.valid) {
            executeAction({
              type: "assist",
              shipId: selectedShipId,
              targetShipId: shipId,
              actionType: ActionType.Assist,
            });
            setSelectedShipId(null);
            return;
          }
        }
      }

      const validation = validateAction({ type: "selectShip", shipId });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      setSelectedShipId(shipId);
      executeAction({ type: "selectShip", shipId });
    },
    [selectedShipId, currentStep, validateAction, executeAction, allowedShootTargets, allowedSpecialTargets, allowedAssistTargets]
  );

  const handleMove = useCallback(
    (row: number, col: number) => {
      if (!selectedShipId) return;
      const validation = validateAction({
        type: "moveShip",
        shipId: selectedShipId,
        position: { row, col },
      });
      if (!validation.valid) {
        toast.error(validation.message || "Action not allowed");
        return;
      }

      executeAction({
        type: "moveShip",
        shipId: selectedShipId,
        position: { row, col },
        actionType: ActionType.Pass,
      });
      setSelectedShipId(null);
    },
    [selectedShipId, validateAction, executeAction]
  );

  const renderCell = (row: number, col: number, cellIndex: number) => {
    const cellKey = `${row}-${col}`;
    const shipPosition = cellPositionMap.get(cellKey);
    const shipId = shipPosition?.shipId ?? null;
    const ship = shipId ? shipMap.get(shipId) : undefined;
    const isHighlighted = highlightPositions.has(cellKey);
    const isAllowedMoveCell =
      selectedShipId &&
      allowedMoveShipId === selectedShipId &&
      allowedMovePositions.has(cellKey) &&
      !shipId;
    const isSelectable = shipId
      ? allowedSelectShips.size === 0 || allowedSelectShips.has(shipId)
      : false;
    const isTargetable =
      shipId &&
      (allowedShootTargets.has(shipId) ||
        allowedSpecialTargets.has(shipId) ||
        allowedAssistTargets.has(shipId));

    const isBlocked = !!defaultMap.blockedTiles?.[row]?.[col];
    let baseBg = "bg-gray-900";
    if (isBlocked) {
      baseBg = "bg-gray-800";
    } else if (
      Array.isArray(defaultMap.scoringTiles) &&
      defaultMap.scoringTiles[row] &&
      defaultMap.scoringTiles[row][col] > 0
    ) {
      baseBg =
        defaultMap.onlyOnceTiles?.[row]?.[col]
          ? "bg-blue-500/30"
          : "bg-yellow-500/20";
    }

    let cellClasses = `relative w-full h-full border border-gray-800 ${baseBg} flex items-center justify-center transition-colors`;

    if (isAllowedMoveCell) {
      cellClasses += " cursor-pointer hover:bg-cyan-500/30";
    } else if (!shipId) {
      cellClasses += " cursor-default";
    } else if (isSelectable) {
      cellClasses += " cursor-pointer";
    } else {
      cellClasses += " cursor-not-allowed opacity-70";
    }

    if (isHighlighted) {
      cellClasses += " ring-2 ring-yellow-400";
    }

    if (selectedShipId && shipId === selectedShipId) {
      cellClasses += " ring-2 ring-cyan-400";
    } else if (shipId && highlightShips.has(shipId)) {
      cellClasses += " ring-2 ring-amber-300";
    }

    const handleClick = () => {
      if (shipId) {
        handleShipSelect(shipId);
        return;
      }

      if (isAllowedMoveCell) {
        handleMove(row, col);
      }
    };

    return (
      <div key={cellKey} className={cellClasses} onClick={handleClick}>
        {isAllowedMoveCell && (
          <div className="absolute inset-1 border-2 border-cyan-400 border-dashed rounded pointer-events-none" />
        )}
        {isTargetable && (
          <div className="absolute inset-1 border-2 border-red-400 rounded pointer-events-none animate-pulse" />
        )}
        {ship && (
          <ShipImage
            ship={ship}
            className={`max-w-full max-h-full object-contain ${
              shipPosition?.isCreator ? "" : "scale-x-[-1]"
            }`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen p-4">
      <div className="mb-4 bg-black/40 border border-cyan-400 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-300 font-mono">Tutorial Game</h1>
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

      <div className="bg-gray-900 rounded-lg p-2 border border-gray-700 shadow-lg">
        <div className="w-full px-2">
          <div className="grid gap-0 border border-gray-900 grid-cols-[repeat(25,1fr)] grid-rows-[repeat(13,1fr)] w-full">
            {Array.from({ length: GRID_HEIGHT }, (_, row) =>
              Array.from({ length: GRID_WIDTH }, (_, col) =>
                renderCell(row, col, row * GRID_WIDTH + col)
              )
            )}
          </div>
        </div>
      </div>

      {selectedShipId && (
        <div className="mt-4 bg-black/40 border border-cyan-400 rounded-lg p-4">
          <p className="text-cyan-300 font-mono">
            Selected Ship:{" "}
            {shipMap.get(selectedShipId)?.name || selectedShipId.toString()}
          </p>
          {currentStep?.allowedActions.moveShip &&
            allowedMoveShipId === selectedShipId && (
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
