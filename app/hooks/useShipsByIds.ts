import { useShipsRead } from "./useShipsContract";
import { Ship } from "../types/types";

export function useShipsByIds(shipIds: bigint[]) {
  const {
    data: ships,
    isLoading,
    error,
    refetch,
  } = useShipsRead("getShipsByIds", shipIds.length > 0 ? [shipIds] : undefined);

  return {
    ships: (ships as Ship[]) || [],
    isLoading,
    error,
    refetch,
  };
}
