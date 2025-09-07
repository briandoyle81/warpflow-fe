"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useLobbies } from "../hooks/useLobbies";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { LobbyStatus } from "../types/types";
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

              {lobby.state.status === LobbyStatus.FleetSelection && (
                <div className="space-y-2">
                  <p className="text-sm text-yellow-400">
                    Fleet selection phase
                  </p>
                  <button
                    onClick={() => setSelectedLobby(lobby.basic.id)}
                    className="w-full px-6 py-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                  >
                    SELECT FLEET
                  </button>
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
      {selectedLobby && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-cyan-400 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h4 className="text-lg font-bold text-cyan-400 mb-2">
              SELECT FLEET
            </h4>
            <p className="text-sm text-yellow-400 mb-4">
              ⚡ Creating your fleet first will make you go first in the game!
            </p>

            {shipsLoading ? (
              <div className="text-center text-gray-400">Loading ships...</div>
            ) : (
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {ships.map((ship) => (
                  <div
                    key={ship.id.toString()}
                    className={`p-2 border rounded cursor-pointer ${
                      selectedShips.includes(ship.id)
                        ? "border-green-400 bg-green-400/20"
                        : "border-gray-400 hover:border-cyan-400"
                    }`}
                    onClick={() => {
                      if (selectedShips.includes(ship.id)) {
                        setSelectedShips((prev) =>
                          prev.filter((id) => id !== ship.id)
                        );
                      } else {
                        setSelectedShips((prev) => [...prev, ship.id]);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{ship.name}</span>
                      <span className="text-xs text-gray-400">
                        Cost: {ship.shipData.cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
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
                }}
                className="px-4 py-2 border border-red-400 text-red-400 rounded hover:bg-red-400/20"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobbies;
