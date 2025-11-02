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

  // Watch game move events
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
          {
            indexed: false,
            internalType: "uint256",
            name: "shipId",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "int16",
            name: "newRow",
            type: "int16",
          },
          {
            indexed: false,
            internalType: "int16",
            name: "newCol",
            type: "int16",
          },
          {
            indexed: false,
            internalType: "enum ActionType",
            name: "actionType",
            type: "uint8",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "targetShipId",
            type: "uint256",
          },
        ],
        name: "Move",
        type: "event",
      },
    ],
    eventName: "Move",
    poll: true, // Force polling since WebSockets not available
    pollingInterval: 5000, // Poll every 5 seconds
    onLogs: (logs) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        refetchGames();

        // Also refetch individual game data for all registered games
        globalGameRefetchFunctions.forEach((refetchFn) => {
          refetchFn();
        });
      } catch (error) {
        console.error("Error processing game move logs:", error);
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
        refetchGames();

        // Also refetch individual game data for all registered games
        globalGameRefetchFunctions.forEach((refetchFn) => {
          refetchFn();
        });
      } catch (error) {
        console.error("Error processing game update logs:", error);
      }
    },
  });

  return {
    isListening: !!address,
  };
}
