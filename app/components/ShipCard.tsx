"use client";

import React from "react";
import { Ship } from "../types/types";
import { ShipImage } from "./ShipImage";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
import { calculateShipRank, getRankColor } from "../utils/shipLevel";
import { formatDestroyedDate } from "../utils/dateUtils";
import { Attributes } from "../types/types";

interface ShipCardProps {
  ship: Ship;
  isStarred: boolean;
  onToggleStar: () => void;
  isSelected: boolean;
  onToggleSelection: () => void;
  onRecycleClick: () => void;
  showInGameProperties: boolean;
  inGameAttributes?: Attributes;
  attributesLoading?: boolean;
  // Selection mode props
  selectionMode?: boolean;
  hideRecycle?: boolean;
  hideCheckbox?: boolean; // Hide the checkbox for recycling selection
  onCardClick?: () => void;
  canSelect?: boolean; // Whether the ship can be selected in selection mode
  tooltipMode?: boolean; // Use fully opaque backgrounds for tooltip display
  isCurrentPlayerShip?: boolean; // Whether this ship belongs to the current player (for tooltip border color)
  flipShip?: boolean; // Whether to flip the ship image horizontally (for joiner ships in tooltip)
  reactorCriticalStatus?: "none" | "warning" | "critical"; // Reactor critical status for game view borders
  hasMoved?: boolean; // Whether the ship has moved (for game view status display)
  gameViewMode?: boolean; // Explicitly mark this as game view for styling
}

const ShipCard: React.FC<ShipCardProps> = ({
  ship,
  isStarred,
  onToggleStar,
  isSelected,
  onToggleSelection,
  onRecycleClick,
  showInGameProperties,
  inGameAttributes,
  attributesLoading = false,
  selectionMode = false,
  hideRecycle = false,
  hideCheckbox = false,
  onCardClick,
  canSelect = true,
  tooltipMode = false,
  isCurrentPlayerShip = false,
  flipShip = false,
  reactorCriticalStatus = "none",
  hasMoved = false,
  gameViewMode = false,
}) => {
  // Determine border class based on selection mode and ship state
  const getBorderClass = () => {
    // Reactor critical status takes priority (for game view)
    if (reactorCriticalStatus === "critical") {
      return "border-red-500 bg-gray-900";
    }
    if (reactorCriticalStatus === "warning") {
      return "border-yellow-500 bg-gray-900";
    }

    // Game view (tooltip or Ship Details): blue for current player, red for opponent
    const isInGameView = tooltipMode || gameViewMode;

    if (
      isInGameView &&
      ship.shipData.constructed &&
      !ship.shipData.timestampDestroyed
    ) {
      return tooltipMode
        ? isCurrentPlayerShip
          ? "border-blue-400 bg-gray-900"
          : "border-red-400 bg-gray-900"
        : isCurrentPlayerShip
        ? "border-blue-400 bg-blue-400/20"
        : "border-red-400 bg-red-400/20";
    }

    if (selectionMode && isSelected) {
      return tooltipMode
        ? "border-green-400 bg-gray-900"
        : "border-green-400 bg-green-400/20";
    }
    if (ship.shipData.timestampDestroyed > 0n) {
      return tooltipMode
        ? "border-red-400 bg-gray-900"
        : "border-red-400 bg-black/60";
    }
    if (ship.shipData.inFleet) {
      return tooltipMode
        ? "border-orange-400 bg-gray-900"
        : "border-orange-400 bg-orange-400/20";
    }
    if (ship.shipData.constructed) {
      if (selectionMode) {
        return tooltipMode
          ? canSelect
            ? "border-gray-400 bg-gray-900"
            : "border-gray-400 bg-gray-900 opacity-50 cursor-not-allowed"
          : canSelect
          ? "border-gray-400 bg-black/40 hover:border-cyan-400 hover:bg-cyan-400/10"
          : "border-gray-400 bg-black/40 opacity-50 cursor-not-allowed";
      }
      return tooltipMode
        ? "border-green-400 bg-gray-900"
        : "border-green-400 bg-black/40";
    }
    return tooltipMode
      ? "border-gray-400 bg-gray-900"
      : "border-gray-400 bg-black/60";
  };

  const handleCardClick = () => {
    if (selectionMode && onCardClick && canSelect) {
      onCardClick();
    }
  };

  // Get industrial border styles
  const getIndustrialBorderStyle = () => {
    if (reactorCriticalStatus === "critical") {
      return {
        borderColor: "var(--color-warning-red)",
        borderTopColor: "var(--color-warning-red)",
        borderLeftColor: "var(--color-warning-red)",
        backgroundColor: "var(--color-slate)",
      };
    }
    if (reactorCriticalStatus === "warning") {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: "var(--color-slate)",
      };
    }

    const isInGameView = tooltipMode || gameViewMode;
    if (isInGameView && ship.shipData.constructed && !ship.shipData.timestampDestroyed) {
      return {
        borderColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        borderTopColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        borderLeftColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }

    if (selectionMode && isSelected) {
      return {
        borderColor: "var(--color-phosphor-green)",
        borderTopColor: "var(--color-phosphor-green)",
        borderLeftColor: "var(--color-phosphor-green)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.timestampDestroyed > 0n) {
      return {
        borderColor: "var(--color-warning-red)",
        borderTopColor: "var(--color-warning-red)",
        borderLeftColor: "var(--color-warning-red)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.inFleet) {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.constructed) {
      if (selectionMode) {
        return {
          borderColor: canSelect ? "var(--color-gunmetal)" : "var(--color-gunmetal)",
          borderTopColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          borderLeftColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          backgroundColor: "var(--color-slate)",
          opacity: canSelect ? 1 : 0.5,
        };
      }
      return {
        borderColor: "var(--color-phosphor-green)",
        borderTopColor: "var(--color-phosphor-green)",
        borderLeftColor: "var(--color-phosphor-green)",
        backgroundColor: "var(--color-near-black)",
      };
    }
    return {
      borderColor: "var(--color-gunmetal)",
      borderTopColor: "var(--color-steel)",
      borderLeftColor: "var(--color-steel)",
      backgroundColor: "var(--color-near-black)",
    };
  };

  const borderStyle = getIndustrialBorderStyle();

  return (
    <div
      className={`border border-solid p-4 ${
        selectionMode && canSelect
          ? "cursor-pointer transition-colors duration-150"
          : ""
      }`}
      style={{
        ...borderStyle,
        borderRadius: 0, // Square corners
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (selectionMode && canSelect && !isSelected) {
          e.currentTarget.style.borderColor = "var(--color-cyan)";
          e.currentTarget.style.borderTopColor = "var(--color-cyan)";
          e.currentTarget.style.borderLeftColor = "var(--color-cyan)";
          e.currentTarget.style.backgroundColor = "var(--color-steel)";
        }
      }}
      onMouseLeave={(e) => {
        if (selectionMode && canSelect && !isSelected) {
          e.currentTarget.style.borderColor = borderStyle.borderColor;
          e.currentTarget.style.borderTopColor = borderStyle.borderTopColor;
          e.currentTarget.style.borderLeftColor = borderStyle.borderLeftColor;
          e.currentTarget.style.backgroundColor = borderStyle.backgroundColor;
        }
      }}
    >
      {/* Ship Image - Bigger */}
      <div
        className="mb-3 relative"
        style={flipShip ? { transform: "scaleX(-1)" } : undefined}
      >
        <ShipImage
          key={`${ship.id.toString()}-${
            ship.shipData.constructed ? "constructed" : "unconstructed"
          }`}
          ship={ship}
          className="w-full h-48 border border-solid"
          style={{
            borderColor: "var(--color-gunmetal)",
            borderRadius: 0, // Square corners
          }}
          showLoadingState={true}
        />

        {/* Game view indicators for tooltip */}
        {(tooltipMode || gameViewMode) && inGameAttributes && (
          <>
            {/* Health bar for damaged ships */}
            {inGameAttributes.hullPoints < inGameAttributes.maxHullPoints && (
              <div className="absolute -top-2 left-0 right-0 z-10">
                <div
                  className="w-full h-1 transition-all duration-300"
                  style={{
                    backgroundColor: "var(--color-gunmetal)",
                    borderRadius: 0, // Square corners
                  }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        (inGameAttributes.hullPoints /
                          inGameAttributes.maxHullPoints) *
                          100 <=
                        25
                          ? "var(--color-warning-red)"
                          : "var(--color-phosphor-green)",
                      borderRadius: 0, // Square corners
                      width: `${
                        (inGameAttributes.hullPoints /
                          inGameAttributes.maxHullPoints) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Moved badge */}
            {hasMoved && (
              <div
                className={`absolute ${
                  flipShip ? "bottom-0 right-0" : "bottom-0 left-0"
                } m-1 w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center ${
                  isCurrentPlayerShip ? "bg-blue-700/80" : "bg-red-700/80"
                } text-white`}
              >
                M
              </div>
            )}

            {/* Reactor critical skulls */}
            {inGameAttributes.reactorCriticalTimer > 0 && (
              <div
                className={`absolute ${
                  flipShip ? "bottom-0 left-0" : "bottom-0 right-0"
                } m-1 text-[10px] font-mono`}
              >
                {"💀".repeat(
                  Math.min(inGameAttributes.reactorCriticalTimer, 3)
                )}
              </div>
            )}

            {/* Zero HP indicator */}
            {inGameAttributes.hullPoints === 0 && (
              <div className="absolute top-0 right-0 m-1 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center animate-pulse">
                <span className="text-xs">💀</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {/* Star icon where checkbox used to be */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className="p-1 hover:bg-yellow-400/10 rounded transition-all duration-200"
          >
            <svg
              className={`w-4 h-4 ${
                isStarred
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-yellow-400"
              }`}
              fill={isStarred ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
          <h5 className="font-bold text-lg">
            {ship.name || `Ship #${ship.id}`}
          </h5>
        </div>
        <div className="flex items-center gap-2">
          {/* Recycle icon */}
          {!hideRecycle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecycleClick();
              }}
              disabled={ship.shipData.inFleet}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                ship.shipData.inFleet
                  ? "Cannot recycle ship in fleet"
                  : "Recycle ship"
              }
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          {/* Checkbox for selection */}
          {!hideCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection();
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={ship.shipData.inFleet}
              className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                accentColor: "var(--color-cyan)",
                borderColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                backgroundColor: isSelected
                  ? "var(--color-cyan)"
                  : "var(--color-near-black)",
                borderTopColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                borderLeftColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                borderRadius: 0, // Square checkbox
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                width: "16px",
                height: "16px",
                border: "2px solid",
                position: "relative",
              }}
            />
          )}
          <span
            className="text-xs px-2 py-1 border border-solid uppercase font-semibold tracking-wider"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              backgroundColor: ship.shipData.shiny
                ? "var(--color-near-black)"
                : "var(--color-near-black)",
              color: ship.shipData.shiny
                ? "var(--color-amber)"
                : "var(--color-text-secondary)",
              borderColor: ship.shipData.shiny
                ? "var(--color-amber)"
                : "var(--color-gunmetal)",
              borderTopColor: ship.shipData.shiny
                ? "var(--color-amber)"
                : "var(--color-steel)",
              borderLeftColor: ship.shipData.shiny
                ? "var(--color-amber)"
                : "var(--color-steel)",
              borderRadius: 0, // Square corners
            }}
          >
            {ship.shipData.shiny ? "SHINY ✨" : "COMMON"}
          </span>
          {/* Rank */}
          {ship.shipData.constructed && (
            <span
              className="text-xs px-2 py-1 border border-solid uppercase font-semibold tracking-wider"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                backgroundColor: "var(--color-near-black)",
                color: "var(--color-text-primary)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                borderRadius: 0, // Square corners
              }}
            >
              R{calculateShipRank(ship).rank}
            </span>
          )}
        </div>
      </div>

      {/* Compact Stats or Construction Message */}
      <div className="space-y-2 text-sm">
        {ship.shipData.constructed ? (
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs relative">
            {showInGameProperties ? (
              // In-Game Properties
              (() => {
                if (!inGameAttributes) {
                  return (
                    <div className="col-span-3 text-center text-gray-400 text-xs">
                      {attributesLoading
                        ? "Loading attributes..."
                        : "Attributes not available"}
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="opacity-60">Weapon:</span>
                      <span className="ml-2">
                        {getMainWeaponName(ship.equipment.mainWeapon)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Range:</span>
                      <span className="ml-2">{inGameAttributes.range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Damage:</span>
                      <span className="ml-2">{inGameAttributes.gunDamage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Hull:</span>
                      <span className="ml-2">
                        {inGameAttributes.hullPoints}/
                        {inGameAttributes.maxHullPoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Move:</span>
                      <span className="ml-2">{inGameAttributes.movement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Armor:</span>
                      <span className="ml-2">
                        {inGameAttributes.damageReduction}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Special:</span>
                      <span className="ml-2">
                        {getSpecialName(ship.equipment.special)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center col-span-3">
                      <div className="flex items-center">
                        <span className="opacity-60">Status:</span>
                        <span
                          className={`ml-2 ${
                            ship.shipData.timestampDestroyed > 0n
                              ? "text-red-400"
                              : hasMoved
                              ? "text-orange-400"
                              : gameViewMode || tooltipMode
                              ? "text-blue-400" // Unmoved in game view
                              : ship.shipData.inFleet
                              ? "text-orange-400"
                              : "text-green-400"
                          }`}
                        >
                          {ship.shipData.timestampDestroyed > 0n
                            ? `DESTROYED ${formatDestroyedDate(ship.shipData.timestampDestroyed)}`
                            : hasMoved
                            ? "MOVED"
                            : gameViewMode || tooltipMode
                            ? "READY" // Unmoved in game view
                            : ship.shipData.inFleet
                            ? "IN FLEET"
                            : "READY"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="opacity-60">Cost:</span>
                        <span className="ml-2 font-bold">
                          {ship.shipData.cost}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              // NFT Properties (original)
              <>
                <div className="flex justify-between">
                  <span className="opacity-60">Acc:</span>
                  <span className="ml-2">{ship.traits.accuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Hull:</span>
                  <span className="ml-2">{ship.traits.hull}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Speed:</span>
                  <span className="ml-2">{ship.traits.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Wpn:</span>
                  <span className="ml-2">
                    {getMainWeaponName(ship.equipment.mainWeapon)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">
                    {ship.equipment.shields > 0 ? "Shd:" : "Arm:"}
                  </span>
                  <span className="ml-2">
                    {ship.equipment.shields > 0
                      ? getShieldName(ship.equipment.shields)
                      : getArmorName(ship.equipment.armor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Spc:</span>
                  <span className="ml-2">
                    {getSpecialName(ship.equipment.special)}
                  </span>
                </div>
                <div className="flex justify-between items-center col-span-3">
                  <div className="flex items-center">
                    <span className="opacity-60">Status:</span>
                    <span
                      className={`ml-2 ${
                        ship.shipData.timestampDestroyed > 0n
                          ? "text-red-400"
                          : hasMoved
                          ? "text-orange-400"
                          : gameViewMode || tooltipMode
                          ? "text-blue-400" // Unmoved in game view
                          : ship.shipData.inFleet
                          ? "text-orange-400"
                          : "text-green-400"
                      }`}
                    >
                      {ship.shipData.timestampDestroyed > 0n
                        ? `DESTROYED ${formatDestroyedDate(ship.shipData.timestampDestroyed)}`
                        : hasMoved
                        ? "MOVED"
                        : gameViewMode || tooltipMode
                        ? "READY" // Unmoved in game view
                        : ship.shipData.inFleet
                        ? "IN FLEET"
                        : "READY"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="opacity-60">Cost:</span>
                    <span className="ml-2 font-bold">{ship.shipData.cost}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-4 px-2">
            <div className="text-gray-400 text-sm font-mono font-bold">
              [CONSTRUCT SHIP]
            </div>
          </div>
        )}
      </div>
      {/* Selection Indicator */}
      {selectionMode && isSelected && (
        <div className="mt-2 text-center">
          <span className="text-green-400 text-sm font-bold">✓ SELECTED</span>
        </div>
      )}
    </div>
  );
};

export default ShipCard;
