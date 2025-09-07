import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import {
  Lobby,
  LobbyTuple,
  PlayerLobbyState,
  PlayerLobbyStateTuple,
} from "../types/types";

// Contract instance configuration
export const lobbiesContractConfig = {
  address: CONTRACT_ADDRESSES.LOBBIES as `0x${string}`,
  abi: CONTRACT_ABIS.LOBBIES,
} as const;

// Hook for reading contract data
export function useLobbiesContract() {
  return {
    address: lobbiesContractConfig.address,
    abi: lobbiesContractConfig.abi,
  };
}

// Hook for reading contract data with proper typing
export function useLobbiesRead<TData>(
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
  | "quitWithPenalty";

// Helper hooks for common operations
export function useLobby(lobbyId: bigint) {
  const { data, error, isLoading, refetch } = useLobbiesRead<LobbyTuple>(
    "getLobby",
    [lobbyId]
  );

  return {
    lobby: data
      ? ({
          basic: {
            id: data[0],
            creator: data[1],
            costLimit: data[3],
            createdAt: data[5],
          },
          players: {
            joiner: data[2],
            creatorFleetId: data[7],
            joinerFleetId: data[8],
            joinedAt: data[11],
            joinerFleetSetAt: data[12],
          },
          gameConfig: {
            creatorGoesFirst: data[9],
            turnTime: data[10],
            selectedMapId: data[13],
            maxScore: data[14],
          },
          state: {
            status: data[4],
            gameStartedAt: data[6],
          },
        } as Lobby)
      : undefined,
    error,
    isLoading,
    refetch,
  };
}

export function usePlayerLobbyState(playerAddress: string) {
  const { data, error, isLoading, refetch } =
    useLobbiesRead<PlayerLobbyStateTuple>("getPlayerState", [playerAddress]);

  return {
    playerState: data
      ? ({
          activeLobbyId: data[0],
          activeLobbiesCount: data[1],
          hasActiveLobby: data[2],
          kickCount: data[3],
          lastKickTime: data[4],
        } as PlayerLobbyState)
      : undefined,
    error,
    isLoading,
    refetch,
  };
}

export function useLobbyCount() {
  return useLobbiesRead<bigint>("lobbyCount");
}

export function useLobbySettings() {
  const freeGames = useLobbiesRead<bigint>("freeGamesPerAddress");
  const additionalFee = useLobbiesRead<bigint>("additionalLobbyFee");
  const paused = useLobbiesRead<boolean>("paused");

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
  return useLobbiesRead<boolean>("isLobbyOpenForJoining", [lobbyId]);
}
