import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { Ship, ShipTuple } from "../types/types";

// Contract instance configuration
export const shipsContractConfig = {
  address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
  abi: CONTRACT_ABIS.SHIPS,
} as const;

// Hook for reading contract data
export function useShipsContract() {
  return {
    address: shipsContractConfig.address,
    abi: shipsContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useShipsRead<TData>(
  functionName: string,
  args?: readonly unknown[]
) {
  return useReadContract({
    ...shipsContractConfig,
    functionName,
    args,
  });
}

// Hook for writing to contract with proper typing
export function useShipsWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type ShipsReadFunction =
  | "getShip"
  | "getShipIdsOwned"
  | "getShipsByIds"
  | "getPurchaseInfo"
  | "getCosts"
  | "getCurrentCostsVersion"
  | "isShipDestroyed"
  | "getTierOfTrait"
  | "shipCount";

export type ShipsWriteFunction =
  | "constructShip"
  | "constructShips"
  | "constructAllMyShips"
  | "shipBreaker"
  | "setCostOfShip";
