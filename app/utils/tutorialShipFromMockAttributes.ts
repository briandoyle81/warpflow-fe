import type { Address } from "viem";
import type {
  Attributes,
  Ship,
  ShipColors,
  ShipData,
  ShipEquipment,
  ShipTraits,
} from "../types/types";
import { calculateAttributesFromContracts } from "./shipAttributesCalculator";

/** Matches `ShipAttributes` constructor `costs` (v1). */
const COST_BASE = 50;
const COST_ACCURACY = [0, 10, 25];
const COST_HULL = [0, 10, 25];
const COST_SPEED = [0, 10, 25];
const COST_MAIN_WEAPON = [25, 30, 40, 40];
const COST_ARMOR = [0, 5, 10, 15];
const COST_SHIELDS = [0, 10, 20, 30];
const COST_SPECIAL = [0, 10, 20, 15];

/**
 * Threat points for UI (same formula as `ShipAttributes.calculateShipCost` on-chain).
 */
export function calculateTutorialThreatPoints(
  equipment: ShipEquipment,
  traits: Pick<ShipTraits, "accuracy" | "hull" | "speed">,
): number {
  return (
    COST_BASE +
    COST_ACCURACY[traits.accuracy] +
    COST_HULL[traits.hull] +
    COST_SPEED[traits.speed] +
    COST_MAIN_WEAPON[equipment.mainWeapon] +
    COST_ARMOR[equipment.armor] +
    COST_SHIELDS[equipment.shields] +
    COST_SPECIAL[equipment.special]
  );
}

export type TutorialMockAttributes = Pick<
  Attributes,
  | "version"
  | "range"
  | "gunDamage"
  | "hullPoints"
  | "maxHullPoints"
  | "movement"
  | "damageReduction"
>;

const DUMMY: Address =
  "0x0000000000000000000000000000000000000001" as Address;

function skeletonShip(
  equipment: ShipEquipment,
  shipData: ShipData,
  traits: Pick<ShipTraits, "accuracy" | "hull" | "speed">,
): Ship {
  return {
    name: "",
    id: 1n,
    equipment,
    traits: {
      serialNumber: 0n,
      colors: { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0 },
      variant: 1,
      ...traits,
    },
    shipData,
    owner: DUMMY,
  };
}

/**
 * Inverts `calculateShipAttributes`: finds fore/hull/engine tier indices (0–2)
 * whose forward-calculated stats best match the given mock attributes.
 */
export function deriveTraitIndicesFromMockAttributes(
  equipment: ShipEquipment,
  shipData: ShipData,
  target: TutorialMockAttributes,
): Pick<ShipTraits, "accuracy" | "hull" | "speed"> {
  let best: Pick<ShipTraits, "accuracy" | "hull" | "speed"> = {
    accuracy: 0,
    hull: 0,
    speed: 0,
  };
  let bestScore = Infinity;

  for (let accuracy = 0; accuracy <= 2; accuracy++) {
    for (let hull = 0; hull <= 2; hull++) {
      for (let speed = 0; speed <= 2; speed++) {
        const attrs = calculateAttributesFromContracts(
          skeletonShip(equipment, shipData, { accuracy, hull, speed }),
        );
        const score =
          Math.abs(attrs.range - target.range) +
          Math.abs(attrs.gunDamage - target.gunDamage) +
          Math.abs(attrs.hullPoints - target.hullPoints) +
          Math.abs(attrs.maxHullPoints - target.maxHullPoints) +
          Math.abs(attrs.movement - target.movement) +
          Math.abs(attrs.damageReduction - target.damageReduction);
        if (score < bestScore) {
          bestScore = score;
          best = { accuracy, hull, speed };
        }
      }
    }
  }

  return best;
}

export type TutorialShipVisual = {
  serialNumber: bigint;
  colors: ShipColors;
  variant: number;
};

export function buildTutorialShipFromMockAttributes(input: {
  name: string;
  id: bigint;
  owner: Address;
  equipment: ShipEquipment;
  shipData: ShipData;
  mockAttributes: TutorialMockAttributes;
  visual: TutorialShipVisual;
}): Ship {
  const { mockAttributes, visual, ...rest } = input;
  if (rest.equipment.armor > 0 && rest.equipment.shields > 0) {
    throw new Error(
      `${rest.name}: armor and shields cannot both be non-zero (on-chain / ShipConstructor rule).`,
    );
  }
  const traitTiers = deriveTraitIndicesFromMockAttributes(
    rest.equipment,
    rest.shipData,
    mockAttributes,
  );
  const threat = calculateTutorialThreatPoints(rest.equipment, traitTiers);

  return {
    name: rest.name,
    id: rest.id,
    equipment: rest.equipment,
    traits: {
      serialNumber: visual.serialNumber,
      colors: visual.colors,
      variant: visual.variant,
      accuracy: traitTiers.accuracy,
      hull: traitTiers.hull,
      speed: traitTiers.speed,
    },
    shipData: {
      ...rest.shipData,
      cost: threat,
    },
    owner: rest.owner,
  };
}

/**
 * One-time helper: freeze `ShipAttributes` v1 stats from tier indices (0–2 each).
 * Used only to author `mockAttributes` in tutorial data; not used at runtime in UI.
 */
export function tutorialMockAttributesFromTraitTiers(
  equipment: ShipEquipment,
  shipData: ShipData,
  tiers: Pick<ShipTraits, "accuracy" | "hull" | "speed">,
): TutorialMockAttributes {
  const a = calculateAttributesFromContracts(
    skeletonShip(equipment, shipData, tiers),
  );
  return {
    version: a.version,
    range: a.range,
    gunDamage: a.gunDamage,
    hullPoints: a.hullPoints,
    maxHullPoints: a.maxHullPoints,
    movement: a.movement,
    damageReduction: a.damageReduction,
  };
}
