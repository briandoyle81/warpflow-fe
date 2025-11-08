import { useEffect } from "react";
import { useShipsRead } from "./useShipsContract";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

export function useShipsByIds(shipIds: bigint[]) {
  const {
    data: ships,
    isLoading,
    error,
    refetch,
  } = useShipsRead("getShipsByIds", shipIds.length > 0 ? [shipIds] : undefined);

  // Cache ship data when it's fetched
  useEffect(() => {
    if (ships && Array.isArray(ships)) {
      const shipArray = ships as Ship[];
      if (shipArray.length > 0) {
        cacheShipsData(shipArray);
      }
    }
  }, [ships]);

  return {
    ships: (ships as Ship[]) || [],
    isLoading,
    error,
    refetch,
  };
}
