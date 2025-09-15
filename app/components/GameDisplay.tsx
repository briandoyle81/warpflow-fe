"use client";

import React from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { Game, ShipPosition, Attributes } from "../types/types";
import { useShipsByIds } from "../hooks/useShipsByIds";
import { ShipImage } from "./ShipImage";
import { useGetGameMapState } from "../hooks/useMapsContract";

interface GameDisplayProps {
  game: Game;
  onBack: () => void;
}

const GameDisplay: React.FC<GameDisplayProps> = ({ game, onBack }) => {
  const { address } = useAccount();

  // Grid dimensions from the contract
  const GRID_WIDTH = 40;
  const GRID_HEIGHT = 20;

  // Get game map state directly from the Maps contract
  const { data: gameMapState, isLoading: mapLoading } = useGetGameMapState(
    Number(game.metadata.gameId)
  );

  // Debug logging (can be removed in production)
  console.log("Game Map State:", gameMapState);
  console.log("Map Loading:", mapLoading);

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

  // Create a 2D array to represent the grid
  const grid: (ShipPosition | null)[][] = Array(GRID_HEIGHT)
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
      grid[position.row][position.col] = shipPosition;
    }
  });

  // Get ship attributes by ship ID
  const getShipAttributes = (shipId: bigint): Attributes | null => {
    // Find the ship in the shipAttributes array
    // Note: The contract returns shipAttributes as a combined array
    // We need to find the right index based on shipId
    const shipIndex = game.creatorActiveShipIds.findIndex(
      (id) => id === shipId
    );
    if (shipIndex !== -1) {
      return game.shipAttributes[shipIndex];
    }

    const joinerIndex = game.joinerActiveShipIds.findIndex(
      (id) => id === shipId
    );
    if (joinerIndex !== -1) {
      return game.shipAttributes[
        game.creatorActiveShipIds.length + joinerIndex
      ];
    }

    return null;
  };

  // Check if it's the current player's turn
  const isMyTurn = game.turnState.currentTurn === address;

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
          <h1 className="text-2xl font-mono text-white">
            Game #{game.metadata.gameId.toString()}
          </h1>
        </div>

        {/* Game Status */}
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {game.metadata.winner ===
            "0x0000000000000000000000000000000000000000" ? (
              <span className="text-yellow-400">
                {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
            ) : (
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
          <div className="text-xs text-gray-500">
            Round {game.turnState.currentRound.toString()}
          </div>
        </div>
      </div>

      {/* Game Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-mono mb-2">Scores</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Creator:</span>
              <span className="text-white">{game.creatorScore.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Joiner:</span>
              <span className="text-white">{game.joinerScore.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Score:</span>
              <span className="text-white">{game.maxScore.toString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-mono mb-2">Players</h3>
          <div className="space-y-1">
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

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-mono mb-2">Game Info</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Lobby ID:</span>
              <span className="text-white">
                {game.metadata.lobbyId.toString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Started:</span>
              <span className="text-white">
                {new Date(
                  Number(game.metadata.startedAt) * 1000
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Map */}
      <div className="bg-gray-900 rounded-lg p-2 border border-gray-700 w-full">
        <h3 className="text-white font-mono mb-4">Battle Map</h3>

        {/* Map Grid */}
        <div className="w-full flex justify-center">
          <div
            className="grid gap-0 border border-gray-900"
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
              width: "min(95vw, 1800px)",
              height: "min(47.5vw, 900px)", // 20/40 * width for aspect ratio
              minWidth: "1200px",
              minHeight: "600px",
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const ship = cell ? shipMap.get(cell.shipId) : null;

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="w-full h-full border border-gray-900 bg-gray-950 relative"
                    title={
                      cell
                        ? `Ship ${cell.shipId.toString()} (${
                            cell.isCreator ? "Creator" : "Joiner"
                          })`
                        : onlyOnceGrid[rowIndex][colIndex]
                        ? `Crystal Deposit: ${scoringGrid[rowIndex][colIndex]} points (only once) (${rowIndex}, ${colIndex})`
                        : scoringGrid[rowIndex][colIndex] > 0
                        ? `Gold Deposit: ${scoringGrid[rowIndex][colIndex]} points (${rowIndex}, ${colIndex})`
                        : blockedGrid[rowIndex][colIndex]
                        ? `Blocked Line of Sight (${rowIndex}, ${colIndex})`
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

                    {cell && ship ? (
                      <div className="w-full h-full relative z-10">
                        <ShipImage
                          ship={ship}
                          className={`w-full h-full ${
                            cell.isCreator ? "scale-x-[-1]" : ""
                          }`}
                          showLoadingState={true}
                        />
                        {/* Team indicator overlay */}
                        <div
                          className={`absolute top-0 ${
                            cell.isCreator ? "left-0" : "right-0"
                          } w-2 h-2 rounded-full ${
                            cell.isCreator ? "bg-blue-500" : "bg-red-500"
                          }`}
                        />
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
        </div>
      </div>

      {/* Ship Details */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 w-full">
        <h3 className="text-white font-mono mb-4">Ship Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Creator Ships */}
          <div>
            <h4 className="text-blue-400 font-mono mb-2">Creator Fleet</h4>
            <div className="space-y-2">
              {game.creatorActiveShipIds.map((shipId) => {
                const shipPosition = game.shipPositions.find(
                  (sp) => sp.shipId === shipId
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(shipId);

                if (!shipPosition || !attributes) return null;

                return (
                  <div
                    key={shipId.toString()}
                    className="bg-gray-800 rounded p-3 border border-gray-700"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {ship && (
                        <div className="w-12 h-12 flex-shrink-0">
                          <ShipImage
                            ship={ship}
                            className="w-full h-full"
                            showLoadingState={true}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-mono text-sm">
                            Ship #{shipId.toString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({shipPosition.position.row},{" "}
                            {shipPosition.position.col})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-white ml-1">
                          {attributes.gunDamage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Movement:</span>
                        <span className="text-white ml-1">
                          {attributes.movement}
                        </span>
                      </div>
                    </div>
                    {attributes.reactorCriticalTimer > 0 && (
                      <div className="mt-2 text-xs text-red-400">
                        Reactor Critical: {attributes.reactorCriticalTimer}/3
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Joiner Ships */}
          <div>
            <h4 className="text-red-400 font-mono mb-2">Joiner Fleet</h4>
            <div className="space-y-2">
              {game.joinerActiveShipIds.map((shipId) => {
                const shipPosition = game.shipPositions.find(
                  (sp) => sp.shipId === shipId
                );
                const attributes = getShipAttributes(shipId);
                const ship = shipMap.get(shipId);

                if (!shipPosition || !attributes) return null;

                return (
                  <div
                    key={shipId.toString()}
                    className="bg-gray-800 rounded p-3 border border-gray-700"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {ship && (
                        <div className="w-12 h-12 flex-shrink-0">
                          <ShipImage
                            ship={ship}
                            className="w-full h-full"
                            showLoadingState={true}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-mono text-sm">
                            Ship #{shipId.toString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({shipPosition.position.row},{" "}
                            {shipPosition.position.col})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-white ml-1">
                          {attributes.gunDamage}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Movement:</span>
                        <span className="text-white ml-1">
                          {attributes.movement}
                        </span>
                      </div>
                    </div>
                    {attributes.reactorCriticalTimer > 0 && (
                      <div className="mt-2 text-xs text-red-400">
                        Reactor Critical: {attributes.reactorCriticalTimer}/3
                      </div>
                    )}
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
