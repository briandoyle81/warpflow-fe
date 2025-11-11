"use client";

import { useAccount, useWatchContractEvent } from "wagmi";
import { useOwnedShips } from "./useOwnedShips";
import { usePlayerGames } from "./usePlayerGames";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useCallback, useMemo } from "react";

const SHIP_TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
    ],
  },
] as const;

const GAME_UPDATE_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "gameId",
        type: "uint256",
      },
    ],
    name: "GameUpdate",
    type: "event",
  },
] as const;

// Global refetch functions for individual game data
export const globalGameRefetchFunctions: Map<number, () => void> = new Map();

// Function to register a game refetch function
export function registerGameRefetch(gameId: number, refetchFn: () => void) {
  globalGameRefetchFunctions.set(gameId, refetchFn);
}

// Function to unregister a game refetch function
export function unregisterGameRefetch(gameId: number) {
  globalGameRefetchFunctions.delete(gameId);
}

export function useContractEvents() {
  const { address } = useAccount();
  const { refetch: refetchShips } = useOwnedShips();
  const { refetch: refetchGames } = usePlayerGames();

  // Only set up watchers if address is available
  const shouldWatch = !!address;

  const handleShipTransferLogs = useCallback(
    (logs: unknown[]) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Check if any of the events involve our address
        const relevantLogs = logs.filter((log) => {
          if (!log || typeof log !== "object") return false;
          const args = (log as { args?: { to?: string; from?: string } }).args;
          if (!args) return false;
          return args.to === address || args.from === address;
        });

        if (relevantLogs.length > 0) {
          refetchShips();
        }
      } catch (error) {
        console.error("Error processing ship transfer logs:", error);
      }
    },
    [address, refetchShips]
  );

  const handleGameUpdateLogs = useCallback(
    (logs: unknown[]) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Extract game IDs from the events
        const gameIds = new Set<number>();
        logs.forEach((log) => {
          const args = (log as { args?: { gameId?: bigint } }).args;
          if (args && typeof args.gameId === "bigint") {
            gameIds.add(Number(args.gameId));
          }
        });

        if (gameIds.size === 0) return;

        // Add 1 second delay to allow RPC to index the state change
        setTimeout(() => {
          refetchGames();

          // Also refetch individual game data for all registered games
          // Pass gameIds so each game can check if the event was for them
          globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
            if (gameIds.has(gameId)) {
              // This event was for this game - call the refetch function
              refetchFn();
            }
          });
        }, 1000);
      } catch (error) {
        console.error("Error processing game update logs:", error);
      }
    },
    [refetchGames]
  );

  const shipEventConfig = useMemo(
    () => ({
      address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
      abi: SHIP_TRANSFER_EVENT_ABI,
      eventName: "Transfer" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleShipTransferLogs,
    }),
    [handleShipTransferLogs, shouldWatch]
  );

  const gameEventConfig = useMemo(
    () => ({
      address: CONTRACT_ADDRESSES.GAME as `0x${string}`,
      abi: GAME_UPDATE_EVENT_ABI,
      eventName: "GameUpdate" as const,
      poll: true as const,
      pollingInterval: 5000,
      enabled: shouldWatch,
      onLogs: handleGameUpdateLogs,
    }),
    [handleGameUpdateLogs, shouldWatch]
  );

  // Watch ship transfer events (only when address is available)
  useWatchContractEvent(shipEventConfig);

  // Watch game update events
  useWatchContractEvent(gameEventConfig);

  return {
    isListening: !!address,
  };
}
