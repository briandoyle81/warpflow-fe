import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import {
  useLobbiesWrite,
  useLobbyCount,
  usePlayerLobbyState,
  useLobbySettings,
  lobbiesContractConfig,
} from "./useLobbiesContract";
import { useLobbyList } from "./useLobbyList";
import { Lobby } from "../types/types";

export interface CreateLobbyParams {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
  reservedJoiner?: Address; // Optional: address to reserve for (address(0) for open lobby)
}

export interface LobbyListState {
  lobbies: Lobby[];
  isLoading: boolean;
  error: string | null;
}

export function useLobbies() {
  const { address } = useAccount();
  const { writeContract, data: hash } = useLobbiesWrite();
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
  const createLobby = async (
    params: CreateLobbyParams & { activeLobbiesCount?: number }
  ) => {
    if (!address) throw new Error("No wallet connected");
    if (paused) throw new Error("Lobby creation is currently paused");

    try {
      // Check if player needs to pay for additional lobbies
      // Use passed activeLobbiesCount if available, otherwise fall back to blockchain data
      const currentActiveLobbies =
        params.activeLobbiesCount ??
        (playerState?.activeLobbiesCount
          ? Number(playerState.activeLobbiesCount)
          : 0);
      const needsPayment =
        currentActiveLobbies >= Number(freeGamesPerAddress || 0n);

      const value: bigint = needsPayment
        ? (additionalLobbyFee as bigint) || 0n
        : 0n;

      await writeContract({
        ...lobbiesContractConfig,
        functionName: "createLobby",
        args: [
          params.costLimit,
          params.turnTime,
          params.creatorGoesFirst,
          params.selectedMapId,
          params.maxScore,
          params.reservedJoiner || "0x0000000000000000000000000000000000000000", // Use zero address if not specified
        ],
        value,
      });

      // Refresh the lobby list after creating a lobby
      loadLobbies();
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

      // Refresh the lobby list after joining a lobby
      loadLobbies();
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
  const createFleet = async (
    lobbyId: bigint,
    shipIds: bigint[],
    startingPositions: Array<{ row: number; col: number }>
  ): Promise<void> => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "createFleet",
        args: [lobbyId, shipIds, startingPositions],
      });
      // Transaction submitted successfully
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

  // Accept a reserved game
  const acceptGame = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "acceptGame",
        args: [lobbyId],
      });

      // Refresh the lobby list after accepting
      loadLobbies();
    } catch (error) {
      console.error("Failed to accept game:", error);
      throw error;
    }
  };

  // Reject a reserved game
  const rejectGame = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await writeContract({
        ...lobbiesContractConfig,
        functionName: "rejectGame",
        args: [lobbyId],
      });

      // Refresh the lobby list after rejecting
      loadLobbies();
    } catch (error) {
      console.error("Failed to reject game:", error);
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
    acceptGame,
    rejectGame,
    loadLobbies,

    // Transaction hash for waiting on receipt
    lastTransactionHash: hash,

    // Computed values
    canCreateLobby: !paused && address !== undefined,
    needsPaymentForLobby: playerState
      ? Number(playerState.activeLobbiesCount) >=
        Number(freeGamesPerAddress || 0n)
      : false,
  };
}
