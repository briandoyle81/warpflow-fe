import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
// import { Ship, ShipTuple } from "../types/types";

// Hook for reading contract data
export function useShipsContract() {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return {
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    chainId: activeChainId,
  };
}

// Hook for reading contract data with proper typing
export function useShipsRead(functionName: string, args?: readonly unknown[]) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return useReadContract({
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    chainId: activeChainId,
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
