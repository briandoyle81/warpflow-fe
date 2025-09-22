import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

// Contract instance configuration
export const gameContractConfig = {
  address: CONTRACT_ADDRESSES.GAME as `0x${string}`,
  abi: CONTRACT_ABIS.GAME as Abi,
} as const;

// Hook for reading contract data
export function useGameContract() {
  return {
    address: gameContractConfig.address,
    abi: gameContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useGameRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  return useReadContract({
    ...gameContractConfig,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useGameWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type GameReadFunction =
  | "gameCount"
  | "playerGames"
  | "getGame"
  | "getGamesFromIds"
  | "games";

// Specific hooks for common functions
export function useGameCount() {
  return useGameRead("gameCount");
}

export function useGetGamesForPlayer(playerAddress: string) {
  return useGameRead("getGamesForPlayer", [playerAddress], {
    query: { enabled: !!playerAddress },
  });
}

export function useGetGame(gameId: number) {
  return useGameRead("getGame", [BigInt(gameId)], {
    query: { enabled: gameId > 0 },
  });
}

export function useGetGamesFromIds(gameIds: number[]) {
  return useGameRead("getGamesFromIds", [gameIds.map((id) => BigInt(id))], {
    query: { enabled: gameIds.length > 0 },
  });
}
