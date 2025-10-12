"use client";

import React, { useState, useEffect } from "react";
import { GRID_DIMENSIONS, MapPosition, ScoringPosition } from "../types/types";
import {
  useGetPresetMap,
  useGetPresetScoringMap,
} from "../hooks/useMapsContract";
import { ShipImage } from "./ShipImage";

interface MapDisplayProps {
  mapId: number;
  className?: string;
  showPlayerOverlay?: boolean;
  isCreator?: boolean;
  shipPositions?: Array<{ shipId: bigint; row: number; col: number }>;
  ships?: Array<{ id: bigint; name: string; imageUrl?: string }>;
}

export function MapDisplay({
  mapId,
  className = "",
  showPlayerOverlay = false,
  isCreator = false,
  shipPositions = [],
  ships = [],
}: MapDisplayProps) {
  // Only fetch map data if mapId is valid
  const { data: blockedPositions } = useGetPresetMap(mapId);
  const { data: scoringPositions } = useGetPresetScoringMap(mapId);

  // Map state
  const [mapState, setMapState] = useState(() => {
    const blockedTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
    const scoringTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0));
    const onlyOnceTiles = Array(GRID_DIMENSIONS.HEIGHT)
      .fill(null)
      .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));

    return {
      blockedTiles,
      scoringTiles,
      onlyOnceTiles,
    };
  });

  // Load map data when fetched
  useEffect(() => {
    if (mapId > 0 && blockedPositions && scoringPositions) {
      // Initialize arrays
      const newBlockedTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));
      const newScoringTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(0));
      const newOnlyOnceTiles = Array(GRID_DIMENSIONS.HEIGHT)
        .fill(null)
        .map(() => Array(GRID_DIMENSIONS.WIDTH).fill(false));

      // Set blocked positions
      if (Array.isArray(blockedPositions)) {
        blockedPositions.forEach((pos: MapPosition) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_DIMENSIONS.HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_DIMENSIONS.WIDTH
          ) {
            newBlockedTiles[pos.row][pos.col] = true;
          }
        });
      }

      // Set scoring positions
      if (Array.isArray(scoringPositions)) {
        scoringPositions.forEach((pos: ScoringPosition) => {
          if (
            pos.row >= 0 &&
            pos.row < GRID_DIMENSIONS.HEIGHT &&
            pos.col >= 0 &&
            pos.col < GRID_DIMENSIONS.WIDTH
          ) {
            newScoringTiles[pos.row][pos.col] = pos.points;
            newOnlyOnceTiles[pos.row][pos.col] = pos.onlyOnce;
          }
        });
      }

      setMapState({
        blockedTiles: newBlockedTiles,
        scoringTiles: newScoringTiles,
        onlyOnceTiles: newOnlyOnceTiles,
      });
    }
  }, [mapId, blockedPositions, scoringPositions]);

  // Helper function to get ship at a position
  const getShipAtPosition = (row: number, col: number) => {
    if (!shipPositions || !ships) return null;

    const position = shipPositions.find(
      (pos) => pos.row === row && pos.col === col
    );
    if (!position || !position.shipId) return null;

    const ship = ships.find((ship) => ship.id === position.shipId);
    if (!ship || !ship.id) return null;

    // Debug logging for first few calls
    if (row === 0 && col === 0) {
      console.log("Checking position (0,0):", {
        shipPositions,
        ships: ships.map((s) => ({ id: s.id.toString(), name: s.name })),
        position,
        ship,
      });
    }

    return ship;
  };

  // Get tile class based on state
  const getTileClass = (row: number, col: number) => {
    // Bounds checking to prevent errors
    if (
      row < 0 ||
      row >= GRID_DIMENSIONS.HEIGHT ||
      col < 0 ||
      col >= GRID_DIMENSIONS.WIDTH ||
      !mapState.blockedTiles[row] ||
      !mapState.scoringTiles[row] ||
      !mapState.onlyOnceTiles[row]
    ) {
      return "w-full h-full aspect-square border-0 outline outline-1 outline-gray-600 bg-gray-900";
    }

    const isBlocked = mapState.blockedTiles[row][col];
    const scoreValue = mapState.scoringTiles[row][col];
    const isOnlyOnce = mapState.onlyOnceTiles[row][col];

    let baseClass = "w-full h-full aspect-square";

    // Set border thickness based on blocking status
    if (isBlocked) {
      baseClass += " border-0 shadow-[inset_0_0_0_2px_rgb(168,85,247)]";
    } else {
      baseClass += " border-0 outline outline-1 outline-gray-600";
    }

    // Set background color based on scoring status
    if (scoreValue > 0) {
      if (isOnlyOnce) {
        baseClass += " bg-yellow-400"; // Gold for once-only
      } else {
        baseClass += " bg-blue-400"; // Cornflower blue for reusable
      }
    } else {
      // Empty
      baseClass += " bg-gray-900";
    }

    return baseClass;
  };

  if (mapId <= 0) {
    return (
      <div
        className={`bg-gray-900 rounded-lg w-full flex items-center justify-center p-8 ${className}`}
      >
        <div className="text-gray-400 text-center">
          <p>No map selected</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-900 rounded-lg relative w-full h-full flex items-center justify-center ${className}`}
    >
      <div
        className="w-full"
        style={{
          aspectRatio: `${GRID_DIMENSIONS.WIDTH} / ${GRID_DIMENSIONS.HEIGHT}`,
        }}
      >
        <div
          key={`map-display-${mapId}-${mapState.blockedTiles.length}-${mapState.scoringTiles.length}`}
          className="grid relative gap-0 grid-cols-[repeat(25,1fr)] grid-rows-[repeat(13,1fr)] w-full h-full"
        >
          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={getTileClass(row, col)}
                  title={`Row: ${row}, Col: ${col}${
                    mapState.blockedTiles[row][col] ? ", Blocked (LOS)" : ""
                  }${
                    mapState.scoringTiles[row][col] > 0
                      ? `, Score: ${mapState.scoringTiles[row][col]}${
                          mapState.onlyOnceTiles[row][col]
                            ? " (once only)"
                            : " (reusable)"
                        }`
                      : ""
                  }`}
                >
                  {/* Score value display */}
                  {mapState.scoringTiles[row][col] > 0 && (
                    <div
                      className={`flex items-center justify-center text-lg font-bold text-black w-full h-full`}
                    >
                      {mapState.scoringTiles[row][col]}
                    </div>
                  )}

                  {/* Ship display */}
                  {(() => {
                    const ship = getShipAtPosition(row, col);
                    if (!ship || !ship.id) return null;

                    return (
                      <ShipImage
                        ship={ship}
                        className="w-full h-full object-contain"
                      />
                    );
                  })()}
                </div>
              ))}
            </div>
          ))}

          {/* Grid reference lines overlay */}
          <div className="absolute pointer-events-none inset-0">
            {/* Vertical reference lines */}
            {/* Center column edges (left and right of column 12) */}
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(12 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />

            {/* Red emphasis lines */}
            <div
              className="absolute bg-red-400"
              style={{
                left: `${(5 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-red-400"
              style={{
                left: `${(20 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />

            {/* Every 5 columns from center */}
            {[7, 2, 18, 23].map((col) => (
              <div
                key={`v-${col}`}
                className="absolute bg-blue-200"
                style={{
                  left: `${(col / GRID_DIMENSIONS.WIDTH) * 100}%`,
                  top: 0,
                  width: "1px",
                  height: "100%",
                  transform: "translateX(-50%)",
                  opacity: 0.6,
                }}
              />
            ))}

            {/* Horizontal reference lines */}
            {/* Center row edges (top and bottom of row 6) */}
            <div
              className="absolute bg-blue-400"
              style={{
                left: 0,
                top: `${(6 / GRID_DIMENSIONS.HEIGHT) * 100}%`,
                width: "100%",
                height: "2px",
                transform: "translateY(-50%)",
              }}
            />
            <div
              className="absolute bg-blue-400"
              style={{
                left: 0,
                top: `${(7 / GRID_DIMENSIONS.HEIGHT) * 100}%`,
                width: "100%",
                height: "2px",
                transform: "translateY(-50%)",
              }}
            />

            {/* Every 5 rows from center */}
            {[1, 12].map((row) => (
              <div
                key={`h-${row}`}
                className="absolute bg-blue-200"
                style={{
                  left: 0,
                  top: `${(row / GRID_DIMENSIONS.HEIGHT) * 100}%`,
                  width: "100%",
                  height: "1px",
                  transform: "translateY(-50%)",
                  opacity: 0.6,
                }}
              />
            ))}
          </div>

          {/* Player-specific overlay */}
          {showPlayerOverlay && (
            <div className="absolute pointer-events-none inset-0">
              {isCreator ? (
                /* Creator overlay - left 5 columns */
                <div
                  className="absolute bg-blue-400"
                  style={{
                    left: 0,
                    top: 0,
                    width: `${(5 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    opacity: 0.2,
                  }}
                />
              ) : (
                /* Joiner overlay - right 5 columns */
                <div
                  className="absolute bg-blue-400"
                  style={{
                    right: 0,
                    top: 0,
                    width: `${(5 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    opacity: 0.2,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
