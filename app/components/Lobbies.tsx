"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useLobbies } from "../hooks/useLobbies";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { LobbyStatus } from "../types/types";
import { ShipImage } from "./ShipImage";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
// Removed TransactionButton import - using simple buttons instead

const Lobbies: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const {
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,
    createLobby,
    joinLobby,
    // leaveLobby,
    // timeoutJoiner,
    createFleet,
    // quitWithPenalty,
    loadLobbies,
  } = useLobbies();

  const { ships, isLoading: shipsLoading } = useOwnedShips();

  // Check if wallet is connecting
  const isConnecting = status === "connecting" || status === "reconnecting";

  // Calculate player state from lobby list instead of blockchain
  const playerLobbies = lobbyList.lobbies.filter(
    (lobby) =>
      lobby.basic.creator === address || lobby.players.joiner === address
  );
  const activeLobbiesCount = playerLobbies.length;
  const hasActiveLobby = activeLobbiesCount > 0;

  // Calculate lobby creation permissions
  const canCreateLobby = !paused && isConnected;
  const needsPaymentForLobby =
    activeLobbiesCount >= Number(freeGamesPerAddress || 0n);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<bigint | null>(null);
  const [selectedShips, setSelectedShips] = useState<bigint[]>([]);

  // Fleet selection filters
  const [fleetFilters, setFleetFilters] = useState({
    showShiny: true,
    showCommon: true,
    minCost: 0,
    maxCost: 10000,
    minAccuracy: 0,
    maxAccuracy: 2,
    minHull: 0,
    maxHull: 2,
    minSpeed: 0,
    maxSpeed: 2,
    weaponType: "all",
    defenseType: "all",
    specialType: "all",
  });

  const [dragging, setDragging] = useState<{
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed"
      | null;
    startX: number;
    startValue: number;
    container: HTMLElement | null;
  }>({ type: null, startX: 0, startValue: 0, container: null });

  const handleThumbMouseDown = (
    e: React.MouseEvent,
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed"
  ) => {
    e.preventDefault();
    const container = (e.target as HTMLElement).closest(
      ".range-slider-container"
    ) as HTMLElement;
    if (!container) return;

    const currentValue = fleetFilters[type];
    setDragging({
      type,
      startX: e.clientX,
      startValue: currentValue,
      container, // Store the specific container
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.type || !dragging.container) return;

      const rect = dragging.container.getBoundingClientRect();
      const containerWidth = rect.width - 20; // Account for 10px padding on each side
      const halfThumbWidth = 9; // Account for half thumb width
      const availableWidth = containerWidth - halfThumbWidth;
      const relativeX = e.clientX - rect.left - 10; // Account for padding
      const percentage = Math.max(0, Math.min(1, relativeX / availableWidth));
      const newValue = Math.round(percentage * 2); // 0, 1, or 2

      // Clamp the value to valid range (0, 1, 2)
      const clampedValue = Math.max(0, Math.min(2, newValue));

      if (dragging.type.includes("min")) {
        const maxType = dragging.type.replace(
          "min",
          "max"
        ) as keyof typeof fleetFilters;
        const maxValue = fleetFilters[maxType] as number;
        if (clampedValue <= maxValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      } else {
        const minType = dragging.type.replace(
          "max",
          "min"
        ) as keyof typeof fleetFilters;
        const minValue = fleetFilters[minType] as number;
        if (clampedValue >= minValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      }
    },
    [dragging.type, dragging.container, fleetFilters]
  );

  const handleMouseUp = () => {
    setDragging({ type: null, startX: 0, startValue: 0, container: null });
  };

  useEffect(() => {
    if (dragging.type) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  // Filter panel state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter ships based on current filters
  const filteredShips = ships.filter((ship) => {
    // Always show selected ships regardless of filters
    if (selectedShips.includes(ship.id)) return true;

    const cost = Number(ship.shipData.cost);
    const isShiny = ship.shipData.shiny;
    const accuracy = ship.traits.accuracy;
    const hull = ship.traits.hull;
    const speed = ship.traits.speed;

    // Rarity filters
    if (isShiny && !fleetFilters.showShiny) return false;
    if (!isShiny && !fleetFilters.showCommon) return false;

    // Cost filters
    if (cost < fleetFilters.minCost || cost > fleetFilters.maxCost)
      return false;

    // Trait filters
    if (
      accuracy < fleetFilters.minAccuracy ||
      accuracy > fleetFilters.maxAccuracy
    )
      return false;
    if (hull < fleetFilters.minHull || hull > fleetFilters.maxHull)
      return false;
    if (speed < fleetFilters.minSpeed || speed > fleetFilters.maxSpeed)
      return false;

    // Equipment filters
    if (fleetFilters.weaponType !== "all") {
      const weaponName = getMainWeaponName(
        ship.equipment.mainWeapon
      ).toLowerCase();
      if (!weaponName.includes(fleetFilters.weaponType.toLowerCase()))
        return false;
    }

    if (fleetFilters.defenseType !== "all") {
      const hasShield = ship.equipment.shields > 0;
      if (fleetFilters.defenseType === "shield" && !hasShield) return false;
      if (fleetFilters.defenseType === "armor" && hasShield) return false;
    }

    if (fleetFilters.specialType !== "all") {
      const specialName = getSpecialName(ship.equipment.special).toLowerCase();
      if (fleetFilters.specialType === "none" && specialName !== "none")
        return false;
      if (
        fleetFilters.specialType !== "none" &&
        !specialName.includes(fleetFilters.specialType.toLowerCase())
      )
        return false;
    }

    return true;
  });

  // Create lobby form state
  const [createForm, setCreateForm] = useState({
    costLimit: "1000", // Fixed cost limit
    turnTime: "300", // 5 minutes
    selectedMapId: "1",
    maxScore: "100",
  });

  const handleCreateLobby = async () => {
    if (!isConnected) return;

    // Validate inputs
    const turnTime = parseInt(createForm.turnTime);
    const mapId = parseInt(createForm.selectedMapId);
    const maxScore = parseInt(createForm.maxScore);

    if (turnTime < 60 || turnTime > 86400) {
      alert("Turn time must be between 60 and 86400 seconds");
      return;
    }
    if (mapId <= 0) {
      alert("Map ID must be greater than 0");
      return;
    }
    if (maxScore <= 0) {
      alert("Max score must be greater than 0");
      return;
    }

    try {
      await createLobby({
        costLimit: BigInt(parseInt(createForm.costLimit)), // Not in FLOW, just a number
        turnTime: BigInt(turnTime),
        creatorGoesFirst: false, // This will be set by who creates fleet first
        selectedMapId: BigInt(mapId),
        maxScore: BigInt(maxScore),
        activeLobbiesCount: activeLobbiesCount, // Pass the calculated active lobbies count
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create lobby:", error);
    }
  };

  const handleJoinLobby = async (lobbyId: bigint) => {
    if (!isConnected) return;

    try {
      await joinLobby(lobbyId);
    } catch (error) {
      console.error("Failed to join lobby:", error);
    }
  };

  // const handleLeaveLobby = async (lobbyId: bigint) => {
  //   if (!isConnected) return;

  //   try {
  //     await leaveLobby(lobbyId);
  //   } catch (error) {
  //     console.error("Failed to leave lobby:", error);
  //   }
  // };

  const handleCreateFleet = async (lobbyId: bigint) => {
    if (!isConnected || selectedShips.length === 0) return;

    try {
      await createFleet(lobbyId, selectedShips);
      setSelectedShips([]);
      setSelectedLobby(null);
    } catch (error) {
      console.error("Failed to create fleet:", error);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // LobbyStatus.Open
        return "text-green-400";
      case 1: // LobbyStatus.FleetSelection
        return "text-yellow-400";
      case 2: // LobbyStatus.InGame
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: // LobbyStatus.Open
        return "OPEN";
      case 1: // LobbyStatus.FleetSelection
        return "FLEET SELECTION";
      case 2: // LobbyStatus.InGame
        return "IN GAME";
      default:
        return "UNKNOWN";
    }
  };

  if (!isConnected) {
    return (
      <div className="text-cyan-300 font-mono">
        <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
          [LOBBIES]
        </h3>
        <div className="text-center text-red-400">
          Please connect your wallet to access lobbies
        </div>
      </div>
    );
  }

  // Show loading state while wallet is connecting
  if (isConnecting) {
    return (
      <div className="text-center text-cyan-400 font-mono">
        <div className="text-xl mb-4">Connecting to wallet...</div>
        <div className="text-sm text-cyan-400/60">
          Please wait while we establish your connection
        </div>
      </div>
    );
  }

  return (
    <div className="text-cyan-300 font-mono">
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-webkit-slider-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-moz-range-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-webkit-slider-runnable-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .range-slider-container {
          position: relative;
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 10px;
        }
        .range-slider-track {
          position: absolute;
          top: 50%;
          left: 10px;
          right: 10px;
          height: 6px;
          background: #374151;
          border-radius: 3px;
          transform: translateY(-50%);
        }
        .range-slider-fill {
          position: absolute;
          top: 50%;
          left: 10px;
          height: 6px;
          background: linear-gradient(to right, #06b6d4, #0891b2);
          border-radius: 3px;
          transform: translateY(-50%);
          transition: all 0.2s ease;
        }
        .range-slider-thumb {
          position: absolute;
          top: 50%;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border: 3px solid #000;
          border-radius: 50%;
          cursor: pointer;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
          z-index: 10;
        }
        .range-slider-thumb:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.6);
        }
        .range-slider-thumb:active {
          transform: translate(-50%, -50%) scale(1.05);
        }
      `}</style>
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [LOBBIES]
      </h3>

      {/* Player Status */}
      {playerState && (
        <div className="mb-6 p-4 border border-cyan-400 bg-black/40 rounded-lg">
          <h4 className="text-lg font-bold text-cyan-400 mb-2">
            PLAYER STATUS
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Active Lobbies:</span>
              <span className="ml-2">{activeLobbiesCount.toString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Has Active Lobby:</span>
              <span
                className={`ml-2 ${
                  hasActiveLobby ? "text-green-400" : "text-red-400"
                }`}
              >
                {hasActiveLobby ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Kick Count:</span>
              <span className="ml-2">
                {playerState?.kickCount?.toString() || "0"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Free Games:</span>
              <span className="ml-2">
                {freeGamesPerAddress?.toString() || "0"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create Lobby Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!canCreateLobby || !!paused}
          className="w-full px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paused ? "LOBBIES PAUSED" : "CREATE LOBBY"}
        </button>
        {needsPaymentForLobby && (
          <p className="text-sm text-yellow-400 mt-2 text-center">
            Additional lobby fee:{" "}
            {additionalLobbyFee
              ? formatEther(additionalLobbyFee as bigint)
              : "0"}{" "}
            FLOW
          </p>
        )}
      </div>

      {/* Create Lobby Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-purple-400 bg-black/40 rounded-lg">
          <h4 className="text-lg font-bold text-purple-400 mb-4">
            CREATE LOBBY
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Fleet Cost Limit
              </label>
              <input
                type="number"
                value={createForm.costLimit}
                disabled
                className="w-full px-3 py-2 bg-black/60 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum total cost for each player&apos;s fleet (fixed at 1000)
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Turn Time (seconds)
              </label>
              <input
                type="number"
                value={createForm.turnTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (parseInt(value) >= 60 && parseInt(value) <= 86400)
                  ) {
                    setCreateForm((prev) => ({
                      ...prev,
                      turnTime: value,
                    }));
                  }
                }}
                className="w-full px-3 py-2 bg-black/60 border border-cyan-400 rounded text-cyan-300"
                placeholder="300"
                min="60"
                max="86400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Map ID</label>
              <input
                type="number"
                value={createForm.selectedMapId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || parseInt(value) > 0) {
                    setCreateForm((prev) => ({
                      ...prev,
                      selectedMapId: value,
                    }));
                  }
                }}
                className="w-full px-3 py-2 bg-black/60 border border-cyan-400 rounded text-cyan-300"
                placeholder="1"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Score
              </label>
              <input
                type="number"
                value={createForm.maxScore}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || parseInt(value) > 0) {
                    setCreateForm((prev) => ({
                      ...prev,
                      maxScore: value,
                    }));
                  }
                }}
                className="w-full px-3 py-2 bg-black/60 border border-cyan-400 rounded text-cyan-300"
                placeholder="100"
                min="1"
              />
            </div>
            <div className="p-3 bg-gray-800/50 rounded border border-gray-600">
              <p className="text-sm text-gray-300">
                <span className="text-yellow-400">⚡ Turn Order:</span> The
                player who creates their fleet first will go first in the game.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateLobby}
                className="flex-1 px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200"
              >
                CREATE
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-red-400 text-red-400 rounded hover:bg-red-400/20"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lobby List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-bold text-cyan-400">AVAILABLE LOBBIES</h4>
          <button
            onClick={() => loadLobbies()}
            className="px-3 py-1 text-xs border border-cyan-400 text-cyan-400 rounded hover:bg-cyan-400/10"
          >
            REFRESH
          </button>
        </div>
        {lobbyList.isLoading ? (
          <div className="text-center text-gray-400">Loading lobbies...</div>
        ) : lobbyList.error ? (
          <div className="text-center text-red-400">
            Error: {lobbyList.error}
          </div>
        ) : lobbyList.lobbies.length === 0 ? (
          <div className="text-center text-gray-400">
            No lobbies available. Create one to get started!
            {lobbyCount && typeof lobbyCount === "bigint" && lobbyCount > 0n ? (
              <div className="mt-2 text-sm">
                Total lobbies in system: {lobbyCount.toString()}
              </div>
            ) : null}
          </div>
        ) : (
          lobbyList.lobbies.map((lobby) => (
            <div
              key={lobby.basic.id.toString()}
              className={`border rounded-lg p-4 ${
                address &&
                lobby.basic.creator.toLowerCase() === address.toLowerCase()
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-cyan-400 bg-black/40"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-lg font-bold">
                      Lobby #{lobby.basic.id.toString()}
                    </h5>
                    {address &&
                      lobby.basic.creator.toLowerCase() ===
                        address.toLowerCase() && (
                        <span className="px-2 py-1 text-xs bg-yellow-400/20 text-yellow-400 rounded">
                          YOUR LOBBY
                        </span>
                      )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Creator: {lobby.basic.creator.slice(0, 6)}...
                    {lobby.basic.creator.slice(-4)}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(
                    lobby.state.status
                  )}`}
                >
                  {getStatusText(lobby.state.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-400">Fleet Cost Limit:</span>
                  <span className="ml-2">
                    {lobby.basic.costLimit.toString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Turn Time:</span>
                  <span className="ml-2">
                    {lobby.gameConfig.turnTime.toString()}s
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Map ID:</span>
                  <span className="ml-2">
                    {lobby.gameConfig.selectedMapId.toString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Max Score:</span>
                  <span className="ml-2">
                    {lobby.gameConfig.maxScore.toString()}
                  </span>
                </div>
              </div>

              {lobby.state.status === LobbyStatus.Open &&
                lobby.basic.creator !== address &&
                lobby.players.joiner !== address && (
                  <button
                    onClick={() => handleJoinLobby(lobby.basic.id)}
                    className="w-full px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                  >
                    JOIN LOBBY
                  </button>
                )}

              {/* Show fleet selection for creator if they haven't selected a fleet yet */}
              {lobby.basic.creator === address &&
                lobby.players.creatorFleetId === 0n && (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-400">Select your fleet</p>
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      className="w-full px-6 py-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                    >
                      SELECT FLEET
                    </button>
                  </div>
                )}

              {/* Show fleet selection for joiner if they haven't selected a fleet yet */}
              {lobby.players.joiner === address &&
                lobby.players.joinerFleetId === 0n && (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-400">Select your fleet</p>
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      className="w-full px-6 py-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                    >
                      SELECT FLEET
                    </button>
                  </div>
                )}

              {/* Show fleet selection phase message when both players are in lobby but haven't both selected fleets */}
              {lobby.state.status === LobbyStatus.FleetSelection &&
                lobby.players.joiner !==
                  "0x0000000000000000000000000000000000000000" &&
                (lobby.players.creatorFleetId === 0n ||
                  lobby.players.joinerFleetId === 0n) && (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-400">
                      Fleet selection phase - waiting for both players to select
                      fleets
                    </p>
                  </div>
                )}

              {lobby.state.status === LobbyStatus.InGame && (
                <div className="text-sm text-red-400">Game in progress</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Fleet Selection Modal */}
      {selectedLobby &&
        (() => {
          const currentLobby = lobbyList.lobbies.find(
            (lobby) => lobby.basic.id === selectedLobby
          );
          const totalCost = selectedShips.reduce((sum, shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            return sum + (ship ? Number(ship.shipData.cost) : 0);
          }, 0);
          const costLimit = currentLobby
            ? Number(currentLobby.basic.costLimit)
            : 1000;
          const isOverLimit = totalCost > costLimit;

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-black border border-cyan-400 rounded-lg p-6 max-w-6xl w-full mx-4 h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-cyan-400">
                    SELECT FLEET
                  </h4>
                  <div
                    className={`text-lg font-bold px-3 py-1 rounded ${
                      isOverLimit
                        ? "text-red-400 bg-red-400/20 border border-red-400/30"
                        : "text-green-400 bg-green-400/20 border border-green-400/30"
                    }`}
                  >
                    {totalCost}/{costLimit}
                  </div>
                </div>
                <p className="text-sm text-yellow-400 mb-4">
                  ⚡ Creating your fleet first will make you go first in the
                  game!
                </p>

                {/* Filter Controls */}
                <div className="mb-4 p-4 bg-black/40 border border-gray-600 rounded-lg">
                  <button
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="flex items-center justify-between w-full text-sm font-bold text-cyan-400 mb-3 hover:text-cyan-300 transition-colors"
                  >
                    <span>FILTERS</span>
                    <span
                      className={`transform transition-transform duration-200 ${
                        filtersExpanded ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {filtersExpanded && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        {/* Rarity Filters */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Rarity
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showCommon}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showCommon: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-gray-400">Common</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showShiny}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showShiny: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-yellow-400">Shiny ✨</span>
                            </label>
                          </div>
                        </div>

                        {/* Cost Range */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Cost Range
                          </label>
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="Min"
                              value={fleetFilters.minCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  minCost: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={fleetFilters.maxCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  maxCost: parseInt(e.target.value) || 10000,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            />
                          </div>
                        </div>

                        {/* Equipment Filters */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Equipment
                          </label>
                          <div className="space-y-1">
                            <select
                              value={fleetFilters.weaponType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  weaponType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            >
                              <option value="all">All Weapons</option>
                              <option value="laser">Laser</option>
                              <option value="cannon">Cannon</option>
                              <option value="plasma">Plasma</option>
                              <option value="missile">Missile</option>
                            </select>
                            <select
                              value={fleetFilters.defenseType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  defenseType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            >
                              <option value="all">All Defense</option>
                              <option value="shield">Shields</option>
                              <option value="armor">Armor</option>
                            </select>
                          </div>
                        </div>

                        {/* Trait Filters */}
                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Accuracy: {fleetFilters.minAccuracy} -{" "}
                            {fleetFilters.maxAccuracy}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxAccuracy -
                                    fleetFilters.minAccuracy) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minAccuracy")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxAccuracy")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Poor (0)</span>
                            <span className="font-medium">Average (1)</span>
                            <span className="font-medium">Excellent (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Hull: {fleetFilters.minHull} -{" "}
                            {fleetFilters.maxHull}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxHull -
                                    fleetFilters.minHull) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minHull")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxHull")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Weak (0)</span>
                            <span className="font-medium">Standard (1)</span>
                            <span className="font-medium">Reinforced (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Speed: {fleetFilters.minSpeed} -{" "}
                            {fleetFilters.maxSpeed}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxSpeed -
                                    fleetFilters.minSpeed) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minSpeed")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxSpeed")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Slow (0)</span>
                            <span className="font-medium">Normal (1)</span>
                            <span className="font-medium">Fast (2)</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-xs">
                        <span className="text-gray-400">
                          Showing {filteredShips.length} of {ships.length} ships
                        </span>
                        <button
                          onClick={() =>
                            setFleetFilters({
                              showShiny: true,
                              showCommon: true,
                              minCost: 0,
                              maxCost: 10000,
                              minAccuracy: 0,
                              maxAccuracy: 2,
                              minHull: 0,
                              maxHull: 2,
                              minSpeed: 0,
                              maxSpeed: 2,
                              weaponType: "all",
                              defenseType: "all",
                              specialType: "all",
                            })
                          }
                          className="text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {shipsLoading ? (
                  <div className="text-center text-gray-400 flex-1 flex items-center justify-center">
                    Loading ships...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 flex-1 overflow-y-auto content-start">
                    {filteredShips
                      .sort((a, b) => {
                        // Selected ships first
                        const aSelected = selectedShips.includes(a.id);
                        const bSelected = selectedShips.includes(b.id);

                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;

                        // Within each group, sort by ship ID
                        return Number(a.id - b.id);
                      })
                      .map((ship) => (
                        <div
                          key={ship.id.toString()}
                          className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 self-start ${
                            selectedShips.includes(ship.id)
                              ? "border-green-400 bg-green-400/20"
                              : ship.shipData.timestampDestroyed > 0n
                              ? "border-red-400 bg-black/60 opacity-50 cursor-not-allowed"
                              : ship.shipData.constructed
                              ? "border-gray-400 bg-black/40 hover:border-cyan-400 hover:bg-cyan-400/10"
                              : "border-gray-400 bg-black/60 opacity-50 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            // Don't allow selection of destroyed or unconstructed ships
                            if (
                              ship.shipData.timestampDestroyed > 0n ||
                              !ship.shipData.constructed
                            ) {
                              return;
                            }

                            if (selectedShips.includes(ship.id)) {
                              setSelectedShips((prev) =>
                                prev.filter((id) => id !== ship.id)
                              );
                            } else {
                              setSelectedShips((prev) => [...prev, ship.id]);
                            }
                          }}
                        >
                          {/* Ship Image */}
                          <div className="mb-3">
                            <ShipImage
                              key={`${ship.id.toString()}-${
                                ship.shipData.constructed
                                  ? "constructed"
                                  : "unconstructed"
                              }`}
                              ship={ship}
                              className="w-full h-32 rounded border border-gray-600"
                              showLoadingState={true}
                            />
                          </div>

                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm">
                                {ship.name || `Ship #${ship.id}`}
                              </h5>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                ship.shipData.shiny
                                  ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                                  : "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                              }`}
                            >
                              {ship.shipData.shiny ? "SHINY ✨" : "COMMON"}
                            </span>
                          </div>

                          {/* Ship Stats */}
                          {ship.shipData.constructed ? (
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="opacity-60">Acc:</span>
                                <span className="ml-2">
                                  {ship.traits.accuracy}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Hull:</span>
                                <span className="ml-2">{ship.traits.hull}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Speed:</span>
                                <span className="ml-2">
                                  {ship.traits.speed}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Cost:</span>
                                <span className="ml-2">
                                  {ship.shipData.cost}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Wpn:</span>
                                <span className="ml-2">
                                  {getMainWeaponName(ship.equipment.mainWeapon)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">
                                  {ship.equipment.shields > 0 ? "Shd:" : "Arm:"}
                                </span>
                                <span className="ml-2">
                                  {ship.equipment.shields > 0
                                    ? getShieldName(ship.equipment.shields)
                                    : getArmorName(ship.equipment.armor)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Spc:</span>
                                <span className="ml-2">
                                  {getSpecialName(ship.equipment.special)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="opacity-60">Status:</span>
                                <span className="ml-2 text-green-400">
                                  READY
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-yellow-400 text-sm">
                              {ship.shipData.timestampDestroyed > 0n
                                ? "DESTROYED"
                                : "UNDER CONSTRUCTION"}
                            </div>
                          )}

                          {/* Selection Indicator */}
                          {selectedShips.includes(ship.id) && (
                            <div className="mt-2 text-center">
                              <span className="text-green-400 text-sm font-bold">
                                ✓ SELECTED
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4 flex-shrink-0">
                  <button
                    onClick={() => handleCreateFleet(selectedLobby)}
                    disabled={selectedShips.length === 0}
                    className="flex-1 px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    CREATE FLEET ({selectedShips.length} ships)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLobby(null);
                      setSelectedShips([]);
                      setFiltersExpanded(false);
                      setFleetFilters({
                        showShiny: true,
                        showCommon: true,
                        minCost: 0,
                        maxCost: 10000,
                        minAccuracy: 0,
                        maxAccuracy: 2,
                        minHull: 0,
                        maxHull: 2,
                        minSpeed: 0,
                        maxSpeed: 2,
                        weaponType: "all",
                        defenseType: "all",
                        specialType: "all",
                      });
                    }}
                    className="px-4 py-2 border border-red-400 text-red-400 rounded hover:bg-red-400/20"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default Lobbies;
