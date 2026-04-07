import { Ship, ShipColors, ShipData, ShipEquipment } from "../types/types";
import { Address } from "viem";
import {
  buildTutorialShipFromMockAttributes,
  tutorialMockAttributesFromTraitTiers,
  type TutorialMockAttributes,
} from "../utils/tutorialShipFromMockAttributes";

// Tutorial player address (simulated)
export const TUTORIAL_PLAYER_ADDRESS =
  "0x1111111111111111111111111111111111111111" as Address;
export const TUTORIAL_OPPONENT_ADDRESS =
  "0x2222222222222222222222222222222222222222" as Address;

// Helper to create ship colors (NFT / renderer only; not ShipAttributes traits)
function createColors(
  h1: number,
  s1: number,
  l1: number,
  h2: number,
  s2: number,
  l2: number,
): ShipColors {
  return { h1, s1, l1, h2, s2, l2 };
}

// Helper to create ship data (shipsDestroyed drives rank like on-chain)
function createShipData(
  cost: number,
  inFleet: boolean = true,
  shipsDestroyed: number = 0,
): ShipData {
  return {
    shipsDestroyed,
    costsVersion: 1,
    cost,
    shiny: false,
    constructed: true,
    inFleet,
    timestampDestroyed: 0n,
  };
}

/**
 * Per ship we define loadout and tier seeds once, then derive `*_MOCK`
 * (frozen range/hull/movement/damageReduction targets). Runtime `Ship` uses the
 * same `equipment` plus traits recovered from the mock via
 * `deriveTraitIndicesFromMockAttributes`.
 *
 * Equipment rule (matches contracts / ShipConstructor): armor and shields are
 * mutually exclusive; at most one of armor or shields may be non-zero.
 */
const TUTORIAL_SHIP_DATA_STANDARD = createShipData(0, true, 0);
const RESOLUTE_SHIP_DATA = createShipData(0, true, 10);

const RESOLUTE_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 0,
  shields: 2,
  special: 1,
};
const RESOLUTE_MOCK: TutorialMockAttributes =
  tutorialMockAttributesFromTraitTiers(RESOLUTE_EQUIPMENT, RESOLUTE_SHIP_DATA, {
    accuracy: 2,
    hull: 2,
    speed: 2,
  });

const VIGILANT_EQUIPMENT: ShipEquipment = {
  mainWeapon: 1,
  armor: 0,
  shields: 1,
  special: 2,
};
const VIGILANT_MOCK: TutorialMockAttributes =
  tutorialMockAttributesFromTraitTiers(
    VIGILANT_EQUIPMENT,
    TUTORIAL_SHIP_DATA_STANDARD,
    { accuracy: 1, hull: 0, speed: 0 },
  );

const SENTINEL_EQUIPMENT: ShipEquipment = {
  mainWeapon: 0,
  armor: 2,
  shields: 0,
  special: 0,
};
const SENTINEL_MOCK: TutorialMockAttributes =
  tutorialMockAttributesFromTraitTiers(
    SENTINEL_EQUIPMENT,
    TUTORIAL_SHIP_DATA_STANDARD,
    { accuracy: 1, hull: 0, speed: 0 },
  );

const HAMMER_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 0,
  shields: 1,
  special: 0,
};
const HAMMER_MOCK: TutorialMockAttributes =
  tutorialMockAttributesFromTraitTiers(
    HAMMER_EQUIPMENT,
    TUTORIAL_SHIP_DATA_STANDARD,
    { accuracy: 1, hull: 1, speed: 1 },
  );

const ANVIL_EQUIPMENT: ShipEquipment = {
  mainWeapon: 3,
  armor: 2,
  shields: 0,
  special: 0,
};
const ANVIL_MOCK: TutorialMockAttributes = tutorialMockAttributesFromTraitTiers(
  ANVIL_EQUIPMENT,
  TUTORIAL_SHIP_DATA_STANDARD,
  { accuracy: 1, hull: 2, speed: 0 },
);

const TONGS_EQUIPMENT: ShipEquipment = {
  mainWeapon: 1,
  armor: 0,
  shields: 2,
  special: 0,
};
const TONGS_MOCK: TutorialMockAttributes = tutorialMockAttributesFromTraitTiers(
  TONGS_EQUIPMENT,
  TUTORIAL_SHIP_DATA_STANDARD,
  { accuracy: 2, hull: 2, speed: 2 },
);

// Player ships for tutorial
export const TUTORIAL_PLAYER_SHIPS: Ship[] = [
  buildTutorialShipFromMockAttributes({
    name: "Resolute",
    id: 1001n,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: RESOLUTE_EQUIPMENT,
    shipData: RESOLUTE_SHIP_DATA,
    mockAttributes: RESOLUTE_MOCK,
    visual: {
      serialNumber: 1001n,
      colors: createColors(200, 80, 50, 220, 70, 40),
      variant: 1,
    },
  }),
  buildTutorialShipFromMockAttributes({
    name: "Vigilant",
    id: 1002n,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: VIGILANT_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    mockAttributes: VIGILANT_MOCK,
    visual: {
      serialNumber: 1002n,
      colors: createColors(250, 90, 60, 270, 80, 50),
      variant: 1,
    },
  }),
  buildTutorialShipFromMockAttributes({
    name: "Sentinel",
    id: 1003n,
    owner: TUTORIAL_PLAYER_ADDRESS,
    equipment: SENTINEL_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    mockAttributes: SENTINEL_MOCK,
    visual: {
      serialNumber: 1003n,
      colors: createColors(150, 70, 55, 170, 60, 45),
      variant: 1,
    },
  }),
];

// Opponent ships for tutorial
export const TUTORIAL_OPPONENT_SHIPS: Ship[] = [
  buildTutorialShipFromMockAttributes({
    name: "Hammer",
    id: 2001n,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: HAMMER_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    mockAttributes: HAMMER_MOCK,
    visual: {
      serialNumber: 2001n,
      colors: createColors(0, 80, 40, 20, 70, 30),
      variant: 1,
    },
  }),
  buildTutorialShipFromMockAttributes({
    name: "Anvil",
    id: 2002n,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: ANVIL_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    mockAttributes: ANVIL_MOCK,
    visual: {
      serialNumber: 2002n,
      colors: createColors(10, 70, 35, 30, 60, 25),
      variant: 1,
    },
  }),
  buildTutorialShipFromMockAttributes({
    name: "Tongs",
    id: 2003n,
    owner: TUTORIAL_OPPONENT_ADDRESS,
    equipment: TONGS_EQUIPMENT,
    shipData: TUTORIAL_SHIP_DATA_STANDARD,
    mockAttributes: TONGS_MOCK,
    visual: {
      serialNumber: 2003n,
      colors: createColors(5, 75, 38, 25, 65, 28),
      variant: 1,
    },
  }),
];

// All tutorial ships combined
export const ALL_TUTORIAL_SHIPS = [
  ...TUTORIAL_PLAYER_SHIPS,
  ...TUTORIAL_OPPONENT_SHIPS,
];
