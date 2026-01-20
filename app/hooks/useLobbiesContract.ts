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
  args?: readonly unknown[]
) {
  return useReadContract({
    ...lobbiesContractConfig,
    functionName,
    args,
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
export function useLobby(lobbyId: bigint) {
  const { data, error, isLoading, refetch } = useLobbiesRead("getLobby", [
    lobbyId,
  ]);

  return {
    lobby: data
      ? ({
          basic: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (data as any)[0],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            creator: (data as any)[1],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            costLimit: (data as any)[3],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createdAt: (data as any)[5],
          },
          players: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            joiner: (data as any)[2],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reservedJoiner: (data as any).players?.reservedJoiner || "0x0000000000000000000000000000000000000000",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            creatorFleetId: (data as any)[7],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            joinerFleetId: (data as any)[8],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            joinedAt: (data as any)[11],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            joinerFleetSetAt: (data as any)[12],
          },
          gameConfig: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            creatorGoesFirst: (data as any)[9],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            turnTime: (data as any)[10],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selectedMapId: (data as any)[13],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            maxScore: (data as any)[14],
          },
          state: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: (data as any)[4],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            gameStartedAt: (data as any)[6],
          },
        } as Lobby)
      : undefined,
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
