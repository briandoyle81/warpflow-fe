import { useState, useEffect, useCallback, useRef } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { Ship } from "../types/types";

// Cache configuration
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 1000; // Maximum number of images to cache
const CACHE_KEY_PREFIX = "warpflow-ship-image-";

interface CachedImage {
  dataUrl: string;
  timestamp: number;
  shipId: string;
}

interface ShipImageState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useShipImageCache(ship: Ship) {
  const [imageState, setImageState] = useState<ShipImageState>({
    dataUrl: null,
    isLoading: false,
    error: null,
  });

  const cacheKey = `${CACHE_KEY_PREFIX}${ship.id.toString()}`;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get cached image from localStorage
  const getCachedImage = useCallback((): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed: CachedImage = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRY_TIME;

      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return parsed.dataUrl;
    } catch (error) {
      console.error("Error reading cached image:", error);
      return null;
    }
  }, [cacheKey]);

  // Save image to cache
  const saveToCache = useCallback(
    (dataUrl: string) => {
      if (typeof window === "undefined") return;

      try {
        const cached: CachedImage = {
          dataUrl,
          timestamp: Date.now(),
          shipId: ship.id.toString(),
        };

        // Clean up old cache entries if we're at the limit
        const allKeys = Object.keys(localStorage).filter((key) =>
          key.startsWith(CACHE_KEY_PREFIX)
        );

        if (allKeys.length >= MAX_CACHE_SIZE) {
          // Remove oldest entries (simple LRU)
          const entries = allKeys
            .map((key) => {
              const data = localStorage.getItem(key);
              if (!data) return { key, timestamp: 0 };
              try {
                const parsed = JSON.parse(data);
                return { key, timestamp: parsed.timestamp || 0 };
              } catch {
                return { key, timestamp: 0 };
              }
            })
            .sort((a, b) => a.timestamp - b.timestamp);

          // Remove oldest 10% of entries
          const toRemove = Math.floor(entries.length * 0.1);
          for (let i = 0; i < toRemove; i++) {
            localStorage.removeItem(entries[i].key);
          }
        }

        localStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch (error) {
        console.error("Error saving image to cache:", error);
      }
    },
    [cacheKey, ship.id]
  );

  // Call the contract to get ship image
  const { data: tokenURI, isLoading: isLoadingTokenURI } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS,
    functionName: "tokenURI",
    args: [ship.id],
    query: {
      enabled: !imageState.dataUrl && !imageState.error,
    },
  });

  // Process tokenURI to extract and display image
  useEffect(() => {
    if (!tokenURI || imageState.dataUrl || imageState.error) return;

    const processTokenURI = async () => {
      setImageState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Parse the tokenURI (should be a data URI with JSON)
        const [prefix, encodedData] = tokenURI.split(",");
        if (!encodedData) {
          throw new Error("Invalid tokenURI format");
        }

        // Decode the base64 JSON metadata
        const jsonString = atob(encodedData);
        const metadata = JSON.parse(jsonString);

        // Extract the image data (should be base64 encoded SVG)
        const imageData = metadata.image;
        if (!imageData) {
          throw new Error("No image data in metadata");
        }

        // If it's a data URI, extract the base64 part
        let base64Data = imageData;
        if (imageData.startsWith("data:image/svg+xml;base64,")) {
          base64Data = imageData.split(",")[1];
        }

        // Create data URL for the image
        const dataUrl = `data:image/svg+xml;base64,${base64Data}`;

        // Save to cache
        saveToCache(dataUrl);

        setImageState({
          dataUrl,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error processing ship image:", error);
        setImageState({
          dataUrl: null,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Failed to load image",
        });
      }
    };

    processTokenURI();
  }, [tokenURI, ship.id, imageState.dataUrl, imageState.error, saveToCache]);

  // Load cached image on mount
  useEffect(() => {
    const cached = getCachedImage();
    if (cached) {
      setImageState({
        dataUrl: cached,
        isLoading: false,
        error: null,
      });
    }
  }, [getCachedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...imageState,
    isLoading: imageState.isLoading || isLoadingTokenURI,
  };
}

// Utility function to clear all cached images
export function clearShipImageCache() {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(CACHE_KEY_PREFIX)
  );

  keys.forEach((key) => localStorage.removeItem(key));
}

// Utility function to get cache stats
export function getShipImageCacheStats() {
  if (typeof window === "undefined") return { count: 0, size: 0 };

  const keys = Object.keys(localStorage).filter((key) =>
    key.startsWith(CACHE_KEY_PREFIX)
  );

  let totalSize = 0;
  keys.forEach((key) => {
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length;
    }
  });

  return {
    count: keys.length,
    size: totalSize,
    maxSize: MAX_CACHE_SIZE,
  };
}
