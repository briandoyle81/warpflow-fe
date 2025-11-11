import { Ship, ShipEquipment, ShipTraits, ShipColors, ShipData } from "../types/types";
import { Address } from "viem";

// Tutorial player address (simulated)
export const TUTORIAL_PLAYER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;
export const TUTORIAL_OPPONENT_ADDRESS = "0x2222222222222222222222222222222222222222" as Address;

// Helper to create ship colors
function createColors(h1: number, s1: number, l1: number, h2: number, s2: number, l2: number): ShipColors {
  return { h1, s1, l1, h2, s2, l2 };
}

// Helper to create ship data
function createShipData(cost: number, inFleet: boolean = true): ShipData {
  return {
    shipsDestroyed: 0,
    costsVersion: 1,
    cost,
    shiny: false,
    constructed: true,
    inFleet,
    timestampDestroyed: 0n,
  };
}

// Player ships for tutorial
export const TUTORIAL_PLAYER_SHIPS: Ship[] = [
  // Ship 1: Basic ship with Laser, for movement and shooting
  {
    name: "Tutorial Scout",
    id: 1001n,
    equipment: {
      mainWeapon: 0, // Laser
      armor: 1, // Light
      shields: 1, // Basic
      special: 0, // None
    },
    traits: {
      serialNumber: 1001n,
      colors: createColors(200, 80, 50, 220, 70, 40),
      variant: 1,
      accuracy: 75,
      hull: 100,
      speed: 3,
    },
    shipData: createShipData(10),
    owner: TUTORIAL_PLAYER_ADDRESS,
  },
  // Ship 2: Ship with EMP special
  {
    name: "Tutorial EMP Vessel",
    id: 1002n,
    equipment: {
      mainWeapon: 1, // Railgun
      armor: 2, // Medium
      shields: 2, // Enhanced
      special: 1, // EMP
    },
    traits: {
      serialNumber: 1002n,
      colors: createColors(250, 90, 60, 270, 80, 50),
      variant: 2,
      accuracy: 80,
      hull: 120,
      speed: 2,
    },
    shipData: createShipData(15),
    owner: TUTORIAL_PLAYER_ADDRESS,
  },
  // Ship 3: Ship with Repair special
  {
    name: "Tutorial Support Ship",
    id: 1003n,
    equipment: {
      mainWeapon: 0, // Laser
      armor: 1, // Light
      shields: 1, // Basic
      special: 2, // Repair
    },
    traits: {
      serialNumber: 1003n,
      colors: createColors(150, 70, 55, 170, 60, 45),
      variant: 3,
      accuracy: 70,
      hull: 90,
      speed: 4,
    },
    shipData: createShipData(12),
    owner: TUTORIAL_PLAYER_ADDRESS,
  },
];

// Opponent ships for tutorial
export const TUTORIAL_OPPONENT_SHIPS: Ship[] = [
  // Enemy ship 1: Basic enemy
  {
    name: "Enemy Fighter",
    id: 2001n,
    equipment: {
      mainWeapon: 0, // Laser
      armor: 1, // Light
      shields: 1, // Basic
      special: 0, // None
    },
    traits: {
      serialNumber: 2001n,
      colors: createColors(0, 80, 40, 20, 70, 30), // Reddish colors for enemy
      variant: 1,
      accuracy: 70,
      hull: 100,
      speed: 3,
    },
    shipData: createShipData(10),
    owner: TUTORIAL_OPPONENT_ADDRESS,
  },
  // Enemy ship 2: Will be disabled for rescue tutorial
  {
    name: "Disabled Enemy",
    id: 2002n,
    equipment: {
      mainWeapon: 1, // Railgun
      armor: 2, // Medium
      shields: 0, // None
      special: 0, // None
    },
    traits: {
      serialNumber: 2002n,
      colors: createColors(10, 70, 35, 30, 60, 25),
      variant: 2,
      accuracy: 75,
      hull: 0, // Disabled (0 HP)
      speed: 2,
    },
    shipData: createShipData(15),
    owner: TUTORIAL_OPPONENT_ADDRESS,
  },
  // Enemy ship 3: Another enemy
  {
    name: "Enemy Destroyer",
    id: 2003n,
    equipment: {
      mainWeapon: 2, // Missile
      armor: 2, // Medium
      shields: 2, // Enhanced
      special: 0, // None
    },
    traits: {
      serialNumber: 2003n,
      colors: createColors(5, 75, 38, 25, 65, 28),
      variant: 3,
      accuracy: 80,
      hull: 130,
      speed: 2,
    },
    shipData: createShipData(18),
    owner: TUTORIAL_OPPONENT_ADDRESS,
  },
];

// All tutorial ships combined
export const ALL_TUTORIAL_SHIPS = [...TUTORIAL_PLAYER_SHIPS, ...TUTORIAL_OPPONENT_SHIPS];
