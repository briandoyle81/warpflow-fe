import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import {
  useLobbiesWrite,
  useLobbyCount,
  usePlayerLobbyState,
  useLobbySettings,
  useIsLobbyOpenForJoining,
  useLobby,
  lobbiesContractConfig,
  useLobbiesRead,
} from "./useLobbiesContract";
import { useLobbyList } from "./useLobbyList";
import { Lobby, LobbyStatus } from "../types/types";

export interface CreateLobbyParams {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
}

export interface LobbyListState {
  lobbies: Lobby[];
  isLoading: boolean;
  error: string | null;
}

export function useLobbies() {
  const { address } = useAccount();
  const { writeContract } = useLobbiesWrite();
  const { data: lobbyCount } = useLobbyCount();
  const { playerState } = usePlayerLobbyState(address || "");
  const { freeGamesPerAddress, additionalLobbyFee, paused } =
    useLobbySettings();

  // Use the new lobby list hook
  const {
    lobbies,
    isLoading: lobbiesLoading,
    error: lobbiesError,
    refetch: loadLobbies,
  } = useLobbyList();

  const [lobbyList, setLobbyList] = useState<LobbyListState>({
    lobbies: [],
    isLoading: false,
    error: null,
  });

  // Create a new lobby
  const createLobby = async (params: CreateLobbyParams) => {
    if (!address) throw new Error("No wallet connected");
    if (paused) throw new Error("Lobby creation is currently paused");

    try {
      // Check if player needs to pay for additional lobbies
      const needsPayment =
        playerState &&
        playerState.activeLobbiesCount >= (freeGamesPerAddress || 0n);

      const value = needsPayment ? additionalLobbyFee || 0n : 0n;

      await writeContract({
        ...lobbiesContractConfig,
        functionName: "createLobby",
        args: [
          params.costLimit,
          params.turnTime,
          params.creatorGoesFirst,
          params.selectedMapId,
          params.maxScore,
        ],
        value,
      });
    } catch (error) {
      console.error("Failed to create lobby:", error);
      throw error;
    }
  };

  // Join an existing lobby
  const joinLobby = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "joinLobby",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to join lobby:", error);
      throw error;
    }
  };

  // Leave a lobby
  const leaveLobby = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "leaveLobby",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to leave lobby:", error);
      throw error;
    }
  };

  // Timeout a joiner
  const timeoutJoiner = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "timeoutJoiner",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to timeout joiner:", error);
      throw error;
    }
  };

  // Create a fleet for a lobby
  const createFleet = async (lobbyId: bigint, shipIds: bigint[]) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "createFleet",
        args: [lobbyId, shipIds],
      });
    } catch (error) {
      console.error("Failed to create fleet:", error);
      throw error;
    }
  };

  // Quit with penalty
  const quitWithPenalty = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "quitWithPenalty",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to quit with penalty:", error);
      throw error;
    }
  };

  // Update lobby list when the lobby list hook data changes
  useEffect(() => {
    setLobbyList({
      lobbies,
      isLoading: lobbiesLoading,
      error: lobbiesError,
    });
  }, [lobbies, lobbiesLoading, lobbiesError]);

  return {
    // State
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,

    // Actions
    createLobby,
    joinLobby,
    leaveLobby,
    timeoutJoiner,
    createFleet,
    quitWithPenalty,
    loadLobbies,

    // Computed values
    canCreateLobby: !paused && address !== undefined,
    needsPaymentForLobby: playerState
      ? playerState.activeLobbiesCount >= (freeGamesPerAddress || 0n)
      : false,
  };
}
