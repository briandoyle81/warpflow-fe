import { useMemo } from "react";
import { useOwnedShips } from "./useOwnedShips";
import { Ship } from "../types/types";

export interface FleetComposition {
  weaponTypes: Record<number, number>;
  armorTypes: Record<number, number>;
  shieldTypes: Record<number, number>;
  specialTypes: Record<number, number>;
}

export interface FleetPerformance {
  averageAccuracy: number;
  averageHull: number;
  averageSpeed: number;
  totalCombatPower: number;
  fleetEfficiency: number;
}

export interface OptimizationSuggestion {
  type: "construction" | "recycling" | "upgrade" | "balance";
  priority: "high" | "medium" | "low";
  message: string;
  impact: string;
  action: string;
}

export function useFleetAnalytics() {
  const { ships, isLoading } = useOwnedShips();

  // Fleet composition analysis
  const fleetComposition = useMemo(() => {
    if (!ships || ships.length === 0) {
      return {
        weaponTypes: {},
        armorTypes: {},
        shieldTypes: {},
        specialTypes: {},
      };
    }

    const composition: FleetComposition = {
      weaponTypes: {},
      armorTypes: {},
      shieldTypes: {},
      specialTypes: {},
    };

    ships.forEach((ship) => {
      // Count weapon types
      composition.weaponTypes[ship.equipment.mainWeapon] =
        (composition.weaponTypes[ship.equipment.mainWeapon] || 0) + 1;

      // Count armor types
      composition.armorTypes[ship.equipment.armor] =
        (composition.armorTypes[ship.equipment.armor] || 0) + 1;

      // Count shield types
      composition.shieldTypes[ship.equipment.shields] =
        (composition.shieldTypes[ship.equipment.shields] || 0) + 1;

      // Count special types
      composition.specialTypes[ship.equipment.special] =
        (composition.specialTypes[ship.equipment.special] || 0) + 1;
    });

    return composition;
  }, [ships]);

  // Fleet performance metrics
  const fleetPerformance = useMemo(() => {
    if (!ships || ships.length === 0) {
      return {
        averageAccuracy: 0,
        averageHull: 0,
        averageSpeed: 0,
        totalCombatPower: 0,
        fleetEfficiency: 0,
      };
    }

    const constructedShips = ships.filter((ship) => ship.shipData.constructed);

    if (constructedShips.length === 0) {
      return {
        averageAccuracy: 0,
        averageHull: 0,
        averageSpeed: 0,
        totalCombatPower: 0,
        fleetEfficiency: 0,
      };
    }

    const totalAccuracy = constructedShips.reduce(
      (sum, ship) => sum + ship.traits.accuracy,
      0
    );
    const totalHull = constructedShips.reduce(
      (sum, ship) => sum + ship.traits.hull,
      0
    );
    const totalSpeed = constructedShips.reduce(
      (sum, ship) => sum + ship.traits.speed,
      0
    );

    const averageAccuracy = totalAccuracy / constructedShips.length;
    const averageHull = totalHull / constructedShips.length;
    const averageSpeed = totalSpeed / constructedShips.length;

    // Calculate combat power (weighted combination of stats)
    const totalCombatPower = constructedShips.reduce((sum, ship) => {
      const combatPower =
        ship.traits.accuracy * 0.4 +
        ship.traits.hull * 0.4 +
        ship.traits.speed * 0.2;
      return sum + combatPower;
    }, 0);

    // Calculate fleet efficiency (how well-balanced the fleet is)
    const efficiencyScores = constructedShips.map((ship) => {
      const statVariance =
        Math.abs(ship.traits.accuracy - averageAccuracy) +
        Math.abs(ship.traits.hull - averageHull) +
        Math.abs(ship.traits.speed - averageSpeed);
      return Math.max(0, 100 - statVariance);
    });

    const fleetEfficiency =
      efficiencyScores.reduce((sum, score) => sum + score, 0) /
      efficiencyScores.length;

    return {
      averageAccuracy,
      averageHull,
      averageSpeed,
      totalCombatPower,
      fleetEfficiency,
    };
  }, [ships]);

  // Generate optimization suggestions
  const optimizationSuggestions = useMemo(() => {
    if (!ships || ships.length === 0) return [];

    const suggestions: OptimizationSuggestion[] = [];
    const constructedShips = ships.filter((ship) => ship.shipData.constructed);
    const unconstructedShips = ships.filter(
      (ship) => !ship.shipData.constructed
    );

    // Construction suggestions
    if (unconstructedShips.length > 0) {
      suggestions.push({
        type: "construction",
        priority: unconstructedShips.length > 5 ? "high" : "medium",
        message: `${unconstructedShips.length} ships ready for construction`,
        impact: "Increase fleet combat power",
        action: "Construct all ships",
      });
    }

    // Fleet balance suggestions
    if (constructedShips.length > 0) {
      const { averageAccuracy, averageHull, averageSpeed } = fleetPerformance;

      if (
        Math.abs(averageAccuracy - averageHull) > 20 ||
        Math.abs(averageAccuracy - averageSpeed) > 20
      ) {
        suggestions.push({
          type: "balance",
          priority: "medium",
          message: "Fleet stats are imbalanced",
          impact: "Reduce fleet efficiency",
          action: "Consider recycling imbalanced ships",
        });
      }
    }

    // Recycling suggestions for low-value ships
    const lowValueShips = constructedShips.filter((ship) => {
      const shipValue =
        (ship.traits.accuracy + ship.traits.hull + ship.traits.speed) / 3;
      return shipValue < 50 && !ship.shipData.shiny;
    });

    if (lowValueShips.length > 3) {
      suggestions.push({
        type: "recycling",
        priority: "low",
        message: `${lowValueShips.length} low-value ships detected`,
        impact: "Free up fleet slots and earn UC",
        action: "Recycle low-value ships",
      });
    }

    // Upgrade suggestions for shiny ships
    const shinyShips = ships.filter((ship) => ship.shipData.shiny);
    if (shinyShips.length > 0 && constructedShips.length < ships.length * 0.8) {
      suggestions.push({
        type: "upgrade",
        priority: "medium",
        message: "Shiny ships available for construction",
        impact: "Maximize rare ship potential",
        action: "Prioritize shiny ship construction",
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [ships, fleetPerformance]);

  // Fleet tier analysis
  const fleetTiers = useMemo(() => {
    if (!ships || ships.length === 0) return {};

    const tiers: Record<string, number> = {};

    ships.forEach((ship) => {
      if (ship.shipData.constructed) {
        const avgStat =
          (ship.traits.accuracy + ship.traits.hull + ship.traits.speed) / 3;
        let tier: string;

        if (avgStat >= 80) tier = "S";
        else if (avgStat >= 65) tier = "A";
        else if (avgStat >= 50) tier = "B";
        else tier = "C";

        tiers[tier] = (tiers[tier] || 0) + 1;
      }
    });

    return tiers;
  }, [ships]);

  return {
    fleetComposition,
    fleetPerformance,
    optimizationSuggestions,
    fleetTiers,
    isLoading,
  };
}
