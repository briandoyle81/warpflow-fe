import { useMemo } from "react";
import { useOwnedShips } from "./useOwnedShips";
import { Ship } from "../types/types";

export function useShipDetails() {
  const { ships, isLoading, error } = useOwnedShips();

  // Calculate fleet statistics
  const fleetStats = useMemo(() => {
    if (!ships || ships.length === 0) {
      return {
        totalShips: 0,
        constructedShips: 0,
        unconstructedShips: 0,
        totalCost: 0,
        averageCost: 0,
        shipsInFleet: 0,
        destroyedShips: 0,
        shinyShips: 0,
        totalShipsDestroyed: 0,
      };
    }

    const totalShips = ships.length;
    const constructedShips = ships.filter(
      (ship) => ship.shipData.constructed
    ).length;
    const unconstructedShips = totalShips - constructedShips;
    const totalCost = ships.reduce((sum, ship) => sum + ship.shipData.cost, 0);
    const averageCost = totalCost / totalShips;
    const shipsInFleet = ships.filter((ship) => ship.shipData.inFleet).length;
    const destroyedShips = ships.filter(
      (ship) => ship.shipData.timestampDestroyed > 0n
    ).length;
    const shinyShips = ships.filter((ship) => ship.shipData.shiny).length;
    const totalShipsDestroyed = ships.reduce(
      (sum, ship) => sum + ship.shipData.shipsDestroyed,
      0
    );

    return {
      totalShips,
      constructedShips,
      unconstructedShips,
      totalCost,
      averageCost,
      shipsInFleet,
      destroyedShips,
      shinyShips,
      totalShipsDestroyed,
    };
  }, [ships]);

  // Get ships by construction status
  const shipsByStatus = useMemo(() => {
    if (!ships) return { constructed: [], unconstructed: [] };

    return {
      constructed: ships.filter((ship) => ship.shipData.constructed),
      unconstructed: ships.filter((ship) => !ship.shipData.constructed),
    };
  }, [ships]);

  // Get ships by equipment type
  const shipsByEquipment = useMemo(() => {
    if (!ships) return {};

    const equipmentGroups: Record<string, Ship[]> = {};

    ships.forEach((ship) => {
      const mainWeapon = ship.equipment.mainWeapon;
      const armor = ship.equipment.armor;
      const shields = ship.equipment.shields;
      const special = ship.equipment.special;

      const key = `W${mainWeapon}-A${armor}-S${shields}-SP${special}`;

      if (!equipmentGroups[key]) {
        equipmentGroups[key] = [];
      }
      equipmentGroups[key].push(ship);
    });

    return equipmentGroups;
  }, [ships]);

  // Get ships by trait tier
  const shipsByTier = useMemo(() => {
    if (!ships) return {};

    const tierGroups: Record<string, Ship[]> = {};

    ships.forEach((ship) => {
      const accuracy = ship.traits.accuracy;
      const hull = ship.traits.hull;
      const speed = ship.traits.speed;

      // Calculate tier based on trait values
      const getTier = (trait: number) => {
        if (trait < 50) return 0;
        if (trait < 80) return 1;
        return 2;
      };

      const tier = `A${getTier(accuracy)}-H${getTier(hull)}-S${getTier(speed)}`;

      if (!tierGroups[tier]) {
        tierGroups[tier] = [];
      }
      tierGroups[tier].push(ship);
    });

    return tierGroups;
  }, [ships]);

  return {
    fleetStats,
    shipsByStatus,
    shipsByEquipment,
    shipsByTier,
    isLoading,
    error,
  };
}
