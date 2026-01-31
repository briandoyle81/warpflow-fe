import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import { Lobby, PlayerLobbyState } from "../types/types";

// Contract instance configuration
export const lobbiesContractConfig = {
  address: CONTRACT_ADDRESSES.LOBBIES as `0x${string}`,
  abi: CONTRACT_ABIS.LOBBIES as Abi,
} as const;

// Hook for reading contract data
export function useLobbiesContract() {
  return {
    address: lobbiesContractConfig.address,
    abi: lobbiesContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useLobbiesRead(
  functionName: string,
  args?: readonly unknown[],
  // Pass-through wagmi options (e.g. query.enabled)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
) {
  return useReadContract({
    ...lobbiesContractConfig,
    functionName,
    args,
    ...(options || {}),
  });
}

// Hook for writing to contract with proper typing
export function useLobbiesWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type LobbiesReadFunction =
  | "getLobby"
  | "getPlayerState"
  | "getPlayerTimeoutEnd"
  | "isLobbyOpenForJoining"
  | "lobbyCount"
  | "freeGamesPerAddress"
  | "additionalLobbyFee"
  | "paused";

export type LobbiesWriteFunction =
  | "createLobby"
  | "joinLobby"
  | "leaveLobby"
  | "timeoutJoiner"
  | "createFleet"
  | "quitWithPenalty"
  | "acceptGame"
  | "rejectGame";

// Helper hooks for common operations
export function useLobby(
  lobbyId: bigint,
  options?: { enabled?: boolean }
) {
  const { data, error, isLoading, refetch } = useLobbiesRead(
    "getLobby",
    [lobbyId],
    { query: { enabled: options?.enabled ?? true } }
  );

  return {
    // The contract returns the Lobby struct directly (same shape as `Lobby`).
    lobby: (data as Lobby | undefined) ?? undefined,
    error,
    isLoading,
    refetch,
  };
}

export function usePlayerLobbyState(playerAddress: string) {
  const { data, error, isLoading, refetch } = useLobbiesRead("getPlayerState", [
    playerAddress,
  ]);

  return {
    playerState: data
      ? ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeLobbyId: (data as any)[0],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeLobbiesCount: (data as any)[1],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasActiveLobby: (data as any)[2],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          kickCount: (data as any)[3],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastKickTime: (data as any)[4],
        } as PlayerLobbyState)
      : undefined,
    error,
    isLoading,
    refetch,
  };
}

export function useLobbyCount() {
  return useLobbiesRead("lobbyCount");
}

export function useLobbySettings() {
  const freeGames = useLobbiesRead("freeGamesPerAddress");
  const additionalFee = useLobbiesRead("additionalLobbyFee");
  const paused = useLobbiesRead("paused");

  return {
    freeGamesPerAddress: freeGames.data,
    additionalLobbyFee: additionalFee.data,
    paused: paused.data,
    isLoading:
      freeGames.isLoading || additionalFee.isLoading || paused.isLoading,
    error: freeGames.error || additionalFee.error || paused.error,
  };
}

export function useIsLobbyOpenForJoining(lobbyId: bigint) {
  return useLobbiesRead("isLobbyOpenForJoining", [lobbyId]);
}
