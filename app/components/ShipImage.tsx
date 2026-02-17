import React from "react";
import { useShipRenderer } from "../hooks/useShipRenderer";
import { Ship } from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";

// Debug flag - set to false to disable console logs
const DEBUG_IMAGES = false;

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_IMAGES) {
    console.log(...args);
  }
}

interface ShipImageProps {
  ship: Ship;
  className?: string;
  showLoadingState?: boolean;
  style?: React.CSSProperties;
}

export function ShipImage({
  ship,
  className = "",
  showLoadingState = true,
  style,
}: ShipImageProps) {
  const { dataUrl, isLoading, error, renderKey } = useShipRenderer(ship);

  // Debug logging
  debugLog(
    `🖼️ ShipImage render for ship ${ship.id.toString()} (key: ${renderKey}):`,
    {
      dataUrl: dataUrl ? "present" : "null",
      isLoading,
      error,
      constructed: ship.shipData.constructed,
      destroyed: ship.shipData.timestampDestroyed > 0n,
    }
  );

  // Check ship state
  const isDestroyed = ship.shipData.timestampDestroyed > BigInt(0);
  const isNotConstructed = !ship.shipData.constructed;

  // Handle destroyed ships
  if (isDestroyed) {
    return (
      <div className={`relative ${className}`} style={style}>
        <img
          src="/img/ship-destroyed.png"
          alt={`Destroyed Ship #${ship.id.toString()}`}
          className="w-full h-full object-contain opacity-75"
        />
        <div className="absolute top-[11.5px] right-1 text-yellow-400 text-[0.4375rem]">
          {Array.from({ length: calculateShipRank(ship).rank }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
      </div>
    );
  }

  // Handle not constructed ships
  if (isNotConstructed) {
    return (
      <div className={`relative ${className}`} style={style}>
        <img
          src="/img/dry-dock.png"
          alt={`Unconstructed Ship #${ship.id.toString()}`}
          className="w-full h-full object-contain opacity-75"
        />
        <div className="absolute top-[11.5px] right-1 text-yellow-400 text-[0.4375rem]">
          {Array.from({ length: calculateShipRank(ship).rank }, (_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
      </div>
    );
  }

  // Handle loading state for constructed ships (including retries)
  // Only show loading if we don't have dataUrl (to prevent flash when re-rendering)
  if (isLoading && showLoadingState && !dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded-none ${className}`}
      >
        <div className="text-gray-400 text-xs text-center p-2">
          <div className="animate-spin text-lg mb-1">⏳</div>
          <div>Loading...</div>
          {error && <div className="text-yellow-400 text-xs mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  // Handle error or no data for constructed ships - keep showing loading instead of fallback
  // Only show loading if we don't have dataUrl (to prevent flash when re-rendering)
  if ((error || !dataUrl) && !dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded-none ${className}`}
      >
        <div className="text-gray-400 text-xs text-center p-2">
          <div className="animate-spin text-lg mb-1">⏳</div>
          <div>Loading...</div>
          {error && <div className="text-yellow-400 text-xs mt-1">{error}</div>}
        </div>
      </div>
    );
  }

  // Normal constructed ship with image
  return (
    <div className={`relative ${className}`} style={style}>
      <img
        src={dataUrl}
        alt={`Ship #${ship.id.toString()}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          console.error("Failed to load ship image:", e);
          // The error will be handled by the hook's error state
        }}
      />
      <div className="absolute top-[11.5px] right-1 text-yellow-400 text-[0.4375rem]">
        {Array.from({ length: calculateShipRank(ship).rank }, (_, i) => (
          <span key={i}>⭐</span>
        ))}
      </div>
    </div>
  );
}
