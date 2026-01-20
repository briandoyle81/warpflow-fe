import { Ship } from "../types/types";

/**
 * Calculate ship rank based on ships destroyed
 * Uses new threshold-based system:
 * 0-9 kills → Rank 1 (0% bonus)
 * 10-29 kills → Rank 2 (10% bonus)
 * 30-99 kills → Rank 3 (20% bonus)
 * 100-299 kills → Rank 4 (30% bonus)
 * 300-999 kills → Rank 5 (40% bonus)
 * 1000+ kills → Rank 6 (50% bonus)
 */
export function calculateShipRank(ship: Ship): {
  rank: number;
  shipsDestroyed: number;
} {
  const shipsDestroyed = ship.shipData.shipsDestroyed;

  let rank: number;

  if (shipsDestroyed < 10) {
    rank = 1;
  } else if (shipsDestroyed < 30) {
    rank = 2;
  } else if (shipsDestroyed < 100) {
    rank = 3;
  } else if (shipsDestroyed < 300) {
    rank = 4;
  } else if (shipsDestroyed < 1000) {
    rank = 5;
  } else {
    rank = 6; // 1000+ kills
  }

  return {
    rank,
    shipsDestroyed,
  };
}

/**
 * Calculate ship tier based on average stats
 * Uses the same logic as useNavyAnalytics.ts
 */
export function calculateShipTier(ship: Ship): {
  tier: string;
  numericTier: number;
  averageStat: number;
} {
  const averageStat =
    (ship.traits.accuracy + ship.traits.hull + ship.traits.speed) / 3;

  let tier: string;
  let numericTier: number;

  if (averageStat >= 80) {
    tier = "S";
    numericTier = 4;
  } else if (averageStat >= 65) {
    tier = "A";
    numericTier = 3;
  } else if (averageStat >= 50) {
    tier = "B";
    numericTier = 2;
  } else {
    tier = "C";
    numericTier = 1;
  }

  return {
    tier,
    numericTier,
    averageStat: Math.round(averageStat),
  };
}

/**
 * Get rank color for styling
 */
export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "text-gray-400 border-gray-400 bg-gray-400/20";
    case 2:
      return "text-green-400 border-green-400 bg-green-400/20";
    case 3:
      return "text-blue-400 border-blue-400 bg-blue-400/20";
    case 4:
      return "text-purple-400 border-purple-400 bg-purple-400/20";
    case 5:
      return "text-orange-400 border-orange-400 bg-orange-400/20";
    case 6:
      return "text-red-400 border-red-400 bg-red-400/20";
    default:
      return "text-gray-400 border-gray-400 bg-gray-400/20";
  }
}

/**
 * Get tier color for styling
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case "S":
      return "text-purple-400 border-purple-400 bg-purple-400/20";
    case "A":
      return "text-blue-400 border-blue-400 bg-blue-400/20";
    case "B":
      return "text-green-400 border-green-400 bg-green-400/20";
    case "C":
      return "text-yellow-400 border-yellow-400 bg-yellow-400/20";
    default:
      return "text-gray-400 border-gray-400 bg-gray-400/20";
  }
}
