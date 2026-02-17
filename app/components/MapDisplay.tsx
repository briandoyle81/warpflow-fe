"use client";

import React, { useState, useEffect } from "react";
import {
  GRID_DIMENSIONS,
  MapPosition,
  ScoringPosition,
  Ship,
  Attributes,
} from "../types/types";
import {
  useGetPresetMap,
  useGetPresetScoringMap,
} from "../hooks/useMapsContract";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";

interface MapDisplayProps {
  mapId: number;
  className?: string;
  showPlayerOverlay?: boolean;
  isCreator?: boolean; // kept for backward compatibility (flips all)
  isCreatorViewer?: boolean; // determines placement validity
  shipPositions?: Array<{ shipId: bigint; row: number; col: number }>;
  ships?: Array<Ship | { id: bigint; name: string; imageUrl?: string }>;
  selectedShipId?: bigint | null;
  onShipSelect?: (shipId: bigint) => void;
  onShipMove?: (shipId: bigint, row: number, col: number) => void;
  allowSelection?: boolean;
  selectableShipIds?: bigint[]; // which ships are allowed to be selected
  flippedShipIds?: bigint[]; // specific ships to flip horizontally
  onDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onDrop?: (row: number, col: number, e?: React.DragEvent) => void;
  dragOverPosition?: { row: number; col: number } | null;
}

export function MapDisplay({
  mapId,
  className = "",
  showPlayerOverlay = false,
  isCreator = false,
  isCreatorViewer = false,
  shipPositions = [],
  ships = [],
  selectedShipId = null,
  onShipSelect,
  onShipMove,
  allowSelection = true,
  selectableShipIds,
  flippedShipIds = [],
  onDragOver,
  onDrop,
  dragOverPosition = null,
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
    const map = new Map<
      bigint,
      Ship | { id: bigint; name: string; imageUrl?: string }
    >();
    ships.forEach((ship) => {
      map.set(ship.id, ship);
    });
    return map;
  }, [ships]);

  // Get full Ship objects (not simple {id, name} objects) for attributes
  const fullShips = React.useMemo(() => {
    return ships.filter((ship): ship is Ship => "equipment" in ship) as Ship[];
  }, [ships]);

  // Get ship attributes for tooltip
  const shipIds = React.useMemo(
    () => fullShips.map((ship) => ship.id),
    [fullShips]
  );
  const { attributes, isLoading: attributesLoading } =
    useShipAttributesByIds(shipIds);

  // Create a map of ship ID to attributes for quick lookup
  const attributesMap = React.useMemo(() => {
    const map = new Map<bigint, Attributes>();
    fullShips.forEach((ship, index) => {
      if (attributes[index]) {
        map.set(ship.id, attributes[index]);
      }
    });
    return map;
  }, [fullShips, attributes]);

  // Helper function to get ship at a position
  const getShipAtPosition = (row: number, col: number) => {
    if (!shipPositions || !ships) return null;

    const position = shipPositions.find(
      (pos) => pos.row === row && pos.col === col
    );
    if (!position || !position.shipId) return null;

    const ship = shipMap.get(position.shipId);
    if (!ship || !ship.id) return null;

    return ship;
  };

  // Helper to validate allowed deployment columns based on viewer role
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

    // Creator may place in left 4 columns (0-3); joiner in right 4 columns (13-16)
    return isCreatorViewer
      ? col >= 0 && col <= 3
      : col >= 13 && col <= 16;
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (!allowSelection) return;
    if (!onShipSelect || !onShipMove) return;

    const ship = getShipAtPosition(row, col);

    if (ship) {
      // Only allow selecting if the ship is in selectable set (if provided)
      if (
        !selectableShipIds ||
        selectableShipIds.some((id) => id === ship.id)
      ) {
        onShipSelect(ship.id);
      }
    } else if (selectedShipId && isValidShipPosition(row, col)) {
      // Clicked on empty valid position with ship selected - move ship
      onShipMove(selectedShipId, row, col);
    }
  };

  // Ship tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreatorShip: boolean; // Whether this is a creator ship (for flip and border color)
  } | null>(null);

  const handleCellEnter = (
    row: number,
    col: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const ship = getShipAtPosition(row, col);
    // Only show tooltip for full Ship objects (not simple {id, name} objects)
    if (ship && "equipment" in ship) {
      const isFlipped =
        flippedShipIds && flippedShipIds.some((id) => id === ship.id);
      // If viewer is creator, flipped ships are joiner ships, non-flipped are creator ships
      // If viewer is joiner, flipped ships are creator ships, non-flipped are joiner ships
      const isCreatorShip = isCreator ? !isFlipped : isFlipped;

      setHoveredCell({
        shipId: ship.id,
        row,
        col,
        mouseX: e.clientX,
        mouseY: e.clientY,
        isCreatorShip,
      });
    } else {
      setHoveredCell(null);
    }
  };

  const handleCellMove = (
    row: number,
    col: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col) {
      setHoveredCell({
        ...hoveredCell,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    }
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
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
      return `w-full h-full border-0 outline outline-1 outline-gray-600 bg-gray-900 ${
        allowSelection ? "cursor-pointer" : "cursor-default"
      }`;
    }

    const isBlocked = mapState.blockedTiles[row][col];
    const scoreValue = mapState.scoringTiles[row][col];
    const isOnlyOnce = mapState.onlyOnceTiles[row][col];
    const ship = getShipAtPosition(row, col);
    const isSelected = ship && selectedShipId && ship.id === selectedShipId;

    let baseClass = `w-full h-full relative ${
      allowSelection ? "cursor-pointer" : "cursor-default"
    }`;

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
      className={`bg-gray-900 rounded-lg relative w-full h-full flex flex-col items-center justify-center ${className}`}
    >
      <div
        className="w-full"
        style={{
          aspectRatio: `${GRID_DIMENSIONS.WIDTH} / ${GRID_DIMENSIONS.HEIGHT}`,
        }}
      >
        <div
          key={`map-display-${mapId}-${mapState.blockedTiles.length}-${mapState.scoringTiles.length}`}
          className="grid relative gap-0 grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)] w-full h-full"
        >
          {/* Player-specific overlay - render first so it's behind everything */}
          {showPlayerOverlay && (
            <div className="absolute pointer-events-none inset-0">
              {isCreator ? (
                /* Creator overlay - left 4 columns (0-3) */
                <div
                  className="absolute bg-blue-400"
                  style={{
                    left: 0,
                    top: 0,
                    width: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    opacity: 0.1,
                  }}
                />
              ) : (
                /* Joiner overlay - right 4 columns (13-16) */
                <div
                  className="absolute bg-blue-400"
                  style={{
                    right: 0,
                    top: 0,
                    width: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    opacity: 0.1,
                  }}
                />
              )}
            </div>
          )}

          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
                const ship = getShipAtPosition(row, col);
                const isDragOver = dragOverPosition?.row === row && dragOverPosition?.col === col;
                const isShipDraggable = ship && allowSelection && selectableShipIds?.some((id) => id === ship.id);

                return (
                <div
                  key={`${row}-${col}`}
                  className={`${getTileClass(row, col)} ${isDragOver ? "ring-2 ring-cyan-400 ring-inset" : ""} ${isShipDraggable ? "cursor-move" : ""}`}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={(e) => handleCellEnter(row, col, e)}
                  onMouseMove={(e) => handleCellMove(row, col, e)}
                  onMouseLeave={handleCellLeave}
                  onDragOver={(e) => {
                    if (onDragOver && isValidShipPosition(row, col)) {
                      onDragOver(row, col, e);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (onDrop && isValidShipPosition(row, col)) {
                      onDrop(row, col, e);
                    }
                  }}
                  draggable={!!isShipDraggable}
                  onDragStart={(e) => {
                    if (isShipDraggable && ship && "id" in ship) {
                      e.dataTransfer.effectAllowed = "move";
                      // Store ship ID in data transfer
                      e.dataTransfer.setData("text/plain", ship.id.toString());
                      // Note: Parent component will read from dataTransfer in onDrop
                    }
                  }}
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

                    const flipThis =
                      !!flippedShipIds?.length &&
                      flippedShipIds.some((id) => id === ship.id);

                    return (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {"equipment" in ship ? (
                          <ShipImage
                            ship={ship as Ship}
                            className={`max-w-full max-h-full object-contain ${
                              flipThis ? "scale-x-[-1]" : ""
                            }`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-600 rounded-none flex items-center justify-center text-white text-xs">
                            {ship.name}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                );
              })}
            </div>
          ))}

          {/* Grid reference lines overlay */}
          <div className="absolute pointer-events-none inset-0 z-10">
            {/* Vertical reference lines */}
            {/* Reference lines for grid zones */}
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`, // End of creator zone (after column 3)
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(8 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Left edge of center column
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(9 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Right edge of center column
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-blue-400"
              style={{
                left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Start of joiner zone (columns 13-16)
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />

            {/* Red emphasis lines - Creator/Joiner boundaries */}
            <div
              className="absolute bg-red-400"
              style={{
                left: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`, // End of creator zone (after column 3)
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute bg-red-400"
              style={{
                left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`, // Start of joiner zone (columns 13-16)
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
              }}
            />

            {/* Reference columns */}
            {[2, 5, 11, 14].map((col) => (
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
            {/* Center row edges (top and bottom of row 5) */}
            <div
              className="absolute bg-blue-400"
              style={{
                left: 0,
                top: `${(5 / GRID_DIMENSIONS.HEIGHT) * 100}%`,
                width: "100%",
                height: "2px",
                transform: "translateY(-50%)",
              }}
            />
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

            {/* Reference rows */}
            {[1, 9].map((row) => (
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

      {/* Ship Tooltip */}
      {hoveredCell &&
        (() => {
          const ship = shipMap.get(hoveredCell.shipId);
          // Only show tooltip for full Ship objects
          if (!ship || !("equipment" in ship)) return null;

          const attributes = attributesMap.get(hoveredCell.shipId);
          const isCurrentPlayerShip =
            selectableShipIds?.some((id) => id === hoveredCell.shipId) ?? false;

          return (
            <div
              className="fixed z-[100] pointer-events-none opacity-100"
              style={{
                left: `${Math.min(
                  hoveredCell.mouseX + 15,
                  typeof window !== "undefined"
                    ? window.innerWidth - 400
                    : hoveredCell.mouseX + 15
                )}px`,
                top: `${Math.min(
                  hoveredCell.mouseY + 15,
                  typeof window !== "undefined"
                    ? window.innerHeight - 500
                    : hoveredCell.mouseY + 15
                )}px`,
              }}
            >
              <div className="w-80 opacity-100">
                <ShipCard
                  ship={ship as Ship}
                  isStarred={false}
                  onToggleStar={() => {}}
                  isSelected={false}
                  onToggleSelection={() => {}}
                  onRecycleClick={() => {}}
                  showInGameProperties={true}
                  inGameAttributes={attributes || undefined}
                  attributesLoading={attributesLoading && !attributes}
                  hideRecycle={true}
                  hideCheckbox={true}
                  tooltipMode={true}
                  isCurrentPlayerShip={isCurrentPlayerShip}
                  flipShip={hoveredCell.isCreatorShip}
                />
              </div>
            </div>
          );
        })()}

      {/* Key/Legend */}
      <div className="mt-4 w-full">
        <div className="flex flex-wrap gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-gray-900 border-2 border-purple-400"></div>
            <span>Blocked (LOS) - Thick purple border</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-blue-400 border border-gray-600"></div>
            <span>Scoring (reusable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-yellow-400 border border-gray-600"></div>
            <span>Scoring (once only)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-blue-400 border-2 border-purple-400"></div>
            <span>Blocked + Scoring</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-gray-900 border border-gray-600"></div>
            <span>Empty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
