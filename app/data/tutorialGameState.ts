import { SimulatedGameState } from "../types/onboarding";
import { ShipPosition, Attributes } from "../types/types";
import { TUTORIAL_PLAYER_ADDRESS, TUTORIAL_OPPONENT_ADDRESS, ALL_TUTORIAL_SHIPS } from "./tutorialShips";
import { GRID_DIMENSIONS } from "../types/types";

// Initial ship positions for tutorial
const INITIAL_SHIP_POSITIONS: ShipPosition[] = [
  // Player ships (left side, columns 0-4)
  { shipId: 1001n, position: { row: 6, col: 7 }, isCreator: true },
  { shipId: 1002n, position: { row: 5, col: 6 }, isCreator: true },
  { shipId: 1003n, position: { row: 7, col: 6 }, isCreator: true },

  // Opponent ships (right side, columns 20-24)
  { shipId: 2001n, position: { row: 6, col: 17 }, isCreator: false },
  { shipId: 2002n, position: { row: 5, col: 18 }, isCreator: false }, // Will be disabled
  { shipId: 2003n, position: { row: 6, col: 14 }, isCreator: false },
];

// Create initial attributes for all ships
function createInitialAttributes(shipId: bigint): Attributes {
  const ship = ALL_TUTORIAL_SHIPS.find(s => s.id === shipId);
  if (!ship) {
    throw new Error(`Ship ${shipId} not found`);
  }

  return {
    version: 1,
    range: ship.equipment.mainWeapon === 0 ? 3 : ship.equipment.mainWeapon === 1 ? 4 : 5, // Weapon range
    gunDamage: ship.equipment.mainWeapon === 0 ? 25 : ship.equipment.mainWeapon === 1 ? 30 : 35,
    hullPoints: ship.traits.hull,
    maxHullPoints: ship.traits.hull,
    movement: ship.traits.speed,
    damageReduction: ship.equipment.armor * 5, // 5% per armor level
    reactorCriticalTimer: shipId === 2002n ? 2 : 0, // Enemy ship 2002 starts disabled
    statusEffects: [],
  };
}

export function createInitialTutorialGameState(): SimulatedGameState {
  const allShipIds = ALL_TUTORIAL_SHIPS.map(s => s.id);
  const shipAttributes = allShipIds.map(id => createInitialAttributes(id));
  const playerShipIds = ALL_TUTORIAL_SHIPS.filter(s => s.owner === TUTORIAL_PLAYER_ADDRESS).map(s => s.id);
  const opponentShipIds = ALL_TUTORIAL_SHIPS.filter(s => s.owner === TUTORIAL_OPPONENT_ADDRESS).map(s => s.id);

  return {
    gameId: 9999n, // Tutorial game ID
    metadata: {
      gameId: 9999n,
      creator: TUTORIAL_PLAYER_ADDRESS,
      joiner: TUTORIAL_OPPONENT_ADDRESS,
      creatorFleetId: 1n,
      joinerFleetId: 2n,
      creatorGoesFirst: true,
      startedAt: BigInt(Math.floor(Date.now() / 1000)),
      winner: "0x0000000000000000000000000000000000000000" as typeof TUTORIAL_PLAYER_ADDRESS,
    },
    turnState: {
      currentTurn: TUTORIAL_PLAYER_ADDRESS,
      turnTime: 300n, // 5 minutes
      turnStartTime: BigInt(Math.floor(Date.now() / 1000)),
      currentRound: 1n,
    },
    gridDimensions: {
      gridWidth: GRID_DIMENSIONS.WIDTH,
      gridHeight: GRID_DIMENSIONS.HEIGHT,
    },
    maxScore: 10n,
    creatorScore: 0n,
    joinerScore: 0n,
    shipIds: allShipIds,
    shipAttributes,
    shipPositions: INITIAL_SHIP_POSITIONS,
    creatorActiveShipIds: playerShipIds,
    joinerActiveShipIds: opponentShipIds,
    creatorMovedShipIds: [],
    joinerMovedShipIds: [],
  };
}
