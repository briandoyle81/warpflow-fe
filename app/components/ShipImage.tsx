import React from "react";
import { useShipImageCache } from "../hooks/useShipImageCache";
import { Ship } from "../types/types";

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
}

export function ShipImage({
  ship,
  className = "",
  showLoadingState = true,
}: ShipImageProps) {
  const { dataUrl, isLoading, error, renderKey } = useShipImageCache(ship);

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
  const isDestroyed = ship.shipData.timestampDestroyed > 0n;
  const isNotConstructed = !ship.shipData.constructed;

  // Handle destroyed ships
  if (isDestroyed) {
    return (
      <div className={`relative ${className}`}>
        <img
          src="/img/ship-destroyed.png"
          alt={`Destroyed Ship #${ship.id.toString()}`}
          className="w-full h-full object-contain opacity-75"
        />
        {ship.shipData.shiny && (
          <div className="absolute top-1 right-1 text-yellow-400 text-lg animate-pulse">
            ✨
          </div>
        )}
      </div>
    );
  }

  // Handle not constructed ships
  if (isNotConstructed) {
    return (
      <div className={`relative ${className}`}>
        <img
          src="/img/dry-dock.png"
          alt={`Unconstructed Ship #${ship.id.toString()}`}
          className="w-full h-full object-contain opacity-75"
        />
        {ship.shipData.shiny && (
          <div className="absolute top-1 right-1 text-yellow-400 text-lg animate-pulse">
            ✨
          </div>
        )}
      </div>
    );
  }

  // Handle loading state for constructed ships (including retries)
  // Only show loading if we don't have dataUrl (to prevent flash when re-rendering)
  if (isLoading && showLoadingState && !dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded ${className}`}
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
        className={`flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded ${className}`}
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
    <div className={`relative ${className}`}>
      <img
        src={dataUrl}
        alt={`Ship #${ship.id.toString()}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          console.error("Failed to load ship image:", e);
          // The error will be handled by the hook's error state
        }}
      />
      {ship.shipData.shiny && (
        <div className="absolute top-1 right-1 text-yellow-400 text-lg animate-pulse">
          ✨
        </div>
      )}
    </div>
  );
}
