"use client";

import React, { useEffect, useMemo, useState } from "react";
import { renderShip } from "../utils/shipRenderer";
import { Ship, Attributes } from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";
import {
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";

// Random ship names for hero showcase
const SHIP_NAMES = [
  "Vanguard",
  "Nexus",
  "Aurora",
  "Stellar",
  "Quantum",
  "Nebula",
  "Eclipse",
  "Horizon",
  "Vortex",
  "Titan",
  "Phoenix",
  "Apex",
  "Nova",
  "Catalyst",
  "Odyssey",
  "Spectre",
  "Raven",
  "Falcon",
  "Viper",
  "Cobra",
  "Thunder",
  "Storm",
  "Tempest",
  "Blade",
  "Saber",
  "Reaper",
  "Wraith",
  "Phantom",
  "Shadow",
  "Ghost",
  "Hunter",
  "Predator",
  "Scorpion",
  "Vulture",
  "Hawk",
  "Eagle",
  "Dragon",
  "Wyvern",
  "Leviathan",
  "Kraken",
  "Behemoth",
  "Colossus",
  "Goliath",
  "Atlas",
  "Hercules",
  "Zeus",
  "Ares",
  "Apollo",
  "Artemis",
  "Athena",
];

const SHIP_ART_SIZE = 320;

// ---- ShipAttributes v1 constants (mirroring on-chain data) -----------------

const ATTR_BASE_HULL = 100;
const ATTR_BASE_SPEED = 3;

// Fore accuracy bonuses (%)
const ATTR_FORE_ACCURACY: number[] = [0, 25, 50];

// Hull bonuses (flat hull points)
const ATTR_HULL_BONUS: number[] = [0, 10, 20];

// Engine speed bonuses (movement modifier)
const ATTR_ENGINE_SPEEDS: number[] = [0, 1, 2];

// Gun data: [range, damage, movement]
const ATTR_GUNS: Array<{ range: number; damage: number; movement: number }> = [
  { range: 3, damage: 50, movement: 0 }, // Laser
  { range: 6, damage: 40, movement: 0 }, // Railgun
  { range: 4, damage: 60, movement: -1 }, // MissileLauncher
  { range: 2, damage: 80, movement: 0 }, // PlasmaCannon
];

// Armor data: [damageReduction, movement]
const ATTR_ARMORS: Array<{ damageReduction: number; movement: number }> = [
  { damageReduction: 0, movement: 1 }, // None
  { damageReduction: 15, movement: 0 }, // Light
  { damageReduction: 30, movement: -1 }, // Medium
  { damageReduction: 45, movement: -2 }, // Heavy
];

// Shield data: [damageReduction, movement]
const ATTR_SHIELDS: Array<{ damageReduction: number; movement: number }> = [
  { damageReduction: 0, movement: 1 }, // None
  { damageReduction: 15, movement: 1 }, // Light
  { damageReduction: 30, movement: 0 }, // Medium
  { damageReduction: 45, movement: -1 }, // Heavy
];

// Rank thresholds and multipliers (% bonuses)
function getRankFromKills(shipsDestroyed: number): number {
  if (shipsDestroyed >= 1000) return 6;
  if (shipsDestroyed >= 300) return 5;
  if (shipsDestroyed >= 100) return 4;
  if (shipsDestroyed >= 30) return 3;
  if (shipsDestroyed >= 10) return 2;
  return 1;
}

function getRankMultiplier(rank: number): number {
  if (rank >= 6) return 50;
  if (rank === 5) return 40;
  if (rank === 4) return 30;
  if (rank === 3) return 20;
  if (rank === 2) return 10;
  return 0; // rank 1
}

// Pure helpers mirroring _calculateHullPoints / _calculateMovement / _calculateDamageReduction
function calcBaseHullPoints(ship: Ship): number {
  const traitIdx = Math.max(0, Math.min(ATTR_HULL_BONUS.length - 1, ship.traits.hull));
  const traitBonus = ATTR_HULL_BONUS[traitIdx] ?? 0;
  return ATTR_BASE_HULL + traitBonus;
}

function calcBaseMovement(ship: Ship): number {
  const speedIdx = Math.max(0, Math.min(ATTR_ENGINE_SPEEDS.length - 1, ship.traits.speed));

  const gun = ATTR_GUNS[ship.equipment.mainWeapon] ?? ATTR_GUNS[0];
  const armor = ATTR_ARMORS[ship.equipment.armor] ?? ATTR_ARMORS[0];
  const shield = ATTR_SHIELDS[ship.equipment.shields] ?? ATTR_SHIELDS[0];

  let baseMovement = ATTR_BASE_SPEED;
  baseMovement += ATTR_ENGINE_SPEEDS[speedIdx] ?? 0;

  baseMovement += gun.movement;
  baseMovement += armor.movement;
  baseMovement += shield.movement;

  // Specials can also modify movement on-chain; current v1 specials all have 0 movement.
  return Math.max(0, baseMovement);
}

function calcBaseDamageReduction(ship: Ship): number {
  const armor = ATTR_ARMORS[ship.equipment.armor] ?? ATTR_ARMORS[0];
  const shield = ATTR_SHIELDS[ship.equipment.shields] ?? ATTR_SHIELDS[0];
  return armor.damageReduction + shield.damageReduction;
}

// Full on-chain-style attribute calculation for a mock Ship
function calculateAttributes(ship: Ship): Attributes {
  const kills = Number(ship.shipData.shipsDestroyed ?? 0);
  const rank = getRankFromKills(kills);
  const rankMult = getRankMultiplier(rank); // percentage

  const gun = ATTR_GUNS[ship.equipment.mainWeapon] ?? ATTR_GUNS[0];

  // RANGE: base gun range → rank bonus → fore accuracy bonus
  let range = gun.range;
  let bonus = Math.floor((range * rankMult) / 100);
  range += bonus;

  const accIdx = Math.max(0, Math.min(ATTR_FORE_ACCURACY.length - 1, ship.traits.accuracy));
  const foreAccBonus = ATTR_FORE_ACCURACY[accIdx] ?? 0;
  bonus = Math.floor((range * foreAccBonus) / 100);
  range += bonus;

  // DAMAGE: base gun damage → rank bonus
  let gunDamage = gun.damage;
  bonus = Math.floor((gunDamage * rankMult) / 100);
  gunDamage += bonus;

  // HULL: base hull points → rank bonus
  let hullPoints = calcBaseHullPoints(ship);
  bonus = Math.floor((hullPoints * rankMult) / 100);
  hullPoints += bonus;
  const maxHullPoints = hullPoints;

  // MOVEMENT: base movement → rank bonus
  let movement = calcBaseMovement(ship);
  bonus = Math.floor((movement * rankMult) / 100);
  movement += bonus;

  // DAMAGE REDUCTION: base from armor + shields → rank bonus
  let damageReduction = calcBaseDamageReduction(ship);
  bonus = Math.floor((damageReduction * rankMult) / 100);
  damageReduction += bonus;

  return {
    version: 1,
    range,
    gunDamage,
    hullPoints,
    maxHullPoints,
    movement,
    damageReduction,
    reactorCriticalTimer: 0,
    statusEffects: [],
  };
}

// Generate a random ship
function generateRandomShip(index: number): Ship {
  const name = SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)];

  // Every 5th ship gets rank 3-5
  let shipsDestroyed = Math.floor(Math.random() * 10); // Default rank 1
  if (index % 5 === 0) {
    const rank = Math.floor(Math.random() * 3) + 3; // Rank 3, 4, or 5
    if (rank === 3) {
      shipsDestroyed = Math.floor(Math.random() * 70) + 30; // 30-99
    } else if (rank === 4) {
      shipsDestroyed = Math.floor(Math.random() * 200) + 100; // 100-299
    } else {
      shipsDestroyed = Math.floor(Math.random() * 700) + 300; // 300-999
    }
  }

  // Random equipment
  const mainWeapon = Math.floor(Math.random() * 4);
  const armor = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
  const shields =
    armor === 0
      ? Math.random() > 0.5
        ? Math.floor(Math.random() * 3) + 1
        : 0
      : 0;
  const special = Math.floor(Math.random() * 4);

  // Random traits
  const accuracy = Math.floor(Math.random() * 3);
  const hull = Math.floor(Math.random() * 3);
  const speed = Math.floor(Math.random() * 3);
  const variant = Math.floor(Math.random() * 10);

  // Random colors
  const h1 = Math.floor(Math.random() * 360);
  const s1 = Math.floor(Math.random() * 100);
  const l1 = Math.floor(Math.random() * 100);
  const h2 = Math.floor(Math.random() * 360);
  const s2 = Math.floor(Math.random() * 100);
  const l2 = Math.floor(Math.random() * 100);

  // 20% chance of being shiny
  const shiny = Math.random() < 0.2;

  return {
    name,
    id: BigInt(index),
    equipment: {
      mainWeapon,
      armor,
      shields,
      special,
    },
    traits: {
      serialNumber: BigInt(index),
      colors: {
        h1,
        s1,
        l1,
        h2,
        s2,
        l2,
      },
      variant,
      accuracy,
      hull,
      speed,
    },
    shipData: {
      shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: BigInt(0),
    },
    owner: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };
}

export const HeroShipShowcase: React.FC = () => {
  // Rotate ships every 10 seconds
  const [shipIndex, setShipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShipIndex((prev) => prev + 1);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Generate current hero ship
  const heroShip = useMemo(() => generateRandomShip(shipIndex), [shipIndex]);

  // Calculate attributes for the ship
  const shipAttributes = useMemo<Attributes>(
    () => calculateAttributes(heroShip),
    [heroShip],
  );

  // Calculate ship rank
  const shipRank = useMemo(() => calculateShipRank(heroShip), [heroShip]);

  // Render the hero ship
  const heroShipImage = useMemo(() => {
    try {
      return renderShip(heroShip);
    } catch (error) {
      console.error("Error rendering hero ship:", error);
      return null;
    }
  }, [heroShip]);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 w-full">
      {/* Stats panel (left of art) */}
      <div className="order-2 md:order-1 flex-1">
        <div
          className="border-2 border-cyan-400 bg-black/60 p-4 flex flex-col justify-between"
          style={{
            borderRadius: 0, // Square corners for industrial theme
            minWidth: SHIP_ART_SIZE / 2,
            height: SHIP_ART_SIZE, // Match ship art box height
          }}
        >
          {/* Ship Name and Rank */}
          <div className="mb-3">
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily:
                  "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
              }}
            >
              {heroShip.name}
            </h3>
            <div className="flex items-center gap-2">
              {heroShip.shipData.shiny && (
                <span
                  className="text-xs px-2 py-1 border border-yellow-400 text-yellow-400 bg-yellow-400/20"
                  style={{
                    borderRadius: 0,
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  SHINY
                </span>
              )}
              <span
                className="text-xs px-2 py-1 border font-mono font-bold"
                style={{
                  borderRadius: 0,
                  ...(shipRank.rank === 3
                    ? {
                        color: "var(--color-cyan)",
                        borderColor: "var(--color-cyan)",
                        backgroundColor: "rgba(86, 214, 255, 0.2)",
                      }
                    : shipRank.rank === 4
                      ? {
                          color: "#a855f7",
                          borderColor: "#a855f7",
                          backgroundColor: "rgba(168, 85, 247, 0.2)",
                        }
                      : shipRank.rank === 5
                        ? {
                            color: "var(--color-amber)",
                            borderColor: "var(--color-amber)",
                            backgroundColor: "rgba(255, 184, 77, 0.2)",
                          }
                        : {
                            color: "var(--color-text-muted)",
                            borderColor: "var(--color-text-muted)",
                            backgroundColor: "rgba(100, 116, 139, 0.2)",
                          }),
                }}
              >
                R{shipRank.rank}
              </span>
            </div>
          </div>

          {/* Equipment */}
          <div
            className="mb-3 pb-3 border-b border-cyan-400/20"
            style={{
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="opacity-60">Weapon:</span>
                <span className="text-cyan-300">
                  {getMainWeaponName(heroShip.equipment.mainWeapon)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Armor:</span>
                <span className="text-cyan-300">
                  {heroShip.equipment.armor > 0
                    ? getArmorName(heroShip.equipment.armor)
                    : heroShip.equipment.shields > 0
                      ? getShieldName(heroShip.equipment.shields)
                      : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Special:</span>
                <span className="text-cyan-300">
                  {heroShip.equipment.special > 0
                    ? getSpecialName(heroShip.equipment.special)
                    : "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div
            className="text-xs space-y-1"
            style={{
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            <div className="flex justify-between">
              <span className="opacity-60">Range:</span>
              <span className="text-green-400 font-bold">
                {shipAttributes.range}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Damage:</span>
              <span className="text-red-400 font-bold">
                {shipAttributes.gunDamage}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Hull:</span>
              <span className="text-amber-400 font-bold">
                {shipAttributes.hullPoints}/{shipAttributes.maxHullPoints}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Move:</span>
              <span className="text-cyan-400 font-bold">
                {shipAttributes.movement}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Defense:</span>
              <span className="text-yellow-400 font-bold">
                {shipAttributes.damageReduction}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ship art (right) */}
      <div className="flex items-center justify-center order-1 md:order-2">
        {heroShipImage ? (
          <div
            className="relative p-4 bg-black/40 border-2 border-cyan-400/30 flex items-center justify-center"
            style={{
              borderRadius: 0, // Square corners for industrial theme
              width: SHIP_ART_SIZE,
              height: SHIP_ART_SIZE, // Square box
            }}
          >
            <img
              src={heroShipImage}
              alt={heroShip.name}
              className="w-full h-full object-contain"
              style={{
                imageRendering: "pixelated",
                filter: "drop-shadow(0 0 20px rgba(86, 214, 255, 0.4))",
              }}
            />
            {/* Glow effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: "inset 0 0 60px rgba(86, 214, 255, 0.1)",
              }}
            />
          </div>
        ) : (
          <div
            className="bg-black/40 border-2 border-cyan-400/30 flex items-center justify-center"
            style={{
              borderRadius: 0, // Square corners for industrial theme
              width: SHIP_ART_SIZE,
              height: SHIP_ART_SIZE, // Square box
            }}
          >
            <p
              className="text-sm opacity-50"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-text-muted)",
              }}
            >
              Loading ship...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

