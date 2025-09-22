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

  console.log("Setting up contract event watchers for address:", address);
  console.log("Game contract address:", CONTRACT_ADDRESSES.GAME);

  // Watch ship transfer events
  useWatchContractEvent({
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
          console.log("Ship transfer detected, refetching data...");
          refetchShips();
        }
      } catch (error) {
        console.error("Error processing ship transfer logs:", error);
      }
    },
  });

  // Watch game move events
  console.log("Setting up Move event watcher");
  useWatchContractEvent({
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
      console.log("Move event logs received:", logs);
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        console.log("Game Move event detected, refetching game data...");
        console.log(
          "Registered game refetch functions:",
          globalGameRefetchFunctions.size
        );
        refetchGames();

        // Also refetch individual game data for all registered games
        globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
          console.log(`Refetching individual game data for game ${gameId}`);
          refetchFn();
        });
      } catch (error) {
        console.error("Error processing game move logs:", error);
      }
    },
  });

  // Watch game update events
  console.log("Setting up GameUpdate event watcher");
  useWatchContractEvent({
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
      console.log("GameUpdate event logs received:", logs);
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        console.log("Game Update event detected, refetching game data...");
        console.log(
          "Registered game refetch functions:",
          globalGameRefetchFunctions.size
        );
        refetchGames();

        // Also refetch individual game data for all registered games
        globalGameRefetchFunctions.forEach((refetchFn, gameId) => {
          console.log(`Refetching individual game data for game ${gameId}`);
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
