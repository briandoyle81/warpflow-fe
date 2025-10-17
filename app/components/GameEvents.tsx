"use client";

import React, { useState, useEffect } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { ActionType, ShipPosition } from "../types/types";
import { parseAbiItem } from "viem";

interface GameEvent {
  id: string;
  gameId: bigint;
  shipId: bigint;
  newRow: number;
  newCol: number;
  actionType: ActionType;
  targetShipId: bigint;
  timestamp: number;
  blockNumber: bigint;
}

interface GameEventsProps {
  gameId: bigint;
  shipMap: Map<bigint, { name: string; owner: string }>;
  shipPositions: readonly ShipPosition[];
  address?: string;
}

export function GameEvents({ gameId, shipMap, address }: GameEventsProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const publicClient = usePublicClient();

  // Fetch historical events on mount
  useEffect(() => {
    const fetchHistoricalEvents = async () => {
      if (!publicClient) return;

      try {
        setIsLoadingHistory(true);
        console.log("Fetching historical Move events for game:", gameId);

        const moveEventAbi = parseAbiItem(
          "event Move(uint256 indexed gameId, uint256 shipId, int16 newRow, int16 newCol, uint8 actionType, uint256 targetShipId)"
        );

        // Get current block number and limit to last 10,000 blocks to respect RPC limits
        const latestBlock = await publicClient.getBlockNumber();
        const startBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n;

        console.log(
          `Fetching events from block ${startBlock.toString()} to ${latestBlock.toString()}`
        );

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.GAME as `0x${string}`,
          event: moveEventAbi,
          args: {
            gameId: gameId,
          },
          fromBlock: startBlock,
          toBlock: latestBlock,
        });

        console.log(`Found ${logs.length} historical Move events`);

        // Get unique block numbers to fetch their timestamps
        const uniqueBlockNumbers = Array.from(
          new Set(logs.map((log) => log.blockNumber))
        );

        // Fetch block timestamps
        const blockTimestamps = new Map<bigint, number>();
        for (const blockNumber of uniqueBlockNumbers) {
          try {
            const block = await publicClient.getBlock({
              blockNumber: blockNumber,
            });
            blockTimestamps.set(blockNumber, Number(block.timestamp) * 1000); // Convert to milliseconds
          } catch (error) {
            console.warn(`Failed to fetch block ${blockNumber}:`, error);
            // Fallback to calculated timestamp
            blockTimestamps.set(
              blockNumber,
              Date.now() - (Number(latestBlock) - Number(blockNumber)) * 800
            );
          }
        }

        const historicalEvents: GameEvent[] = logs.map((log) => {
          const args = log.args as {
            gameId: bigint;
            shipId: bigint;
            newRow: number;
            newCol: number;
            actionType: number;
            targetShipId: bigint;
          };

          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            gameId: args.gameId,
            shipId: args.shipId,
            newRow: args.newRow,
            newCol: args.newCol,
            actionType: args.actionType as ActionType,
            targetShipId: args.targetShipId,
            timestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
            blockNumber: log.blockNumber,
          };
        });

        historicalEvents.sort(
          (a, b) => Number(a.blockNumber) - Number(b.blockNumber)
        );
        setEvents(historicalEvents);
      } catch (error) {
        console.error("Error fetching historical events:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistoricalEvents();
  }, [gameId, publicClient]);

  // Watch for new Move events
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
    poll: true,
    pollingInterval: 2000, // Poll every 2 seconds for more responsive updates
    onLogs: (logs) => {
      if (!Array.isArray(logs) || logs.length === 0) return;

      try {
        const relevantLogs = logs.filter((log) => {
          if (!log || !log.args) return false;
          const args = log.args as {
            gameId?: bigint;
            shipId?: bigint;
            newRow?: number;
            newCol?: number;
            actionType?: number;
            targetShipId?: bigint;
          };
          return args.gameId === gameId;
        });

        if (relevantLogs.length > 0) {
          const newEvents: GameEvent[] = relevantLogs.map((log) => {
            const args = log.args as {
              gameId: bigint;
              shipId: bigint;
              newRow: number;
              newCol: number;
              actionType: number;
              targetShipId: bigint;
            };
            return {
              id: `${log.transactionHash}-${log.logIndex}`,
              gameId: args.gameId,
              shipId: args.shipId,
              newRow: args.newRow,
              newCol: args.newCol,
              actionType: args.actionType as ActionType,
              targetShipId: args.targetShipId,
              timestamp: Date.now(),
              blockNumber: log.blockNumber || 0n,
            };
          });

          setEvents((prevEvents) => {
            // Filter out duplicates and add new events
            const existingIds = new Set(prevEvents.map((e) => e.id));
            const uniqueNewEvents = newEvents.filter(
              (e) => !existingIds.has(e.id)
            );

            // Combine events and sort by block number, keep last 50
            const allEvents = [...prevEvents, ...uniqueNewEvents];
            allEvents.sort(
              (a, b) => Number(a.blockNumber) - Number(b.blockNumber)
            );

            return allEvents.slice(-50); // Keep last 50 events
          });
        }
      } catch (error) {
        console.error("Error processing Move event logs:", error);
      }
    },
  });

  const formatEventDescription = (event: GameEvent): string => {
    const ship = shipMap.get(event.shipId);
    const shipName = ship?.name || `Ship #${event.shipId}`;

    // Check if the ship actually moved - if newRow and newCol are not both zero, it moved
    const moved = !(event.newRow === 0 && event.newCol === 0);

    let description = "";

    if (moved) {
      description = `${shipName} moved to Row: ${event.newRow}, Col: ${event.newCol}`;
    }

    // Add action details
    if (event.actionType === ActionType.Shoot) {
      if (event.targetShipId === 0n) {
        description += moved ? " and fired AOE" : `${shipName} fired AOE`;
      } else {
        const targetShip = shipMap.get(event.targetShipId);
        const targetName = targetShip?.name || `Ship #${event.targetShipId}`;
        description += moved
          ? ` and fired on ${targetName}`
          : `${shipName} fired on ${targetName}`;
      }
    } else if (event.actionType === ActionType.Special) {
      if (event.targetShipId === 0n) {
        description += moved
          ? " and used special ability (AOE)"
          : `${shipName} used special ability (AOE)`;
      } else {
        const targetShip = shipMap.get(event.targetShipId);
        const targetName = targetShip?.name || `Ship #${event.targetShipId}`;
        description += moved
          ? ` and used special ability on ${targetName}`
          : `${shipName} used special ability on ${targetName}`;
      }
    } else if (event.actionType === ActionType.Pass) {
      description = moved ? `${description} and passed` : `${shipName} passed`;
    } else if (event.actionType === ActionType.Retreat) {
      description += moved ? " and retreated" : `${shipName} retreated`;
    } else if (event.actionType === ActionType.Assist) {
      description += moved ? " and assisted" : `${shipName} assisted`;
    } else if (event.actionType === ActionType.ClaimPoints) {
      description += moved
        ? " and claimed points"
        : `${shipName} claimed points`;
    }

    return description;
  };

  if (isLoadingHistory) {
    return (
      <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
        <h3 className="text-lg font-bold text-purple-400 mb-2">
          📋 Game Events
        </h3>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
          <p className="text-gray-400 text-sm">Loading game events...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
        <h3 className="text-lg font-bold text-purple-400 mb-2">
          📋 Game Events
        </h3>
        <p className="text-gray-400 text-sm">
          No events yet. Actions will appear here as they happen.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-purple-400">
          📋 Game Events ({events.length})
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div
        className={`space-y-2 ${isExpanded ? "" : "max-h-32 overflow-hidden"}`}
      >
        {events.map((event) => {
          const ship = shipMap.get(event.shipId);
          const isMyShip = ship && ship.owner === address;
          const isRecent = Date.now() - event.timestamp < 10000; // Highlight events from last 10 seconds

          return (
            <div
              key={event.id}
              className={`p-2 rounded text-sm transition-all ${
                isRecent
                  ? "bg-purple-500/20 border border-purple-400/50"
                  : "bg-gray-800/30"
              } ${
                isMyShip
                  ? "border-l-2 border-l-green-400"
                  : "border-l-2 border-l-red-400"
              }`}
            >
              <div className="flex items-center">
                <span className="text-gray-200">
                  {formatEventDescription(event)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!isExpanded && events.length > 3 && (
        <div className="mt-2 text-center">
          <span className="text-gray-400 text-xs">
            Showing latest 3 events. Click &ldquo;Expand&rdquo; to see all{" "}
            {events.length} events.
          </span>
        </div>
      )}
    </div>
  );
}
