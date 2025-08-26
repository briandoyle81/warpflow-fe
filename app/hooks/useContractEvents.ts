import { useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useOwnedShips } from "./useOwnedShips";

export function useContractEvents() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { refetch } = useOwnedShips();

  // Debug logging to check contract addresses
  console.log("Contract addresses:", CONTRACT_ADDRESSES);
  console.log("SHIPS address:", CONTRACT_ADDRESSES.SHIPS);

  // Temporary disable flag for debugging
  const DISABLE_EVENT_WATCHING = false; // Set to true to disable all event watching

  // Listen to ship construction events
  const listenToShipConstruction = useCallback(async () => {
    if (!address || !publicClient || !CONTRACT_ADDRESSES.SHIPS) {
      console.warn("Missing required data for ship construction listener");
      return;
    }

    // Additional safety check for contract address format
    if (
      typeof CONTRACT_ADDRESSES.SHIPS !== "string" ||
      !CONTRACT_ADDRESSES.SHIPS.startsWith("0x")
    ) {
      console.error(
        "Invalid SHIPS contract address:",
        CONTRACT_ADDRESSES.SHIPS
      );
      return;
    }

    try {
      // Use a more defensive approach with error handling
      const unwatch = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: [
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                indexed: true,
                internalType: "uint256",
                name: "tokenId",
                type: "uint256",
              },
            ],
            name: "Transfer",
            type: "event",
          },
        ],
        eventName: "Transfer",
        onLogs: (logs) => {
          // Defensive null check with early return
          if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return;
          }

          try {
            // Check if any of the events involve our address
            const relevantLogs = logs.filter((log) => {
              // Add null checks for log.args
              if (!log.args || !log.args.to || !log.args.from) return false;
              return log.args.to === address || log.args.from === address;
            });

            if (relevantLogs.length > 0) {
              console.log("Ship transfer detected, refetching data...");
              // Wait a bit for the transaction to be processed
              setTimeout(() => refetch(), 2000);
            }
          } catch (error) {
            console.error("Error processing ship construction logs:", error);
          }
        },
        onError: (error) => {
          console.error("Error listening to ship construction events:", error);
          // Try to recover by refetching data anyway
          setTimeout(() => refetch(), 5000);
        },
      });

      return unwatch;
    } catch (error) {
      console.error("Error setting up ship construction listener:", error);
      return undefined;
    }
  }, [address, publicClient, refetch]);

  // Listen to ship recycling events
  const listenToShipRecycling = useCallback(async () => {
    if (!address || !publicClient || !CONTRACT_ADDRESSES.SHIPS) {
      console.warn("Missing required data for ship recycling listener");
      return;
    }

    // Additional safety check for contract address format
    if (
      typeof CONTRACT_ADDRESSES.SHIPS !== "string" ||
      !CONTRACT_ADDRESSES.SHIPS.startsWith("0x")
    ) {
      console.error(
        "Invalid SHIPS contract address:",
        CONTRACT_ADDRESSES.SHIPS
      );
      return;
    }

    try {
      // Listen to ShipBreaker events (when ships are recycled)
      const unwatch = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: [
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
              },
              {
                indexed: false,
                internalType: "uint256[]",
                name: "shipIds",
                type: "uint256[]",
              },
              {
                indexed: false,
                internalType: "uint256",
                name: "ucAmount",
                type: "uint256",
              },
            ],
            name: "ShipsRecycled",
            type: "event",
          },
        ],
        eventName: "ShipsRecycled",
        onLogs: (logs) => {
          // Defensive null check with early return
          if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return;
          }

          try {
            // Check if any of the events involve our address
            const relevantLogs = logs.filter((log) => {
              // Add null checks for log.args
              if (!log.args || !log.args.owner) return false;
              return log.args.owner === address;
            });

            if (relevantLogs.length > 0) {
              console.log("Ship recycling detected, refetching data...");
              // Wait a bit for the transaction to be processed
              setTimeout(() => refetch(), 2000);
            }
          } catch (error) {
            console.error("Error processing ship recycling logs:", error);
          }
        },
        onError: (error) => {
          console.error("Error listening to ship recycling events:", error);
          // Try to recover by refetching data anyway
          setTimeout(() => refetch(), 5000);
        },
      });

      return unwatch;
    } catch (error) {
      console.error("Error setting up ship recycling listener:", error);
    }
  }, [address, publicClient, refetch]);

  // Set up event listeners
  useEffect(() => {
    let unwatchConstruction: (() => void) | undefined;
    let unwatchRecycling: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        // Check if event watching is disabled
        if (DISABLE_EVENT_WATCHING) {
          console.log("Event watching is disabled for debugging");
          return;
        }

        // Check if we have all required data before setting up listeners
        if (!address || !publicClient || !CONTRACT_ADDRESSES.SHIPS) {
          console.warn("Skipping event listener setup - missing required data");
          return;
        }

        // Validate contract address format
        if (
          typeof CONTRACT_ADDRESSES.SHIPS !== "string" ||
          !CONTRACT_ADDRESSES.SHIPS.startsWith("0x")
        ) {
          console.error(
            "Invalid contract address format, skipping event listeners"
          );
          return;
        }

        if (address) {
          // Wrap in try-catch to handle individual listener failures
          try {
            unwatchConstruction = await listenToShipConstruction();
          } catch (error) {
            console.error("Failed to setup construction listener:", error);
          }

          try {
            unwatchRecycling = await listenToShipRecycling();
          } catch (error) {
            console.error("Failed to setup recycling listener:", error);
          }
        }
      } catch (error) {
        console.error("Error setting up contract event listeners:", error);
        // Don't crash the app, just log the error
      }
    };

    setupListeners();

    // Cleanup function
    return () => {
      try {
        if (unwatchConstruction) unwatchConstruction();
        if (unwatchRecycling) unwatchRecycling();
      } catch (error) {
        console.error("Error cleaning up contract event listeners:", error);
      }
    };
  }, [address, publicClient, listenToShipConstruction, listenToShipRecycling]);

  return {
    isListening: !!address,
  };
}
