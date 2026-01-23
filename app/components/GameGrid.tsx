"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
    showReducedDamage?: boolean
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
    } | null
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
          className="relative grid gap-0 border border-gray-900 grid-cols-[repeat(25,1fr)] grid-rows-[repeat(13,1fr)] w-full"
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const ship = cell ? shipMap.get(cell.shipId) : null;
              const isSelected = selectedShipId === cell?.shipId;
              const isMovementTile = movementRange.some(
                (pos) => pos.row === rowIndex && pos.col === colIndex
              );
              const isHighlightedMove =
                highlightedMovePosition &&
                highlightedMovePosition.row === rowIndex &&
                highlightedMovePosition.col === colIndex;
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
                  ? dragValidTargets.some(
                      (target) => target.shipId === cell.shipId
                    )
                  : validTargets.some(
                      (target) => target.shipId === cell.shipId
                    ));

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

                      // Check for other conditions that might override
                      if (
                        hasShipMoved &&
                        isCurrentPlayerTurn &&
                        isShipOwnedByCurrentPlayer(cell.shipId)
                      ) {
                        return "bg-gray-700 opacity-60 cursor-not-allowed";
                      }
                      if (isSelectedTarget) {
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

                    // Default styling chain
                    return hasShipMoved &&
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
                        (pos) => pos.row === rowIndex && pos.col === colIndex
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
            })
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
              const cellWidth = gridRect.width / 25;
              const cellHeight = gridRect.height / 13;

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
                    const damage = calculateDamage(
                      target.shipId,
                      selectedWeaponType,
                      selectedWeaponType === "special" && specialType === 3
                        ? true
                        : undefined
                    );

                    let labelText: string;
                    if (selectedWeaponType === "special") {
                      // Flak does damage, other special abilities repair/heal
                      if (specialType === 3) {
                        // Flak special - show damage effect
                        if (damage.reactorCritical) {
                          labelText = "⚡ Reactor Critical +1";
                        } else if (damage.willKill) {
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
                    } else if (damage.willKill) {
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

// Laser Shooting Animation Component
interface LaserShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

function LaserShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: LaserShootingAnimationProps) {
  const [lines, setLines] = useState<
    Array<{ id: number; endX: number; endY: number }>
  >([]);
  const lineIdRef = useRef(0);

  // Calculate cell centers relative to grid container
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 25;
      const cellHeight = gridRect.height / 13;

      // Calculate position relative to grid container (not screen)
      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Create a new line
  const createLine = useCallback(() => {
    if (!gridContainerRef.current) return;

    const targetCenter = getCellCenter(targetRow, targetCol);

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    // Random point within target cell (80% of cell size to keep it within bounds)
    const randomX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.8;
    const randomY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.8;

    const newLine = {
      id: lineIdRef.current++,
      endX: randomX,
      endY: randomY,
    };

    setLines((prev) => [...prev, newLine]);

    // Remove line after fade animation (0.5s)
    setTimeout(() => {
      setLines((prev) => prev.filter((line) => line.id !== newLine.id));
    }, 500);
  }, [targetRow, targetCol, getCellCenter]);

  // Continuously create new lines
  useEffect(() => {
    // Create first line immediately
    createLine();

    // Create new lines continuously
    const interval = setInterval(() => {
      createLine();
    }, 500); // Create a new line every 0.5 seconds

    return () => clearInterval(interval);
  }, [createLine]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();
  const attackerCenter = getCellCenter(attackerRow, attackerCol);

  return (
    <svg
      className="absolute pointer-events-none z-5"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {lines.map((line) => {
        // Calculate line length and angle
        const dx = line.endX - attackerCenter.x;
        const dy = line.endY - attackerCenter.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <rect
            key={line.id}
            x={attackerCenter.x}
            y={attackerCenter.y - 1}
            width={length}
            height="2"
            fill="red"
            stroke="red"
            strokeWidth="0"
            transform={`rotate(${angle} ${attackerCenter.x} ${attackerCenter.y})`}
            className="animate-laser-fade"
          />
        );
      })}
    </svg>
  );
}

// Missile Shooting Animation Component
interface MissileShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

function MissileShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: MissileShootingAnimationProps) {
  const [missiles, setMissiles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      angle: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      driftX: number;
      driftY: number;
      spawnX: number;
      spawnY: number;
      driftStartTime: number;
      startTime: number;
    }>
  >([]);
  const missileIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 25;
      const cellHeight = gridRect.height / 13;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Select target spot and spawn missile
  const spawnMissile = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getCellCenter(attackerRow, attackerCol);
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Select a random target spot within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.8;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.8;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const targetAngle = Math.atan2(dy, dx);

    // Initial direction: 90 degrees counter-clockwise from target direction
    // with random variation of up to ±30 degrees
    const angleVariation = (Math.random() - 0.5) * ((30 * Math.PI) / 180); // ±30 degrees in radians
    const initialAngle = targetAngle + Math.PI / 2 + angleVariation;

    // Calculate initial drift position (0.25 seconds at start speed)
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const TOP_SPEED = avgCellSize * 4;
    const START_SPEED = TOP_SPEED / 8;
    const INITIAL_DRIFT_TIME = 0.5;
    const driftDistance = START_SPEED * INITIAL_DRIFT_TIME;

    const driftX = attackerCenter.x + Math.cos(initialAngle) * driftDistance;
    const driftY = attackerCenter.y + Math.sin(initialAngle) * driftDistance;

    // New path from drift position to target
    const newDx = targetX - driftX;
    const newDy = targetY - driftY;

    // Angle for triangle orientation (always point at target)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    // Spawn first missile at attacker position
    const firstMissile = {
      id: missileIdRef.current++,
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: driftX, // Acceleration starts from drift position
      startY: driftY,
      driftX, // Store drift position
      driftY,
      spawnX: attackerCenter.x, // Store spawn position
      spawnY: attackerCenter.y,
      driftStartTime: Date.now(),
      startTime: Date.now() + INITIAL_DRIFT_TIME * 1000, // Acceleration starts after drift
    };

    setMissiles([firstMissile]);

    // Fire second missile 0.1 seconds after the first
    setTimeout(() => {
      // Select a new random target spot for the second missile
      const targetX2 = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.8;
      const targetY2 =
        targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.8;

      // Calculate direction to target for second missile
      const dx2 = targetX2 - attackerCenter.x;
      const dy2 = targetY2 - attackerCenter.y;
      const targetAngle2 = Math.atan2(dy2, dx2);

      // Initial direction with random variation
      const angleVariation2 = (Math.random() - 0.5) * ((30 * Math.PI) / 180);
      const initialAngle2 = targetAngle2 + Math.PI / 2 + angleVariation2;

      const driftDistance2 = START_SPEED * INITIAL_DRIFT_TIME;
      const driftX2 =
        attackerCenter.x + Math.cos(initialAngle2) * driftDistance2;
      const driftY2 =
        attackerCenter.y + Math.sin(initialAngle2) * driftDistance2;

      const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI) + 90;

      const secondMissile = {
        id: missileIdRef.current++,
        x: attackerCenter.x,
        y: attackerCenter.y,
        angle: angle2,
        targetX: targetX2,
        targetY: targetY2,
        startX: driftX2,
        startY: driftY2,
        driftX: driftX2,
        driftY: driftY2,
        spawnX: attackerCenter.x,
        spawnY: attackerCenter.y,
        driftStartTime: Date.now(),
        startTime: Date.now() + INITIAL_DRIFT_TIME * 1000,
      };

      setMissiles((prev) => [...prev, secondMissile]);
    }, 100);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
  ]);

  // Handle missile despawn and respawn
  useEffect(() => {
    if (missiles.length === 0) {
      // No missiles - wait 1 second then spawn next pair
      timeoutRef.current = setTimeout(() => {
        spawnMissile();
      }, 1000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [missiles.length, spawnMissile]);

  // Animate missile movement
  useEffect(() => {
    if (missiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const avgCellSize = (cellWidth + cellHeight) / 2;

    // Constant speed values (pixels per second)
    const TOP_SPEED = avgCellSize * 4;
    const START_SPEED = TOP_SPEED / 8;
    const INITIAL_DRIFT_TIME = 0.5;
    const ACCELERATION_TIME = 0.125;
    const ACCELERATION = (TOP_SPEED - START_SPEED) / ACCELERATION_TIME;

    const animate = () => {
      const updatedMissiles = missiles
        .map((missile) => {
          // Calculate direction to target for initial drift
          const targetDx = missile.targetX - missile.spawnX;
          const targetDy = missile.targetY - missile.spawnY;
          const targetAngle = Math.atan2(targetDy, targetDx);
          const initialAngle = targetAngle + Math.PI / 2; // 90 degrees CCW from target

          // Distance from drift position to target
          const dx = missile.targetX - missile.startX;
          const dy = missile.targetY - missile.startY;
          const totalDistance = Math.sqrt(dx * dx + dy * dy);

          // Calculate distance covered during acceleration phase
          const accelerationDistance =
            START_SPEED * ACCELERATION_TIME +
            0.5 * ACCELERATION * ACCELERATION_TIME * ACCELERATION_TIME;
          const reachesTargetDuringAccel =
            accelerationDistance >= totalDistance;

          const totalElapsed = (Date.now() - missile.driftStartTime) / 1000;
          const driftElapsed = totalElapsed;
          const accelerationElapsed = totalElapsed - INITIAL_DRIFT_TIME;

          let currentX: number;
          let currentY: number;

          // Always point at target
          const angleDx = missile.targetX - (missile.x || missile.spawnX);
          const angleDy = missile.targetY - (missile.y || missile.spawnY);
          const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI) + 90;

          if (driftElapsed < INITIAL_DRIFT_TIME) {
            // Initial drift phase: move 90 degrees from target direction at start speed
            const driftDistance = START_SPEED * driftElapsed;
            currentX = missile.spawnX + Math.cos(initialAngle) * driftDistance;
            currentY = missile.spawnY + Math.sin(initialAngle) * driftDistance;
          } else if (accelerationElapsed >= 0) {
            // Acceleration phase (after drift) - move from drift position to target
            let distanceTraveled = 0;

            if (reachesTargetDuringAccel) {
              // Target reached during acceleration
              const a = 0.5 * ACCELERATION;
              const b = START_SPEED;
              const c = -totalDistance;
              const discriminant = b * b - 4 * a * c;
              const timeToTarget = (-b + Math.sqrt(discriminant)) / (2 * a);

              if (accelerationElapsed < timeToTarget) {
                distanceTraveled =
                  START_SPEED * accelerationElapsed +
                  0.5 *
                    ACCELERATION *
                    accelerationElapsed *
                    accelerationElapsed;
              } else {
                distanceTraveled = totalDistance;
              }
            } else {
              // Acceleration then constant speed
              if (accelerationElapsed < ACCELERATION_TIME) {
                distanceTraveled =
                  START_SPEED * accelerationElapsed +
                  0.5 *
                    ACCELERATION *
                    accelerationElapsed *
                    accelerationElapsed;
              } else {
                const remainingDistance = totalDistance - accelerationDistance;
                const constantSpeedTime = remainingDistance / TOP_SPEED;
                const timeInConstantPhase =
                  accelerationElapsed - ACCELERATION_TIME;

                if (timeInConstantPhase < constantSpeedTime) {
                  distanceTraveled =
                    accelerationDistance + TOP_SPEED * timeInConstantPhase;
                } else {
                  distanceTraveled = totalDistance;
                }
              }
            }

            const progress = Math.min(distanceTraveled / totalDistance, 1);
            currentX =
              missile.startX + (missile.targetX - missile.startX) * progress;
            currentY =
              missile.startY + (missile.targetY - missile.startY) * progress;
          } else {
            // Shouldn't happen, but fallback
            currentX = missile.x;
            currentY = missile.y;
          }

          // Check if reached target
          const distanceToTarget = Math.sqrt(
            Math.pow(currentX - missile.targetX, 2) +
              Math.pow(currentY - missile.targetY, 2)
          );

          if (distanceToTarget <= 0.1) {
            // Missile reached target - mark for removal
            return null;
          }

          return {
            ...missile,
            x: currentX,
            y: currentY,
            angle,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      setMissiles(updatedMissiles);

      if (updatedMissiles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [missiles, gridContainerRef]);

  // Start first missile
  useEffect(() => {
    spawnMissile();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [spawnMissile]);

  if (!gridContainerRef.current || missiles.length === 0) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  // Create acute isosceles triangle points
  // Triangle points: tip at (0, 0), base points at (-base/2, height) and (base/2, height)
  const triangleSize = 8; // Base width
  const triangleHeight = 12; // Height
  const tipX = 0;
  const tipY = 0;
  const baseLeftX = -triangleSize / 2;
  const baseRightX = triangleSize / 2;
  const baseY = triangleHeight;

  return (
    <svg
      className="absolute pointer-events-none z-5"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {missiles.map((missile) => (
        <polygon
          key={missile.id}
          points={`${tipX},${tipY} ${baseLeftX},${baseY} ${baseRightX},${baseY}`}
          fill="red"
          stroke="red"
          strokeWidth="0"
          transform={`translate(${missile.x}, ${missile.y}) rotate(${missile.angle})`}
        />
      ))}
    </svg>
  );
}

// Plasma Shooting Animation Component
interface PlasmaShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

function PlasmaShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: PlasmaShootingAnimationProps) {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      progress: number;
      spread: number;
      size: number;
      opacity: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 25;
      const cellHeight = gridRect.height / 13;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Create a new particle
  const createParticle = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getCellCenter(attackerRow, attackerCol);
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Random point within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;

    // Start particles from the center of the firing ship's cell (y-axis)
    const startY = attackerCenter.y;

    const targetX = targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.8;
    const targetY = targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.8;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Create particle with spread (flamethrower effect)
    // Spread increases as it travels (cone shape)
    const spread = (Math.random() - 0.5) * 0.15; // Random spread angle in radians (tighter spread)
    const size = 4 + Math.random() * 4; // Random size between 4-8px
    const opacity = 1.0; // Fully opaque

    const newParticle = {
      id: particleIdRef.current++,
      x: attackerCenter.x,
      y: startY, // Start from below the firing ship
      progress: 0,
      spread,
      size,
      opacity,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: startY, // Start from below the firing ship
      startTime: Date.now(),
      travelTime: 0.3 + Math.random() * 0.2, // 0.3-0.5 seconds travel time
    };

    setParticles((prev) => [...prev, newParticle]);

    // Remove particle after it reaches target
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, newParticle.travelTime * 1000);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
  ]);

  // Continuously create particles
  useEffect(() => {
    // Create first particle immediately
    createParticle();

    // Create new particles continuously
    const interval = setInterval(() => {
      createParticle();
    }, 25); // Create a new particle every 25ms for a continuous stream (doubled from 50ms)

    return () => clearInterval(interval);
  }, [createParticle]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      const now = Date.now();
      const updatedParticles = particles
        .map((particle) => {
          const elapsed = (now - particle.startTime) / 1000;
          const progress = Math.min(elapsed / particle.travelTime, 1);

          if (progress >= 1) {
            return null; // Particle reached target
          }

          // Calculate position along the path with spread
          const dx = particle.targetX - particle.startX;
          const dy = particle.targetY - particle.startY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Apply spread (cone effect) - spread increases with progress
          const spreadDistance = particle.spread * distance * progress * 0.5;
          const spreadAngle = angle + Math.PI / 2; // Perpendicular to path

          const baseX = particle.startX + dx * progress;
          const baseY = particle.startY + dy * progress;
          const currentX = baseX + Math.cos(spreadAngle) * spreadDistance;
          const currentY = baseY + Math.sin(spreadAngle) * spreadDistance;

          // Keep fully opaque (no fade)
          const currentOpacity = particle.opacity;

          return {
            ...particle,
            x: currentX,
            y: currentY,
            progress,
            opacity: currentOpacity,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setParticles(updatedParticles);

      if (updatedParticles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles]);

  if (!gridContainerRef.current) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  return (
    <svg
      className="absolute pointer-events-none z-15"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {particles.map((particle) => (
        <circle
          key={particle.id}
          cx={particle.x}
          cy={particle.y}
          r={particle.size}
          fill="#6495ED"
          opacity={particle.opacity}
        />
      ))}
    </svg>
  );
}

// Railgun Shooting Animation Component
interface RailgunShootingAnimationProps {
  gridContainerRef: React.RefObject<HTMLDivElement>;
  attackerRow: number;
  attackerCol: number;
  targetRow: number;
  targetCol: number;
}

function RailgunShootingAnimation({
  gridContainerRef,
  attackerRow,
  attackerCol,
  targetRow,
  targetCol,
}: RailgunShootingAnimationProps) {
  const [projectiles, setProjectiles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      angle: number;
      targetX: number;
      targetY: number;
      startX: number;
      startY: number;
      startTime: number;
      travelTime: number;
    }>
  >([]);
  const projectileIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate cell centers
  const getCellCenter = useCallback(
    (row: number, col: number) => {
      if (!gridContainerRef.current) return { x: 0, y: 0 };

      const gridRect = gridContainerRef.current.getBoundingClientRect();
      const cellWidth = gridRect.width / 25;
      const cellHeight = gridRect.height / 13;

      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;

      return { x, y };
    },
    [gridContainerRef]
  );

  // Spawn a new projectile
  const spawnProjectile = useCallback(() => {
    if (!gridContainerRef.current) return;

    const attackerCenter = getCellCenter(attackerRow, attackerCol);
    const targetCenter = getCellCenter(targetRow, targetCol);

    // Select a random target spot within target cell
    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const targetX =
      targetCenter.x + (Math.random() - 0.5) * cellWidth * 0.8;
    const targetY =
      targetCenter.y + (Math.random() - 0.5) * cellHeight * 0.8;

    // Calculate direction to target
    const dx = targetX - attackerCenter.x;
    const dy = targetY - attackerCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // High speed constant rate (faster than missiles)
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const SPEED = avgCellSize * 8; // 8 cells per second (2x faster than missiles)
    const travelTime = distance / SPEED; // Constant speed, travel time varies by distance

    const newProjectile = {
      id: projectileIdRef.current++,
      x: attackerCenter.x,
      y: attackerCenter.y,
      angle,
      targetX,
      targetY,
      startX: attackerCenter.x,
      startY: attackerCenter.y,
      startTime: Date.now(),
      travelTime,
    };

    setProjectiles((prev) => [...prev, newProjectile]);

    // Remove projectile after it reaches target
    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== newProjectile.id));
    }, travelTime * 1000);
  }, [
    gridContainerRef,
    attackerRow,
    attackerCol,
    targetRow,
    targetCol,
    getCellCenter,
  ]);

  // Handle projectile despawn and respawn
  useEffect(() => {
    if (projectiles.length === 0) {
      // All projectiles despawned, wait before spawning next one (slow rate of fire)
      timeoutRef.current = setTimeout(() => {
        spawnProjectile();
      }, 2000); // 2 seconds between shots (slower than missiles which are 1 second)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [projectiles, spawnProjectile]);

  // Animate projectiles
  useEffect(() => {
    if (projectiles.length === 0) return;
    if (!gridContainerRef.current) return;

    const gridRect = gridContainerRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 25;
    const cellHeight = gridRect.height / 13;
    const avgCellSize = (cellWidth + cellHeight) / 2;
    const SPEED = avgCellSize * 8; // Constant speed

    const animate = () => {
      const now = Date.now();
      const updatedProjectiles = projectiles
        .map((projectile) => {
          const elapsed = (now - projectile.startTime) / 1000;
          const progress = Math.min(elapsed / projectile.travelTime, 1);

          if (progress >= 1) {
            // Projectile reached target - mark for removal
            return null;
          }

          // Constant speed movement
          const currentX =
            projectile.startX +
            (projectile.targetX - projectile.startX) * progress;
          const currentY =
            projectile.startY +
            (projectile.targetY - projectile.startY) * progress;

          // Always point at target
          const angleDx = projectile.targetX - currentX;
          const angleDy = projectile.targetY - currentY;
          const angle = Math.atan2(angleDy, angleDx) * (180 / Math.PI);

          return {
            ...projectile,
            x: currentX,
            y: currentY,
            angle,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setProjectiles(updatedProjectiles);

      if (updatedProjectiles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [projectiles, gridContainerRef]);

  // Start first projectile
  useEffect(() => {
    spawnProjectile();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [spawnProjectile]);

  if (!gridContainerRef.current || projectiles.length === 0) return null;

  const gridRect = gridContainerRef.current.getBoundingClientRect();

  // Create cylinder shape (small rectangle)
  const cylinderWidth = 3; // Width of cylinder (reduced by 50%)
  const cylinderHeight = 6; // Length of cylinder (reduced by 50%)

  return (
    <svg
      className="absolute pointer-events-none z-15"
      style={{
        left: `0px`,
        top: `0px`,
        width: `${gridRect.width}px`,
        height: `${gridRect.height}px`,
      }}
      viewBox={`0 0 ${gridRect.width} ${gridRect.height}`}
      preserveAspectRatio="none"
    >
      {projectiles.map((projectile) => (
        <rect
          key={projectile.id}
          x={-cylinderWidth / 2}
          y={-cylinderHeight / 2}
          width={cylinderWidth}
          height={cylinderHeight}
          fill="white"
          stroke="white"
          strokeWidth="1"
          transform={`translate(${projectile.x}, ${projectile.y}) rotate(${projectile.angle + 90})`}
        />
      ))}
    </svg>
  );
}
