import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";
import {
  getCachedShipData,
  cacheShipData,
} from "./useShipDataCache";

// Debug flag
const DEBUG_RENDERER = false;

// Re-export rendering mode functions for compatibility
export { getUseLocalRendering, setUseLocalRendering } from "./useShipImageCache";

// Debug logging function
function debugLog(...args: unknown[]) {
  if (DEBUG_RENDERER) {
    console.log(...args);
  }
}

// In-memory cache for rendered images (LRU-style, max 100 images)
const renderedImageCache = new Map<string, string>();
const MAX_RENDERED_CACHE_SIZE = 100;
const renderedImageAccessOrder: string[] = [];

/**
 * Get cache key for rendered image
 */
function getRenderedImageKey(ship: Ship): string {
  // Create a key based on ship properties that affect rendering
  const key = `${ship.id.toString()}-${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}-${ship.traits.accuracy}-${ship.traits.hull}-${ship.traits.speed}-${ship.traits.colors.h1}-${ship.traits.colors.s1}-${ship.traits.colors.l1}-${ship.shipData.shiny}-${ship.shipData.constructed}`;
  return key;
}

/**
 * Get rendered image from in-memory cache
 */
function getCachedRenderedImage(ship: Ship): string | null {
  const key = getRenderedImageKey(ship);
  const cached = renderedImageCache.get(key);
  if (cached) {
    // Update access order
    const index = renderedImageAccessOrder.indexOf(key);
    if (index > -1) {
      renderedImageAccessOrder.splice(index, 1);
    }
    renderedImageAccessOrder.push(key);
    debugLog(`🎨 Using cached rendered image for ship ${ship.id.toString()}`);
    return cached;
  }
  return null;
}

/**
 * Cache rendered image in memory
 */
function cacheRenderedImage(ship: Ship, dataUrl: string): void {
  const key = getRenderedImageKey(ship);

  // If cache is full, remove oldest entry
  if (renderedImageCache.size >= MAX_RENDERED_CACHE_SIZE) {
    const oldestKey = renderedImageAccessOrder.shift();
    if (oldestKey) {
      renderedImageCache.delete(oldestKey);
      debugLog(`🗑️ Removed oldest rendered image from cache: ${oldestKey}`);
    }
  }

  renderedImageCache.set(key, dataUrl);
  renderedImageAccessOrder.push(key);
  debugLog(`💾 Cached rendered image for ship ${ship.id.toString()}`);
}

interface ShipImageState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  renderKey: number;
}

/**
 * Hook for rendering ship images using local TypeScript renderer
 * This replaces useShipImageCache and eliminates the need for tokenURI contract calls
 */
export function useShipRenderer(ship: Ship): ShipImageState {
  const [imageState, setImageState] = useState<Omit<ShipImageState, "renderKey">>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });
  const [renderKey, setRenderKey] = useState(0);
  const shipId = ship?.id?.toString() || "unknown";

  // Use ref to track if we've already processed this ship to prevent infinite loops
  const processedKeyRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const shipRef = useRef<Ship>(ship);

  // Validate ship structure early - set error state if invalid
  const isValidShip = ship && ship.equipment && ship.traits && ship.shipData;

  // Create a stable key for this ship based on its properties
  const shipKey = useMemo(() => {
    if (!isValidShip) return "invalid";
    return `${ship.id.toString()}-${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}-${ship.traits.accuracy}-${ship.traits.hull}-${ship.traits.speed}-${ship.shipData.constructed}-${ship.shipData.timestampDestroyed.toString()}`;
  }, [
    isValidShip,
    ship?.id,
    ship?.equipment?.mainWeapon,
    ship?.equipment?.armor,
    ship?.equipment?.shields,
    ship?.equipment?.special,
    ship?.traits?.accuracy,
    ship?.traits?.hull,
    ship?.traits?.speed,
    ship?.shipData?.constructed,
    ship?.shipData?.timestampDestroyed,
  ]);

  // Update ship ref immediately when ship changes
  // We update it inline to avoid dependency array issues
  shipRef.current = ship;

  // Check ship state
  const isDestroyed = isValidShip && ship.shipData.timestampDestroyed > BigInt(0);
  const isNotConstructed = isValidShip && !ship.shipData.constructed;

  // Load and render image
  useEffect(() => {
    // If ship is invalid, set error state and return
    if (!isValidShip) {
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: "Invalid ship data structure",
      });
      return;
    }

    // Prevent infinite loops by checking if we've already processed this exact ship
    if (processedKeyRef.current === shipKey && !isProcessingRef.current) {
      return;
    }

    // If we're already processing, don't start another render
    if (isProcessingRef.current) {
      return;
    }

    const currentShipForLog = shipRef.current;
    debugLog(`🔍 Rendering ship ${shipId}, constructed: ${currentShipForLog.shipData.constructed}, destroyed: ${isDestroyed}`);

    // For unconstructed or destroyed ships, don't try to render
    if (isNotConstructed || isDestroyed) {
      debugLog(`🚫 Ship ${shipId} is ${isNotConstructed ? "not constructed" : "destroyed"}, skipping render`);
      processedKeyRef.current = shipKey;
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;

    // Use ship from ref - safe because we track by shipKey and update ref when key changes
    const currentShip = shipRef.current;

    // Check in-memory cache first
    const cachedImage = getCachedRenderedImage(currentShip);
    if (cachedImage) {
      processedKeyRef.current = shipKey;
      isProcessingRef.current = false;
      setImageState({
        dataUrl: cachedImage,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check if ship data is cached (for validation)
    const cachedShipData = getCachedShipData(currentShip.id);
    if (cachedShipData) {
      debugLog(`📦 Found cached ship data for ${shipId}, using it for validation`);
    }

    // Always cache the current ship data
    cacheShipData(currentShip);

    // Generate image
    setImageState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Always use local renderer when ship data is available
      const dataUrl = renderShip(currentShip);

      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error(`renderShip returned invalid result: ${dataUrl}`);
      }

      // Cache the rendered image
      cacheRenderedImage(currentShip, dataUrl);

      if (dataUrl) {
        // Test the image before using it
        const testImg = new Image();
        testImg.onload = () => {
          debugLog(`✅ Image for ship ${shipId} is valid`);
          processedKeyRef.current = shipKey;
          isProcessingRef.current = false;
          setImageState({
            dataUrl,
            isLoading: false,
            error: null,
          });
          setRenderKey((prev) => prev + 1);
        };
        testImg.onerror = () => {
          debugLog(`❌ Image for ship ${shipId} is invalid`);
          processedKeyRef.current = shipKey;
          isProcessingRef.current = false;
          setImageState({
            dataUrl: null,
            isLoading: false,
            error: "Failed to generate valid image",
          });
        };
        testImg.src = dataUrl;
      } else {
        processedKeyRef.current = shipKey;
        isProcessingRef.current = false;
        const errorMsg = `Failed to generate image for ship ${shipId}. Check console for details.`;
        console.error(errorMsg, currentShip);
        setImageState({
          dataUrl: null,
          isLoading: false,
          error: errorMsg,
        });
      }
    } catch (error) {
      processedKeyRef.current = shipKey;
      isProcessingRef.current = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`❌ Error generating image for ship ${shipId}:`, errorMessage, errorStack, error);
      setImageState({
        dataUrl: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  }, [shipKey, shipId, isNotConstructed, isDestroyed, isValidShip]);

  return { ...imageState, renderKey };
}

// Re-export cache management functions for backward compatibility
export {
  clearShipImageCache,
  clearShipImageCacheForShip,
  clearBrokenImageCache,
  clearAllShipImageCache,
  resetShipRequestState,
  resetAllShipRequestStates,
  clearShipRetryTimeout,
  clearAllShipRetryTimeouts,
  restartQueueProcessing,
  getQueueStatus,
  clearCacheOnLogout,
  getShipImageCacheStats,
} from "./useShipImageCache";

// Export ship data cache functions
export {
  getCachedShipData,
  cacheShipData,
  clearShipDataCache,
  clearAllShipDataCache,
  getShipDataCacheStats,
  cacheShipsData,
} from "./useShipDataCache";
