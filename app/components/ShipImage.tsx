import React from "react";
import { useShipImageCache } from "../hooks/useShipImageCache";
import { Ship } from "../types/types";

interface ShipImageProps {
  ship: Ship;
  className?: string;
  fallbackIcon?: React.ReactNode;
  showLoadingState?: boolean;
}

export function ShipImage({
  ship,
  className = "",
  fallbackIcon,
  showLoadingState = true,
}: ShipImageProps) {
  const { dataUrl, isLoading, error } = useShipImageCache(ship);

  // Default fallback icon
  const defaultFallback = (
    <div className="flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded">
      <div className="text-gray-400 text-xs text-center p-2">
        <div className="text-2xl mb-1">🚀</div>
        <div>Ship #{ship.id.toString()}</div>
        {ship.shipData.shiny && <div className="text-yellow-400">✨</div>}
      </div>
    </div>
  );

  if (isLoading && showLoadingState) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800/50 border border-gray-600 rounded ${className}`}
      >
        <div className="text-gray-400 text-xs text-center p-2">
          <div className="animate-spin text-lg mb-1">⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !dataUrl) {
    return <div className={className}>{fallbackIcon || defaultFallback}</div>;
  }

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
