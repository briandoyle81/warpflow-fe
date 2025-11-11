"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ShipPosition, Attributes, Ship } from "../types/types";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";

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
  validTargets: Array<{ shipId: bigint; position: { row: number; col: number } }>;
  assistableTargets: Array<{ shipId: bigint; position: { row: number; col: number } }>;
  assistableTargetsFromStart: Array<{ shipId: bigint; position: { row: number; col: number } }>;
  dragShootingRange: Array<{ row: number; col: number }>;
  dragValidTargets: Array<{ shipId: bigint; position: { row: number; col: number } }>;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: bigint) => boolean;
  movedShipIdsSet: Set<bigint>;
  specialType: number;
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
  calculateDamage: (targetShipId: bigint, weaponType?: "weapon" | "special", showReducedDamage?: boolean) => {
    reducedDamage: number;
    willKill: boolean;
    reactorCritical: boolean;
  };
  getShipAttributes: (shipId: bigint) => Attributes | null;
  disableTooltips: boolean;
  address: string | undefined;
  currentTurn: string;
  setSelectedShipId: (shipId: bigint | null) => void;
  setPreviewPosition: (position: { row: number; col: number } | null) => void;
  setTargetShipId: (shipId: bigint | null) => void;
  setSelectedWeaponType: (type: "weapon" | "special") => void;
  setHoveredCell: (cell: {
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null) => void;
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
          className="grid gap-0 border border-gray-900 grid-cols-[repeat(25,1fr)] grid-rows-[repeat(13,1fr)] w-full"
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
                  ? dragValidTargets.some((target) => target.shipId === cell.shipId)
                  : validTargets.some((target) => target.shipId === cell.shipId));

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
                          ? cell.shipId !== selectedShipId // Flak hits ALL ships in range except itself
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
                  className={`w-full h-full aspect-square ${
                    isShipOnScoringTile
                      ? "border-2 border-yellow-400"
                      : "border-0"
                  } outline outline-1 outline-gray-900 relative cursor-pointer ${
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
                  }`}
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
                    <div className="absolute inset-0 z-2 border-2 border-green-400 bg-green-500/20 pointer-events-none" />
                  )}

                  {/* Shooting range highlight */}
                  {isShootingTile && (
                    <div className="absolute inset-0 z-2 border-2 border-orange-400 bg-orange-500/20 pointer-events-none" />
                  )}

                  {/* Drag range highlight - show range from drag position */}
                  {draggedShipId && dragOverCell && (
                    <>
                      {dragShootingRange.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex
                      ) && (
                        <div className="absolute inset-0 z-2 border-2 border-orange-400 bg-orange-500/20 pointer-events-none" />
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
                            cell.shipId.toString()
                          );

                          // Create custom drag image that preserves ship orientation
                          // Find the ship image element (it's inside a div with class "relative")
                          const shipImageContainer =
                            e.currentTarget.querySelector(
                              ".relative img"
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
                      {/* Damage display for selected target or valid targets when dragging/previewing */}
                      {((isSelectedTarget &&
                        (previewPosition ||
                          selectedWeaponType === "special")) ||
                        ((draggedShipId && dragOverCell &&
                          dragValidTargets.some(
                            (target) => target.shipId === cell.shipId
                          )) ||
                        (previewPosition &&
                          validTargets.some(
                            (target) => target.shipId === cell.shipId
                          )))) && (
                        <div
                          className={`absolute -top-8 left-1/2 transform -translate-x-1/2 z-20 rounded px-2 py-1 text-xs font-mono text-white whitespace-nowrap ${
                            selectedWeaponType === "special"
                              ? specialType === 3 // Flak
                                ? "bg-orange-900 border border-orange-500" // Orange for flak
                                : "bg-blue-900 border border-blue-500" // Blue for other specials
                              : "bg-red-900 border border-red-500"
                          }`}
                        >
                          {(() => {
                            const damage = calculateDamage(
                              cell.shipId,
                              selectedWeaponType,
                              selectedWeaponType === "special" &&
                                specialType === 3
                                ? true
                                : undefined
                            ); // Use actual weapon type, show reduced damage for flak display
                            if (selectedWeaponType === "special") {
                              // Flak does damage, other special abilities repair/heal
                              if (specialType === 3) {
                                // Flak special - show damage effect
                                if (damage.reactorCritical) {
                                  return "⚡ Reactor Critical +1";
                                } else if (damage.willKill) {
                                  return `💀 ${damage.reducedDamage} DMG (KILL)`;
                                } else {
                                  return `⚔️ ${damage.reducedDamage} DMG`;
                                }
                              } else {
                                // Other special abilities - show repair/heal effect
                                return `🔧 Repair ${damage.reducedDamage} HP`;
                              }
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
            const cellWidth = gridRect.width / 25; // 25 columns
            const cellHeight = gridRect.height / 13; // 13 rows

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
                : tooltipLeft
            )
          );
          tooltipTop = Math.max(
            0,
            Math.min(
              tooltipTop,
              typeof window !== "undefined"
                ? window.innerHeight - tooltipHeight
                : tooltipTop
            )
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
                    hoveredCell.shipId
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
