"use client";

import React, { useState, useEffect } from "react";
import {
  GRID_DIMENSIONS,
  MapPosition,
  ScoringPosition,
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";
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
  shipAttributes?: Array<any>;
  selectedShipId?: bigint | null;
  onShipSelect?: (shipId: bigint) => void;
  onShipMove?: (shipId: bigint, row: number, col: number) => void;
}

export function MapDisplay({
  mapId,
  className = "",
  showPlayerOverlay = false,
  isCreator = false,
  shipPositions = [],
  ships = [],
  shipAttributes = [],
  selectedShipId = null,
  onShipSelect,
  onShipMove,
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

  // Create a map of ship ID to ship object for quick lookup
  const shipMap = React.useMemo(() => {
    const map = new Map<bigint, any>();
    ships.forEach((ship) => {
      map.set(ship.id, ship);
    });
    return map;
  }, [ships]);

  // Helper function to get ship at a position
  const getShipAtPosition = (row: number, col: number) => {
    if (!shipPositions || !ships) return null;

    const position = shipPositions.find(
      (pos) => pos.row === row && pos.col === col
    );
    if (!position || !position.shipId) return null;

    const ship = shipMap.get(position.shipId);
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

  // Helper function to get ship attributes
  const getShipAttributes = (shipId: bigint) => {
    if (!shipAttributes || !ships) return null;

    const shipIndex = ships.findIndex((ship) => ship.id === shipId);
    if (shipIndex === -1 || !shipAttributes[shipIndex]) return null;

    return shipAttributes[shipIndex];
  };

  // Helper to validate allowed deployment columns based on player role
  const isValidShipPosition = (row: number, col: number) => {
    // Boundaries
    if (
      row < 0 ||
      row >= GRID_DIMENSIONS.HEIGHT ||
      col < 0 ||
      col >= GRID_DIMENSIONS.WIDTH
    ) {
      return false;
    }

    // Creator may place in left 5 columns; joiner in right 5 columns
    return isCreator
      ? col >= 0 && col <= 4
      : col >= GRID_DIMENSIONS.WIDTH - 5 && col < GRID_DIMENSIONS.WIDTH;
  };

  // Helper function to create ship tooltip
  const createShipTooltip = (ship: any, row: number, col: number) => {
    if (!ship) return `Row: ${row}, Col: ${col}`;

    const attributes = getShipAttributes(ship.id);
    const shipName = ship.name || "Unknown Ship";
    const fleetType = isCreator ? "My Fleet" : "Enemy Fleet";
    const isSelected = selectedShipId === ship.id;

    const gunName =
      ship.equipment?.mainWeapon !== undefined
        ? getMainWeaponName(ship.equipment.mainWeapon)
        : "Unknown";
    const defenseLabel = ship.equipment?.shields > 0 ? "Shield" : "Armor";
    const defenseName =
      ship.equipment?.shields > 0
        ? getShieldName(ship.equipment.shields)
        : getArmorName(ship.equipment?.armor ?? 0);
    const specialName =
      ship.equipment?.special !== undefined
        ? getSpecialName(ship.equipment.special)
        : "Unknown";

    let tooltip = `${shipName} (${fleetType})${
      isSelected ? " (Selected)" : ""
    }`;

    if (attributes) {
      tooltip += `
Attributes:
• Gun: ${gunName}
• ${defenseLabel}: ${defenseName}
• Special: ${specialName}
• Movement: ${attributes.movement}
• Range: ${attributes.range}
• Gun Damage: ${attributes.gunDamage}
• Hull: ${attributes.hullPoints}/${attributes.maxHullPoints}
• Damage Reduction: ${attributes.damageReduction}
• Reactor Critical: ${attributes.reactorCriticalTimer}/3`;
    } else {
      tooltip += `
Attributes: Loading...`;
    }

    return tooltip;
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (!onShipSelect || !onShipMove) return;

    const ship = getShipAtPosition(row, col);

    if (ship) {
      // Clicked on a ship - select it
      onShipSelect(ship.id);
    } else if (selectedShipId && isValidShipPosition(row, col)) {
      // Clicked on empty valid position with ship selected - move ship
      onShipMove(selectedShipId, row, col);
    }
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
      return "w-full h-full border-0 outline outline-1 outline-gray-600 bg-gray-900 cursor-pointer";
    }

    const isBlocked = mapState.blockedTiles[row][col];
    const scoreValue = mapState.scoringTiles[row][col];
    const isOnlyOnce = mapState.onlyOnceTiles[row][col];
    const ship = getShipAtPosition(row, col);
    const isSelected = ship && selectedShipId && ship.id === selectedShipId;

    let baseClass = "w-full h-full cursor-pointer relative";

    // If selected, use a high-contrast gold inset border that shows on all sides
    if (isSelected) {
      // Subtle gold wash for visibility + strong inset gold border
      baseClass += " bg-yellow-400/10 shadow-[inset_0_0_0_3px_rgb(250,204,21)]"; // yellow-400
    } else {
      // Set border thickness based on blocking status when not selected
      if (isBlocked) {
        baseClass += " border-0 shadow-[inset_0_0_0_2px_rgb(168,85,247)]"; // purple-500
      } else {
        baseClass += " border-0 outline outline-1 outline-gray-600";
      }
    }

    // Set background color based on scoring status
    if (scoreValue > 0) {
      if (isOnlyOnce) {
        baseClass += " bg-blue-400"; // Cornflower blue for once-only
      } else {
        baseClass += " bg-yellow-400"; // Gold for reusable
      }
    } else if (!isSelected) {
      // Empty (do not override the selection background)
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
          {/* Player-specific overlay - render first so it's behind everything */}
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
                    opacity: 0.1,
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
                    opacity: 0.1,
                  }}
                />
              )}
            </div>
          )}

          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={getTileClass(row, col)}
                  onClick={() => handleCellClick(row, col)}
                  title={(() => {
                    const ship = getShipAtPosition(row, col);
                    if (ship) {
                      return createShipTooltip(ship, row, col);
                    }
                    return `Row: ${row}, Col: ${col}${
                      mapState.blockedTiles[row][col] ? ", Blocked (LOS)" : ""
                    }${
                      mapState.scoringTiles[row][col] > 0
                        ? `, Score: ${mapState.scoringTiles[row][col]}${
                            mapState.onlyOnceTiles[row][col]
                              ? " (once only)"
                              : " (reusable)"
                          }`
                        : ""
                    }`;
                  })()}
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
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <ShipImage
                          ship={ship}
                          className={`max-w-full max-h-full object-contain ${
                            isCreator ? "scale-x-[-1]" : ""
                          }`}
                        />
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          ))}

          {/* Grid reference lines overlay */}
          <div className="absolute pointer-events-none inset-0 z-10">
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
        </div>
      </div>
    </div>
  );
}
