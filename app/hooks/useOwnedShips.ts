import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useShipsRead } from "./useShipsContract";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

export function useOwnedShips() {
  const { address } = useAccount();

  // Get ship IDs owned by the user
  const shipIdsResult = useShipsRead(
    "getShipIdsOwned",
    address ? [address] : undefined,
  );

  // Get ship details for all owned ships
  const shipsDataResult = useShipsRead(
    "getShipsByIds",
    shipIdsResult.data ? [shipIdsResult.data] : undefined,
  );

  // Cache ship data when it's fetched
  useEffect(() => {
    if (shipsDataResult.data && Array.isArray(shipsDataResult.data)) {
      const ships = shipsDataResult.data as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [shipsDataResult.data]);

  // Combine loading states
  const isLoading = shipIdsResult.isLoading || shipsDataResult.isLoading;

  // Combine errors
  const error = shipIdsResult.error || shipsDataResult.error;

  // Refetch function that refetches both queries
  const refetch = () => {
    shipIdsResult.refetch();
    shipsDataResult.refetch();
  };

  return {
    shipIds: (shipIdsResult.data as bigint[]) || [],
    ships: (shipsDataResult.data as Ship[]) || [],
    isLoading,
    error,
    refetch,
    hasShips: shipIdsResult.data
      ? (shipIdsResult.data as bigint[]).length > 0
      : false,
    shipCount: shipIdsResult.data ? (shipIdsResult.data as bigint[]).length : 0,
  };
}
