"use client";

import { useAccount, useWatchContractEvent } from "wagmi";
import { useOwnedShips } from "./useOwnedShips";
import { usePlayerGames } from "./usePlayerGames";
import { CONTRACT_ADDRESSES } from "../config/contracts";

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

  // Watch ship transfer events (only when address is available)
  useWatchContractEvent({
    enabled: shouldWatch,
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: [
      {
        type: "event",
        name: "Transfer",
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "tokenId", type: "uint256" },
        ],
      },
    ],
    eventName: "Transfer",
    poll: true, // Force polling since WebSockets not available
    pollingInterval: 5000, // Poll every 5 seconds
    onLogs: (logs) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Check if any of the events involve our address
        const relevantLogs = logs.filter((log) => {
          if (!log || !log.args) return false;
          const args = log.args as { to?: string; from?: string };
          return args.to === address || args.from === address;
        });

        if (relevantLogs.length > 0) {
          refetchShips();
        }
      } catch (error) {
        console.error("Error processing ship transfer logs:", error);
      }
    },
  });

  // Watch game update events
  useWatchContractEvent({
    enabled: shouldWatch,
    address: CONTRACT_ADDRESSES.GAME as `0x${string}`,
    abi: [
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
    ],
    eventName: "GameUpdate",
    poll: true, // Force polling since WebSockets not available
    pollingInterval: 5000, // Poll every 5 seconds
    onLogs: (logs) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        // Extract game IDs from the events
        const gameIds = new Set<number>();
        logs.forEach((log) => {
          if (log.args && typeof log.args.gameId === "bigint") {
            gameIds.add(Number(log.args.gameId));
          }
        });

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
  });

  return {
    isListening: !!address,
  };
}
