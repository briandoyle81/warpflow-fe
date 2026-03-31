import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";

// Hook for reading contract data
export function useGameContract() {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return {
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
  };
}

// Hook for reading contract data with proper typing
export function useGameRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return useReadContract({
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
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
