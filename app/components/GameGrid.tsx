"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ShipPosition, Attributes, Ship } from "../types/types";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { LaserShootingAnimation } from "./weapon-animations/LaserShootingAnimation";
import { MissileShootingAnimation } from "./weapon-animations/MissileShootingAnimation";
import { PlasmaShootingAnimation } from "./weapon-animations/PlasmaShootingAnimation";
import { RailgunShootingAnimation } from "./weapon-animations/RailgunShootingAnimation";

interface GameGridProps {
  grid: (ShipPosition | null)[][];
  shipMap: Map<bigint, Ship>;
  selectedShipId: bigint | null;
  previewPosition: { row: number; col: number } | null;
  targetShipId: bigint | null;
  selectedWeaponType: "weapon" | "special";
  hoveredCell: {
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null;
  draggedShipId: bigint | null;
  dragOverCell: { row: number; col: number } | null;
  movementRange: Array<{ row: number; col: number }>;
  shootingRange: Array<{ row: number; col: number }>;
  validTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  assistableTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  assistableTargetsFromStart: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  dragShootingRange: Array<{ row: number; col: number }>;
  dragValidTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: bigint) => boolean;
  movedShipIdsSet: Set<bigint>;
  specialType: number;
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
  calculateDamage: (
    targetShipId: bigint,
    weaponType?: "weapon" | "special",
    showReducedDamage?: boolean,
    shooterShipIdOverride?: bigint,
  ) => {
    reducedDamage: number;
    willKill: boolean;
    reactorCritical: boolean;
  };
  getShipAttributes: (shipId: bigint) => Attributes | null;
  disableTooltips: boolean;
  address: string | undefined;
  currentTurn: string;
  highlightedMovePosition?: { row: number; col: number } | null;
  lastMoveShipId?: bigint | null; // Ship ID for the last move (to show pulse effect)
  lastMoveOldPosition?: { row: number; col: number } | null; // Old position for last move preview
  setSelectedShipId: (shipId: bigint | null) => void;
  setPreviewPosition: (position: { row: number; col: number } | null) => void;
  setTargetShipId: (shipId: bigint | null) => void;
  setSelectedWeaponType: (type: "weapon" | "special") => void;
  setHoveredCell: (
    cell: {
      shipId: bigint;
      row: number;
      col: number;
      mouseX: number;
      mouseY: number;
      isCreator: boolean;
    } | null,
  ) => void;
  setDraggedShipId: (shipId: bigint | null) => void;
  setDragOverCell: (cell: { row: number; col: number } | null) => void;
}

export function GameGrid({
  grid,
  shipMap,
  selectedShipId,
  previewPosition,
  targetShipId,
  selectedWeaponType,
  hoveredCell,
  draggedShipId,
  dragOverCell,
  movementRange,
  shootingRange,
  validTargets,
  assistableTargets,
  assistableTargetsFromStart,
  dragShootingRange,
  dragValidTargets,
  isCurrentPlayerTurn,
  isShipOwnedByCurrentPlayer,
  movedShipIdsSet,
  specialType,
  blockedGrid,
  scoringGrid,
  onlyOnceGrid,
  calculateDamage,
  getShipAttributes,
  disableTooltips,
  address,
  currentTurn,
  highlightedMovePosition,
  lastMoveShipId,
  lastMoveOldPosition,
  setSelectedShipId,
  setPreviewPosition,
  setTargetShipId,
  setSelectedWeaponType,
  setHoveredCell,
  setDraggedShipId,
  setDragOverCell,
}: GameGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  // Track last drag over cell to prevent excessive state updates
  const lastDragOverCellRef = useRef<{ row: number; col: number } | null>(null);

  const isMyTurn = currentTurn === address;

  return (
    <>
      {/* Map Grid */}
      <div className="w-full px-2">
        <div
          ref={gridContainerRef}
          key="game-grid"
          className="relative grid gap-0 border border-gray-900 grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)] w-full"
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const ship = cell ? shipMap.get(cell.shipId) : null;
              const isSelected = selectedShipId === cell?.shipId;
              const isMovementTile = movementRange.some(
                (pos) => pos.row === rowIndex && pos.col === colIndex,
              );
              const isHighlightedMove =
                highlightedMovePosition &&
                highlightedMovePosition.row === rowIndex &&
                highlightedMovePosition.col === colIndex;
              const isShootingTile = shootingRange.some(
                (pos) => pos.row === rowIndex && pos.col === colIndex,
              );

              // Check if this ship has already moved this round
              const hasShipMoved = cell && movedShipIdsSet.has(cell.shipId);

              // Check if this cell contains a valid target
              // When dragging, use dragValidTargets; otherwise use validTargets
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
                        ? cell.shipId !== selectedShipId // Flak hits ALL ships in range except itself
                        : specialType === 1 // EMP
                          ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                          : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                      : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships
                  return isValidTargetType;
                })() &&
                (draggedShipId && dragOverCell
                  ? dragValidTargets.some(
                      (target) => target.shipId === cell.shipId,
                    )
                  : validTargets.some(
                      (target) => target.shipId === cell.shipId,
                    ));

              // Check if this cell contains an assistable target (friendly ship with 0 HP)
              const isAssistableTarget =
                cell &&
                selectedShipId &&
                isCurrentPlayerTurn &&
                isShipOwnedByCurrentPlayer(selectedShipId) &&
                (assistableTargets.some(
                  (target) => target.shipId === cell.shipId,
                ) ||
                  assistableTargetsFromStart.some(
                    (target) => target.shipId === cell.shipId,
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
                      cell.shipId,
                    );
                    const selectedShip = shipMap.get(selectedShipId);
                    const hasRepairDrones =
                      selectedShip?.equipment.special === 2; // Repair special

                    if (isFriendlyShip && hasRepairDrones) {
                      // Check if the friendly ship is in repair range
                      const isInRepairRange = validTargets.some(
                        (target) => target.shipId === cell.shipId,
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
                          ? cell.shipId !== selectedShipId // Flak hits ALL ships in range except itself
                          : specialType === 1 // EMP
                            ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                            : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                        : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships

                    if (isValidTargetType) {
                      const isInShootingRange = validTargets.some(
                        (target) => target.shipId === cell.shipId,
                      );
                      if (isInShootingRange) {
                        // If the player hasn't proposed a move yet, convert this into a
                        // "stay in place + fire" intent by setting previewPosition to the
                        // selected ship's current position. This enables shooting without moving.
                        if (selectedWeaponType === "weapon" && previewPosition === null) {
                          let found = false;
                          for (let r = 0; r < grid.length && !found; r++) {
                            const gridRow = grid[r];
                            for (let c = 0; c < gridRow.length; c++) {
                              const cellAt = gridRow[c];
                              if (
                                cellAt &&
                                cellAt.shipId === selectedShipId &&
                                !cellAt.isPreview
                              ) {
                                setPreviewPosition({ row: r, col: c });
                                found = true;
                                break;
                              }
                            }
                          }
                        }
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
                      (target) => target.shipId === cell.shipId,
                    );
                    const isAssistableFromStart =
                      assistableTargetsFromStart.some(
                        (target) => target.shipId === cell.shipId,
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
                  className={`w-full h-full aspect-square ${
                    isShipOnScoringTile
                      ? "border-2 border-yellow-400"
                      : "border-0"
                  } outline outline-1 outline-gray-900 relative cursor-pointer ${(() => {
                    // Check if this is the "from" position (original position when proposing a move)
                    const isProposedMoveOriginal =
                      selectedShipId === cell?.shipId && previewPosition;
                    // Check if this is the "to" position (preview cell)
                    const isProposedMovePreview =
                      cell?.isPreview &&
                      previewPosition !== null &&
                      selectedShipId !== null;

                    // Show blue background for "from" or "to" positions
                    if (isProposedMoveOriginal || isProposedMovePreview) {
                      // Add blue background, but still need to handle other conditions
                      const baseBg = canMoveShip
                        ? "bg-blue-900 ring-2 ring-blue-400"
                        : "bg-purple-900 ring-2 ring-purple-400";

                      // Check for other conditions that might override - gray for any moved ship
                      if (hasShipMoved) {
                        return "bg-gray-700 opacity-60 cursor-not-allowed";
                      }
                      if (isSelectedTarget) {
                        const isAssistAction =
                          assistableTargets.some(
                            (target) => target.shipId === cell.shipId,
                          ) ||
                          assistableTargetsFromStart.some(
                            (target) => target.shipId === cell.shipId,
                          );
                        if (isAssistAction) {
                          return "bg-cyan-900 ring-2 ring-cyan-400";
                        }
                        return selectedWeaponType === "special"
                          ? specialType === 3 // Flak
                            ? "bg-red-900 ring-2 ring-red-400"
                            : "bg-blue-900 ring-2 ring-blue-400"
                          : "bg-red-900 ring-2 ring-red-400";
                      }
                      // Return blue background for from/to positions
                      return baseBg;
                    }

                    // Otherwise, apply normal selected styling
                    if (isSelected) {
                      return canMoveShip
                        ? "bg-blue-900 ring-2 ring-blue-400"
                        : "bg-purple-900 ring-2 ring-purple-400";
                    }

                    // Default styling chain - gray for any ship that has moved this round (both players see it)
                    let cursorSuffix = "";
                    if (cell != null && isCurrentPlayerTurn) {
                      if (isShipOwnedByCurrentPlayer(cell.shipId)) {
                        cursorSuffix = " cursor-not-allowed";
                      }
                    }
                    const movedStyle = "bg-gray-700 opacity-60" + cursorSuffix;
                    return hasShipMoved
                      ? movedStyle
                      : isSelectedTarget && cell
                        ? (() => {
                            // Check if this is an assist action
                            const isAssistAction =
                              assistableTargets.some(
                                (target) => target.shipId === cell.shipId,
                              ) ||
                              assistableTargetsFromStart.some(
                                (target) => target.shipId === cell.shipId,
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
                              : "bg-gray-950";
                  })()}`}
                  onClick={handleCellClick}
                  onMouseEnter={
                    cell
                      ? (e) => {
                          const ship = shipMap.get(cell.shipId);
                          if (ship) {
                            setHoveredCell({
                              shipId: cell.shipId,
                              row: rowIndex,
                              col: colIndex,
                              mouseX: e.clientX,
                              mouseY: e.clientY,
                              isCreator: cell.isCreator,
                            });
                          }
                        }
                      : undefined
                  }
                  onMouseMove={
                    cell
                      ? (e) => {
                          if (
                            hoveredCell &&
                            hoveredCell.shipId === cell.shipId
                          ) {
                            setHoveredCell({
                              ...hoveredCell,
                              mouseX: e.clientX,
                              mouseY: e.clientY,
                            });
                          }
                        }
                      : undefined
                  }
                  onMouseLeave={cell ? () => setHoveredCell(null) : undefined}
                  onDragOver={(e) => {
                    if (draggedShipId) {
                      e.preventDefault();
                      // Only update state if the cell actually changed
                      const newCell = { row: rowIndex, col: colIndex };
                      const lastCell = lastDragOverCellRef.current;
                      if (
                        !lastCell ||
                        lastCell.row !== newCell.row ||
                        lastCell.col !== newCell.col
                      ) {
                        lastDragOverCellRef.current = newCell;
                        setDragOverCell(newCell);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedShipId && isMovementTile) {
                      // Update preview position - works whether dragging from original or preview position
                      setPreviewPosition({ row: rowIndex, col: colIndex });
                      setTargetShipId(null);
                      setDraggedShipId(null);
                      setDragOverCell(null);
                      lastDragOverCellRef.current = null;
                    }
                  }}
                  {...(!cell && {
                    title: onlyOnceGrid[rowIndex][colIndex]
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
                                  : `Empty (${rowIndex}, ${colIndex})`,
                  })}
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
                    <div
                      className={`absolute inset-0 z-2 border-1 pointer-events-none ${
                        isHighlightedMove
                          ? "border-yellow-400/50 bg-yellow-500/20 animate-pulse"
                          : "border-green-400/50 bg-green-500/10"
                      }`}
                    />
                  )}

                  {/* Shooting range highlight */}
                  {isShootingTile && (
                    <div className="absolute inset-0 z-2 border-1 border-orange-400/50 bg-orange-500/10 pointer-events-none" />
                  )}

                  {/* Drag range highlight - show range from drag position */}
                  {draggedShipId && dragOverCell && (
                    <>
                      {dragShootingRange.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex,
                      ) && (
                        <div className="absolute inset-0 z-2 border-1 border-orange-400/50 bg-orange-500/10 pointer-events-none" />
                      )}
                      {/* Green outline on the cell being dragged over */}
                      {dragOverCell.row === rowIndex &&
                        dragOverCell.col === colIndex && (
                          <div className="absolute inset-0 z-3 border-4 border-green-400 bg-green-500/10 pointer-events-none" />
                        )}
                    </>
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
                    <div
                      className="w-full h-full relative z-10"
                      draggable={
                        isCurrentPlayerTurn &&
                        isShipOwnedByCurrentPlayer(cell.shipId) &&
                        !movedShipIdsSet.has(cell.shipId)
                      }
                      onDragStart={(e) => {
                        if (
                          isCurrentPlayerTurn &&
                          isShipOwnedByCurrentPlayer(cell.shipId) &&
                          !movedShipIdsSet.has(cell.shipId)
                        ) {
                          setDraggedShipId(cell.shipId);
                          setSelectedShipId(cell.shipId);

                          // If dragging from preview position, capture it and use as starting point
                          // Otherwise start at current cell position
                          const startPosition =
                            cell.isPreview && previewPosition
                              ? {
                                  row: previewPosition.row,
                                  col: previewPosition.col,
                                }
                              : { row: rowIndex, col: colIndex };

                          // Clear preview position when starting drag - enter positioning state
                          // The preview will be replaced by the drag state
                          setPreviewPosition(null);
                          // Start dragOverCell at the position we're dragging from (preview or original)
                          // This ensures ranges calculate from the correct starting position
                          setDragOverCell(startPosition);
                          lastDragOverCellRef.current = startPosition;
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData(
                            "text/plain",
                            cell.shipId.toString(),
                          );

                          // Create custom drag image that preserves ship orientation
                          // Find the ship image element (it's inside a div with class "relative")
                          const shipImageContainer =
                            e.currentTarget.querySelector(
                              ".relative img",
                            ) as HTMLImageElement;
                          if (
                            shipImageContainer &&
                            shipImageContainer.complete &&
                            shipImageContainer.naturalWidth > 0
                          ) {
                            // Create a canvas to capture the ship image with its current transform
                            const canvas = document.createElement("canvas");
                            canvas.width = 64;
                            canvas.height = 64;
                            const ctx = canvas.getContext("2d");

                            if (ctx) {
                              // Apply flip transformation if needed (creator ships are flipped)
                              if (cell.isCreator) {
                                ctx.translate(64, 0);
                                ctx.scale(-1, 1);
                              }

                              // Draw the ship image
                              ctx.drawImage(shipImageContainer, 0, 0, 64, 64);

                              // Create a temporary element for the drag image
                              const dragImage = document.createElement("img");
                              dragImage.src = canvas.toDataURL();
                              dragImage.style.position = "absolute";
                              dragImage.style.top = "-1000px";
                              dragImage.style.width = "64px";
                              dragImage.style.height = "64px";
                              document.body.appendChild(dragImage);

                              // Set the drag image with offset to center it
                              e.dataTransfer.setDragImage(dragImage, 32, 32);

                              // Clean up after a short delay
                              setTimeout(() => {
                                if (document.body.contains(dragImage)) {
                                  document.body.removeChild(dragImage);
                                }
                              }, 0);
                            }
                          }
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedShipId(null);
                        setDragOverCell(null);
                        lastDragOverCellRef.current = null;
                        // If we were dragging from preview position and didn't drop, keep preview
                        // If we dropped, previewPosition will be updated in onDrop handler
                      }}
                    >
                      {/* Health bar inside cell top, adjacent to team dot */}
                      {(() => {
                        const attributes = getShipAttributes(cell.shipId);
                        if (!attributes) return null;
                        if (attributes.hullPoints <= 0) return null; // show skull only
                        if (attributes.hullPoints >= attributes.maxHullPoints)
                          return null; // full health - no bar

                        const healthPercentage =
                          (attributes.hullPoints / attributes.maxHullPoints) *
                          100;
                        const isLowHealth = healthPercentage <= 25;

                        // Position: fill the top edge excluding the team dot side
                        // Dot is w-2 (0.5rem) with m-0.5 (0.125rem). Add an extra 0.125rem gap.
                        const dotOffset = "0.75rem"; // 0.5 + 0.125 + 0.125
                        const topOffset = "0.125rem"; // align with dot's margin

                        const style = cell.isCreator
                          ? { top: topOffset, left: dotOffset, right: 0 }
                          : { top: topOffset, left: 0, right: dotOffset };

                        return (
                          <div className="absolute z-15" style={style}>
                            <div className="w-full h-1 bg-gray-700 rounded-sm overflow-hidden relative">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isLowHealth ? "bg-red-500" : "bg-green-500"
                                }`}
                                style={
                                  cell.isCreator
                                    ? {
                                        width: `${healthPercentage}%`,
                                        left: 0,
                                        right: "auto",
                                        position: "absolute",
                                      }
                                    : {
                                        width: `${healthPercentage}%`,
                                        right: 0,
                                        left: "auto",
                                        position: "absolute",
                                      }
                                }
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <ShipImage
                        ship={ship}
                        className={`w-full h-full relative z-10 ${
                          cell.isCreator ? "scale-x-[-1]" : ""
                        } ${(() => {
                          // Last move old position: 50% opacity, no animation (check first)
                          if (
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            rowIndex === lastMoveOldPosition.row &&
                            colIndex === lastMoveOldPosition.col
                          ) {
                            return "opacity-50";
                          }

                          // Last move new position: 100% opacity (no class = default 100%)
                          if (
                            lastMoveShipId &&
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            (rowIndex !== lastMoveOldPosition.row ||
                              colIndex !== lastMoveOldPosition.col) &&
                            !cell.isPreview
                          ) {
                            return ""; // No opacity class = 100% opacity
                          }

                          // "From" position: 50% opacity, no animation
                          if (
                            selectedShipId === cell.shipId &&
                            previewPosition
                          ) {
                            return "opacity-50";
                          }

                          // Proposed move preview (to position): 100% opacity
                          if (
                            cell.isPreview &&
                            previewPosition !== null &&
                            selectedShipId !== null &&
                            !(
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              rowIndex === lastMoveOldPosition.row &&
                              colIndex === lastMoveOldPosition.col
                            )
                          ) {
                            return ""; // No opacity class = 100% opacity
                          }

                          // Preview cells: animation only
                          if (cell.isPreview) {
                            return "animate-pulse-preview";
                          }

                          return "";
                        })()}`}
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
                        if (
                          !attributes ||
                          attributes.reactorCriticalTimer === 0
                        )
                          return null;

                        const skullCount = Math.min(
                          attributes.reactorCriticalTimer,
                          3,
                        );
                        const skulls = "💀".repeat(skullCount);

                        return (
                          <div
                            className={`absolute ${
                              cell.isCreator
                                ? "bottom-0 left-0"
                                : "bottom-0 right-0"
                            } m-0.5 flex items-center justify-center`}
                          >
                            <div className="w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center">
                              <span className="text-[8px] font-mono">
                                {skulls}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Team indicator overlay */}
                      <div
                        className={`absolute top-0 ${
                          cell.isCreator ? "left-0" : "right-0"
                        } w-2 h-2 rounded-full ${
                          isShipOwnedByCurrentPlayer(cell.shipId)
                            ? "bg-blue-500"
                            : "bg-red-500"
                        } ${(() => {
                          // Check if this is the "from" position (original position when proposing a move)
                          const isProposedMoveOriginal =
                            selectedShipId === cell.shipId && previewPosition;

                          // Check if this is a proposed move preview (to position)
                          const isProposedMovePreview =
                            cell.isPreview &&
                            previewPosition !== null &&
                            selectedShipId !== null &&
                            !(
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              rowIndex === lastMoveOldPosition.row &&
                              colIndex === lastMoveOldPosition.col
                            );

                          // "From" position: 50% opacity, no animation
                          if (isProposedMoveOriginal) {
                            return "opacity-50";
                          }

                          // Don't animate proposed move previews
                          if (isProposedMovePreview) {
                            return "";
                          }

                          // Last move old position: 50% opacity, no animation
                          if (
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            rowIndex === lastMoveOldPosition.row &&
                            colIndex === lastMoveOldPosition.col
                          ) {
                            return "opacity-50";
                          }

                          // Apply animation for other cases
                          if (cell.isPreview) {
                            return "animate-pulse-preview";
                          }
                          return "";
                        })()}`}
                      />
                      {/* Movement path borders */}
                      {(() => {
                        const isPreviewCell = cell.isPreview;
                        const isProposedMoveOriginal =
                          selectedShipId === cell.shipId && previewPosition;
                        const isLastMoveOldPosition =
                          lastMoveShipId === cell.shipId &&
                          lastMoveOldPosition &&
                          rowIndex === lastMoveOldPosition.row &&
                          colIndex === lastMoveOldPosition.col;
                        const isLastMoveNewPosition =
                          lastMoveShipId === cell.shipId &&
                          lastMoveOldPosition &&
                          !isLastMoveOldPosition; // New position is where the ship is but not at old position

                        // Check if this is a proposed move preview (to position)
                        // It's a proposed move preview if: it's a preview cell AND there's an active proposed move (previewPosition exists) AND it's not the last move old position
                        const isProposedMovePreview =
                          isPreviewCell &&
                          previewPosition !== null &&
                          selectedShipId !== null &&
                          !isLastMoveOldPosition;

                        const shouldShowBorder =
                          isPreviewCell ||
                          isProposedMoveOriginal ||
                          isLastMoveOldPosition ||
                          isLastMoveNewPosition;

                        if (!shouldShowBorder) return null;

                        // For proposed moves: preview (to) is solid, original (from) is dashed
                        // For last move: old position is dashed, new position is solid
                        // Dashed for: proposed move original position, last move old position
                        // Solid for: proposed move preview (to), last move new position
                        const isDashed =
                          isProposedMoveOriginal || isLastMoveOldPosition;
                        // Don't animate "from" position, new position of last move, or last move old position
                        const shouldAnimate =
                          isPreviewCell &&
                          !isProposedMovePreview &&
                          !isLastMoveOldPosition;

                        // Explicitly ensure proposed move previews are solid
                        const borderStyle = isProposedMovePreview
                          ? "border-solid"
                          : isDashed
                            ? "border-dashed"
                            : "border-solid";

                        // Make proposed move preview borders thicker
                        const borderWidth = isProposedMovePreview
                          ? "border-4"
                          : "border-2";

                        // Don't animate proposed move previews (to position), but animate others
                        const animationClass = isProposedMovePreview
                          ? ""
                          : shouldAnimate
                            ? isPreviewCell
                              ? "animate-pulse-preview"
                              : "animate-pulse-original"
                            : "";

                        return (
                          <div
                            className={`absolute inset-0 ${borderWidth} border-yellow-400 rounded-sm pointer-events-none ${borderStyle} ${animationClass}`}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              );
            }),
          )}

          {/* Laser Shooting Animation */}
          {(selectedShipId || lastMoveShipId) &&
            targetShipId &&
            selectedWeaponType === "weapon" &&
            (() => {
              // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
              const shipId = selectedShipId || lastMoveShipId;
              if (!shipId) return null;

              // Check if the ship has a Laser weapon (mainWeapon === 0)
              const ship = shipMap.get(shipId);
              if (!ship || ship.equipment.mainWeapon !== 0) {
                return null;
              }

              // Find positions of attacking and target ships
              // Use previewPosition or dragOverCell (to position) - no fallback
              // For last move, use previewPosition which is set to the new position
              let attackerRow = -1;
              let attackerCol = -1;

              if (previewPosition) {
                attackerRow = previewPosition.row;
                attackerCol = previewPosition.col;
              } else if (draggedShipId && dragOverCell) {
                attackerRow = dragOverCell.row;
                attackerCol = dragOverCell.col;
              } else if (lastMoveShipId && shipId === lastMoveShipId) {
                // For last move display, use the new position from lastMoveOldPosition context
                // previewPosition should already be set, but if not, find from grid
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell?.shipId === shipId) {
                      attackerRow = r;
                      attackerCol = c;
                    }
                  });
                });
                if (attackerRow === -1 || attackerCol === -1) return null;
              } else {
                // No preview or drag position - don't show animation
                return null;
              }

              let targetRow = -1;
              let targetCol = -1;
              grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                  if (cell?.shipId === targetShipId) {
                    targetRow = r;
                    targetCol = c;
                  }
                });
              });

              // Only show animation if target is found
              if (targetRow === -1 || targetCol === -1) return null;

              return (
                <LaserShootingAnimation
                  gridContainerRef={gridContainerRef}
                  attackerRow={attackerRow}
                  attackerCol={attackerCol}
                  targetRow={targetRow}
                  targetCol={targetCol}
                />
              );
            })()}

          {/* Missile Shooting Animation */}
          {(selectedShipId || lastMoveShipId) &&
            targetShipId &&
            selectedWeaponType === "weapon" &&
            (() => {
              // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
              const shipId = selectedShipId || lastMoveShipId;
              if (!shipId) return null;

              // Check if the ship has a Missile weapon (mainWeapon === 2)
              const ship = shipMap.get(shipId);
              if (!ship || ship.equipment.mainWeapon !== 2) {
                return null;
              }

              // Find positions of attacking and target ships
              // Use previewPosition or dragOverCell (to position) - no fallback
              // For last move, use previewPosition which is set to the new position
              let attackerRow = -1;
              let attackerCol = -1;

              if (previewPosition) {
                attackerRow = previewPosition.row;
                attackerCol = previewPosition.col;
              } else if (draggedShipId && dragOverCell) {
                attackerRow = dragOverCell.row;
                attackerCol = dragOverCell.col;
              } else if (lastMoveShipId && shipId === lastMoveShipId) {
                // For last move display, use the new position from lastMoveOldPosition context
                // previewPosition should already be set, but if not, find from grid
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell?.shipId === shipId) {
                      attackerRow = r;
                      attackerCol = c;
                    }
                  });
                });
                if (attackerRow === -1 || attackerCol === -1) return null;
              } else {
                // No preview or drag position - don't show animation
                return null;
              }

              let targetRow = -1;
              let targetCol = -1;
              grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                  if (cell?.shipId === targetShipId) {
                    targetRow = r;
                    targetCol = c;
                  }
                });
              });

              // Only show animation if target is found
              if (targetRow === -1 || targetCol === -1) return null;

              return (
                <MissileShootingAnimation
                  gridContainerRef={gridContainerRef}
                  attackerRow={attackerRow}
                  attackerCol={attackerCol}
                  targetRow={targetRow}
                  targetCol={targetCol}
                />
              );
            })()}

          {/* Plasma Shooting Animation */}
          {(selectedShipId || lastMoveShipId) &&
            targetShipId &&
            selectedWeaponType === "weapon" &&
            (() => {
              // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
              const shipId = selectedShipId || lastMoveShipId;
              if (!shipId) return null;

              // Check if the ship has a Plasma weapon (mainWeapon === 3)
              const ship = shipMap.get(shipId);
              if (!ship || ship.equipment.mainWeapon !== 3) {
                return null;
              }

              // Find positions of attacking and target ships
              // Use previewPosition or dragOverCell (to position) - no fallback
              // For last move, use previewPosition which is set to the new position
              let attackerRow = -1;
              let attackerCol = -1;

              if (previewPosition) {
                attackerRow = previewPosition.row;
                attackerCol = previewPosition.col;
              } else if (draggedShipId && dragOverCell) {
                attackerRow = dragOverCell.row;
                attackerCol = dragOverCell.col;
              } else if (lastMoveShipId && shipId === lastMoveShipId) {
                // For last move display, use the new position from lastMoveOldPosition context
                // previewPosition should already be set, but if not, find from grid
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell?.shipId === shipId) {
                      attackerRow = r;
                      attackerCol = c;
                    }
                  });
                });
                if (attackerRow === -1 || attackerCol === -1) return null;
              } else {
                // No preview or drag position - don't show animation
                return null;
              }

              let targetRow = -1;
              let targetCol = -1;
              grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                  if (cell?.shipId === targetShipId) {
                    targetRow = r;
                    targetCol = c;
                  }
                });
              });

              // Only show animation if target is found
              if (targetRow === -1 || targetCol === -1) return null;

              return (
                <PlasmaShootingAnimation
                  gridContainerRef={gridContainerRef}
                  attackerRow={attackerRow}
                  attackerCol={attackerCol}
                  targetRow={targetRow}
                  targetCol={targetCol}
                />
              );
            })()}

          {/* Railgun Shooting Animation */}
          {(selectedShipId || lastMoveShipId) &&
            targetShipId &&
            selectedWeaponType === "weapon" &&
            (() => {
              // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
              const shipId = selectedShipId || lastMoveShipId;
              if (!shipId) return null;

              // Check if the ship has a Railgun weapon (mainWeapon === 1)
              const ship = shipMap.get(shipId);
              if (!ship || ship.equipment.mainWeapon !== 1) {
                return null;
              }

              // Find positions of attacking and target ships
              // Use previewPosition or dragOverCell (to position) - no fallback
              // For last move, use previewPosition which is set to the new position
              let attackerRow = -1;
              let attackerCol = -1;

              if (previewPosition) {
                attackerRow = previewPosition.row;
                attackerCol = previewPosition.col;
              } else if (draggedShipId && dragOverCell) {
                attackerRow = dragOverCell.row;
                attackerCol = dragOverCell.col;
              } else if (lastMoveShipId && shipId === lastMoveShipId) {
                // For last move display, use the new position from lastMoveOldPosition context
                // previewPosition should already be set, but if not, find from grid
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell?.shipId === shipId) {
                      attackerRow = r;
                      attackerCol = c;
                    }
                  });
                });
                if (attackerRow === -1 || attackerCol === -1) return null;
              } else {
                // No preview or drag position - don't show animation
                return null;
              }

              let targetRow = -1;
              let targetCol = -1;
              grid.forEach((row, r) => {
                row.forEach((cell, c) => {
                  if (cell?.shipId === targetShipId) {
                    targetRow = r;
                    targetCol = c;
                  }
                });
              });

              // Only show animation if target is found
              if (targetRow === -1 || targetCol === -1) return null;

              return (
                <RailgunShootingAnimation
                  gridContainerRef={gridContainerRef}
                  attackerRow={attackerRow}
                  attackerCol={attackerCol}
                  targetRow={targetRow}
                  targetCol={targetCol}
                />
              );
            })()}

          {/* Damage Labels - Rendered at grid level above weapon animations */}
          {gridContainerRef.current &&
            (() => {
              const targetsToShow: Array<{
                shipId: bigint;
                row: number;
                col: number;
              }> = [];

              // Collect selected target
              if (targetShipId) {
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell && cell.shipId === targetShipId) {
                      targetsToShow.push({
                        shipId: cell.shipId,
                        row: r,
                        col: c,
                      });
                    }
                  });
                });
              }

              // Collect drag targets
              if (draggedShipId && dragOverCell) {
                dragValidTargets.forEach((target) => {
                  if (!targetsToShow.some((t) => t.shipId === target.shipId)) {
                    targetsToShow.push({
                      shipId: target.shipId,
                      row: target.position.row,
                      col: target.position.col,
                    });
                  }
                });
              }

              // Collect preview targets
              if (previewPosition) {
                validTargets.forEach((target) => {
                  if (!targetsToShow.some((t) => t.shipId === target.shipId)) {
                    targetsToShow.push({
                      shipId: target.shipId,
                      row: target.position.row,
                      col: target.position.col,
                    });
                  }
                });
              }

              if (targetsToShow.length === 0) return null;

              const gridRect = gridContainerRef.current.getBoundingClientRect();
              const cellWidth = gridRect.width / 17;
              const cellHeight = gridRect.height / 11;

              return (
                <div
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: `0px`,
                    top: `0px`,
                    width: `${gridRect.width}px`,
                    height: `${gridRect.height}px`,
                  }}
                >
                  {targetsToShow.map((target) => {
                    const isLastMoveTarget =
                      lastMoveShipId != null &&
                      targetShipId != null &&
                      target.shipId === targetShipId;
                    const damage = calculateDamage(
                      target.shipId,
                      selectedWeaponType,
                      selectedWeaponType === "special" && specialType === 3
                        ? true
                        : undefined,
                      isLastMoveTarget
                        ? (lastMoveShipId ?? undefined)
                        : undefined,
                    );

                    // For last move display, never show (KILL) since we don't know if it actually killed
                    const showAsKill = damage.willKill && !isLastMoveTarget;
                    let labelText: string;
                    if (selectedWeaponType === "special") {
                      // Flak does damage, other special abilities repair/heal
                      if (specialType === 3) {
                        // Flak special - show damage effect
                        if (damage.reactorCritical) {
                          labelText = "⚡ Reactor Critical +1";
                        } else if (showAsKill) {
                          labelText = `💀 ${damage.reducedDamage} DMG (KILL)`;
                        } else {
                          labelText = `⚔️ ${damage.reducedDamage} DMG`;
                        }
                      } else {
                        // Other special abilities - show repair/heal effect
                        labelText = `🔧 Repair ${damage.reducedDamage} HP`;
                      }
                    } else if (damage.reactorCritical) {
                      labelText = "⚡ Reactor Critical +1";
                    } else if (showAsKill) {
                      labelText = `💀 ${damage.reducedDamage} DMG (KILL)`;
                    } else {
                      labelText = `⚔️ ${damage.reducedDamage} DMG`;
                    }

                    // Calculate position above target cell (relative to grid container)
                    const cellX = target.col * cellWidth + cellWidth / 2;
                    const cellTop = target.row * cellHeight; // Top edge of the cell

                    return (
                      <div
                        key={target.shipId.toString()}
                        className={`absolute rounded px-2 py-1 text-xs font-mono text-white whitespace-nowrap ${
                          selectedWeaponType === "special"
                            ? specialType === 3 // Flak
                              ? "bg-orange-900 border border-orange-500" // Orange for flak
                              : "bg-blue-900 border border-blue-500" // Blue for other specials
                            : "bg-red-900 border border-red-500"
                        }`}
                        style={{
                          left: `${cellX}px`,
                          top: `${cellTop - 32}px`, // Position 32px above the top of the target cell
                          transform: "translateX(-50%)",
                        }}
                      >
                        {labelText}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      </div>

      {/* Ship Tooltip */}
      {hoveredCell &&
        !disableTooltips &&
        !draggedShipId &&
        (() => {
          const ship = shipMap.get(hoveredCell.shipId);
          const attributes = getShipAttributes(hoveredCell.shipId);
          if (!ship) return null;

          // Calculate tooltip position to avoid covering the ship
          // Tooltip is 320px wide (w-80 = 20rem = 320px) and approximately 400px tall
          const tooltipWidth = 320;
          const tooltipHeight = 400;
          const offset = 15;

          // Get ship cell position using grid container ref
          let shipCellLeft = 0;
          let shipCellTop = 0;
          let shipCellRight = 64;
          let shipCellBottom = 64;

          if (gridContainerRef.current) {
            const gridRect = gridContainerRef.current.getBoundingClientRect();
            const cellWidth = gridRect.width / 17; // 17 columns
            const cellHeight = gridRect.height / 11; // 11 rows

            shipCellLeft = gridRect.left + hoveredCell.col * cellWidth;
            shipCellTop = gridRect.top + hoveredCell.row * cellHeight;
            shipCellRight = shipCellLeft + cellWidth;
            shipCellBottom = shipCellTop + cellHeight;
          } else {
            // Fallback: estimate based on typical cell size
            const cellSize = 64;
            shipCellLeft = hoveredCell.col * cellSize;
            shipCellTop = hoveredCell.row * cellSize;
            shipCellRight = shipCellLeft + cellSize;
            shipCellBottom = shipCellTop + cellSize;
          }

          // Calculate tooltip position
          let tooltipLeft = hoveredCell.mouseX + offset;
          let tooltipTop = hoveredCell.mouseY + offset;

          // Check if tooltip would cover the ship horizontally
          const tooltipRight = tooltipLeft + tooltipWidth;
          const wouldCoverHorizontally =
            tooltipLeft < shipCellRight && tooltipRight > shipCellLeft;

          // Check if tooltip would cover the ship vertically
          const tooltipBottom = tooltipTop + tooltipHeight;
          const wouldCoverVertically =
            tooltipTop < shipCellBottom && tooltipBottom > shipCellTop;

          // If tooltip would cover ship, adjust position
          // Prefer left for creator ships, right for joiner ships
          const isCreatorShip = hoveredCell.isCreator;

          if (wouldCoverHorizontally && wouldCoverVertically) {
            // Try positioning based on ship type preference
            if (isCreatorShip) {
              // Creator ships: prefer left
              if (shipCellLeft - tooltipWidth - offset > 0) {
                tooltipLeft = shipCellLeft - tooltipWidth - offset;
              }
              // Fallback to right
              else if (
                shipCellRight + tooltipWidth + offset <
                (typeof window !== "undefined" ? window.innerWidth : 1000)
              ) {
                tooltipLeft = shipCellRight + offset;
              }
              // Fallback to above
              else if (shipCellTop - tooltipHeight - offset > 0) {
                tooltipTop = shipCellTop - tooltipHeight - offset;
                tooltipLeft = hoveredCell.mouseX;
              }
              // Fallback to below
              else if (
                shipCellBottom + tooltipHeight + offset <
                (typeof window !== "undefined" ? window.innerHeight : 1000)
              ) {
                tooltipTop = shipCellBottom + offset;
                tooltipLeft = hoveredCell.mouseX;
              }
            } else {
              // Joiner ships: prefer right
              if (
                shipCellRight + tooltipWidth + offset <
                (typeof window !== "undefined" ? window.innerWidth : 1000)
              ) {
                tooltipLeft = shipCellRight + offset;
              }
              // Fallback to left
              else if (shipCellLeft - tooltipWidth - offset > 0) {
                tooltipLeft = shipCellLeft - tooltipWidth - offset;
              }
              // Fallback to above
              else if (shipCellTop - tooltipHeight - offset > 0) {
                tooltipTop = shipCellTop - tooltipHeight - offset;
                tooltipLeft = hoveredCell.mouseX;
              }
              // Fallback to below
              else if (
                shipCellBottom + tooltipHeight + offset <
                (typeof window !== "undefined" ? window.innerHeight : 1000)
              ) {
                tooltipTop = shipCellBottom + offset;
                tooltipLeft = hoveredCell.mouseX;
              }
            }
          } else if (wouldCoverHorizontally) {
            // Only horizontal overlap - prefer based on ship type
            if (isCreatorShip) {
              // Creator ships: prefer left
              if (shipCellLeft - tooltipWidth - offset > 0) {
                tooltipLeft = shipCellLeft - tooltipWidth - offset;
              } else {
                tooltipLeft = shipCellRight + offset;
              }
            } else {
              // Joiner ships: prefer right
              if (
                shipCellRight + tooltipWidth + offset <
                (typeof window !== "undefined" ? window.innerWidth : 1000)
              ) {
                tooltipLeft = shipCellRight + offset;
              } else {
                tooltipLeft = shipCellLeft - tooltipWidth - offset;
              }
            }
          } else if (wouldCoverVertically) {
            // Only vertical overlap - move above or below
            if (shipCellTop - tooltipHeight - offset > 0) {
              tooltipTop = shipCellTop - tooltipHeight - offset;
            } else {
              tooltipTop = shipCellBottom + offset;
            }
          }

          // Ensure tooltip stays within viewport
          tooltipLeft = Math.max(
            0,
            Math.min(
              tooltipLeft,
              typeof window !== "undefined"
                ? window.innerWidth - tooltipWidth
                : tooltipLeft,
            ),
          );
          tooltipTop = Math.max(
            0,
            Math.min(
              tooltipTop,
              typeof window !== "undefined"
                ? window.innerHeight - tooltipHeight
                : tooltipTop,
            ),
          );

          return (
            <div
              className="fixed z-[100] pointer-events-none opacity-100"
              style={{
                left: `${tooltipLeft}px`,
                top: `${tooltipTop}px`,
              }}
            >
              <div className="w-80 opacity-100">
                <ShipCard
                  ship={ship}
                  isStarred={false}
                  onToggleStar={() => {}}
                  isSelected={false}
                  onToggleSelection={() => {}}
                  onRecycleClick={() => {}}
                  showInGameProperties={true}
                  inGameAttributes={attributes || undefined}
                  attributesLoading={!attributes}
                  hideRecycle={true}
                  hideCheckbox={true}
                  tooltipMode={true}
                  isCurrentPlayerShip={isShipOwnedByCurrentPlayer(
                    hoveredCell.shipId,
                  )}
                  flipShip={hoveredCell.isCreator}
                  hasMoved={movedShipIdsSet.has(hoveredCell.shipId)}
                  gameViewMode={true}
                />
              </div>
            </div>
          );
        })()}
    </>
  );
}
