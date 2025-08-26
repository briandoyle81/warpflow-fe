import { useCallback, useRef, useState, useMemo } from "react";
import { useOwnedShips } from "./useOwnedShips";
import { Ship } from "../types/types";

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
}

export function useNavyOptimization() {
  const { ships } = useOwnedShips();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 300);
  }, []);

  // Memoized search results
  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm || !ships) return ships;

    const term = debouncedSearchTerm.toLowerCase();
    return ships.filter((ship) => {
      const name = (ship.name || `Ship #${ship.id}`).toLowerCase();
      const id = ship.id.toString();
      const equipment = `${ship.equipment.mainWeapon}-${ship.equipment.armor}-${ship.equipment.shields}-${ship.equipment.special}`;

      return (
        name.includes(term) ||
        id.includes(term) ||
        equipment.includes(term) ||
        (ship.shipData.shiny && term.includes("shiny")) ||
        (ship.shipData.constructed && term.includes("constructed")) ||
        (!ship.shipData.constructed && term.includes("unconstructed"))
      );
    });
  }, [ships, debouncedSearchTerm]);

  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / 50); // Default item height
    const end = Math.min(
      start + Math.ceil(400 / 50) + 5, // Default container height + overscan
      searchResults?.length || 0
    );

    return {
      start: Math.max(0, start - 5),
      end,
    };
  }, [scrollTop, searchResults]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = (searchResults?.length || 0) * 50; // Default item height
  const offsetY = visibleRange.start * 50;

  const virtualScrollData = {
    containerRef,
    handleScroll,
    visibleRange,
    totalHeight,
    offsetY,
    scrollTop,
  };

  // Performance monitoring
  const performanceMetrics = useMemo(() => {
    if (!ships) return null;

    const startTime = performance.now();

    // Simulate some heavy computation
    const processedShips = ships.map((ship) => ({
      ...ship,
      computedValue:
        (ship.traits.accuracy + ship.traits.hull + ship.traits.speed) / 3,
    }));

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    return {
      totalShips: ships.length,
      processingTime: processingTime.toFixed(2),
      shipsPerMs: (ships.length / processingTime).toFixed(2),
      isOptimized: processingTime < 16, // 60fps threshold
    };
  }, [ships]);

  // Batch operations for performance
  const batchOperations = useCallback(
    (operation: (ship: Ship) => void, batchSize = 10) => {
      if (!searchResults) return;

      const processBatch = (startIndex: number) => {
        const endIndex = Math.min(startIndex + batchSize, searchResults.length);

        for (let i = startIndex; i < endIndex; i++) {
          operation(searchResults[i]);
        }

        if (endIndex < searchResults.length) {
          // Process next batch in next frame
          requestAnimationFrame(() => processBatch(endIndex));
        }
      };

      processBatch(0);
    },
    [searchResults]
  );

  // Memory optimization - cleanup search timeout
  const cleanup = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
    searchResults,
    virtualScrollData,
    performanceMetrics,
    batchOperations,
    cleanup,
  };
}
