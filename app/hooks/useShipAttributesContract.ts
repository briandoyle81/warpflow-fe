import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";

// Types based on the contract
export interface GunData {
  range: number;
  damage: number;
  movement: number;
}

export interface ArmorData {
  damageReduction: number;
  movement: number;
}

export interface ShieldData {
  damageReduction: number;
  movement: number;
}

export interface SpecialData {
  range: number;
  strength: number;
  movement: number;
}

export interface AttributesVersion {
  version: number;
  baseHull: number;
  baseSpeed: number;
  foreAccuracy: number[];
  hull: number[];
  engineSpeeds: number[];
  guns: GunData[];
  armors: ArmorData[];
  shields: ShieldData[];
  specials: SpecialData[];
}

export interface Costs {
  version: number;
  baseCost: number;
  accuracy: number[];
  hull: number[];
  speed: number[];
  mainWeapon: number[];
  armor: number[];
  shields: number[];
  special: number[];
}

export type ShipAttributesReadFunction =
  | "getCurrentAttributesVersion"
  | "getCurrentCostsVersion"
  | "getAttributesVersionBase"
  | "getCosts"
  | "getGunData"
  | "getArmorData"
  | "getShieldData"
  | "getSpecialData"
  | "getSpecialRange"
  | "getSpecialStrength"
  | "owner";

export type ShipAttributesWriteFunction =
  | "setCurrentAttributesVersion"
  | "setAttributesVersionBase"
  | "addGunData"
  | "addArmorData"
  | "addShieldData"
  | "addSpecialData"
  | "addForeAccuracy"
  | "addEngineSpeed"
  | "setCosts";

export function useShipAttributesRead(
  functionName: ShipAttributesReadFunction,
  args?: readonly unknown[]
) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES,
    functionName,
    args,
  });
}

export function useShipAttributesWrite() {
  return useWriteContract();
}

export function useShipAttributesOwner() {
  const { data: owner } = useShipAttributesRead("owner");
  const { address } = useAccount();

  return {
    owner: owner as string,
    isOwner:
      address &&
      owner &&
      address.toLowerCase() === (owner as string).toLowerCase(),
  };
}

// Specific hooks for common operations
export function useCurrentAttributesVersion() {
  return useShipAttributesRead("getCurrentAttributesVersion");
}

export function useCurrentCostsVersion() {
  return useShipAttributesRead("getCurrentCostsVersion");
}

export function useCosts() {
  return useShipAttributesRead("getCosts");
}

export function useAttributesVersionBase(version: number) {
  return useShipAttributesRead("getAttributesVersionBase", [version]);
}

export function useGunData(weaponIndex: number) {
  return useShipAttributesRead("getGunData", [weaponIndex]);
}

export function useArmorData(armorIndex: number) {
  return useShipAttributesRead("getArmorData", [armorIndex]);
}

export function useShieldData(shieldIndex: number) {
  return useShipAttributesRead("getShieldData", [shieldIndex]);
}

export function useSpecialData(specialIndex: number) {
  return useShipAttributesRead("getSpecialData", [specialIndex]);
}
