"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { useContractEvents } from "../hooks/useContractEvents";
import GameDisplay from "./GameDisplay";
import { GameDataView } from "../types/types";

const Games: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { games, isLoading, error, refetch } = usePlayerGames();
  const [selectedGame, setSelectedGame] = useState<GameDataView | null>(null);

  // Track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  // Ticker to update countdown timers
  const [, setTick] = useState(0);

  // Enable real-time event listening for game updates
  useContractEvents();

  // Update ticker every second to refresh countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate time remaining for a game
  const calculateTimeRemaining = (game: GameDataView): number => {
    const turnTimeSec = Number(game.turnState.turnTime || 0n);
    const turnStartSec = Number(game.turnState.turnStartTime || 0n);
    if (!turnTimeSec || !turnStartSec) return 0;
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, nowSec - turnStartSec);
    return Math.max(0, turnTimeSec - elapsed);
  };

  // Helper function to format seconds as mm:ss
  const formatSeconds = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Persist selectedGame to localStorage
  const storageKey = useMemo(
    () => `selectedGameId-${address || "anonymous"}`,
    [address]
  );

  // Persist view mode (list | detail) to avoid unintended restores
  const viewModeKey = useMemo(
    () => `gamesViewMode-${address || "anonymous"}`,
    [address]
  );

  // Track if we've attempted restoration
  const hasAttemptedRestore = useRef(false);

  // Mark component as mounted after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Restore selectedGame from localStorage once wallet is connected and games are loaded
  // Only restore after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (
      isMounted &&
      typeof window !== "undefined" &&
      isConnected &&
      address &&
      !isLoading &&
      !selectedGame &&
      games.length > 0
    ) {
      // Only restore if the last view mode was 'detail'
      const viewMode = localStorage.getItem(viewModeKey);
      if (viewMode !== "detail") return;

      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const gameId = saved;
          const gameToRestore = games.find(
            (game) => game.metadata.gameId.toString() === gameId
          );
          if (gameToRestore) {
            setSelectedGame(gameToRestore);
          } else if (!hasAttemptedRestore.current) {
            // Game not found, clear the saved ID (only once)
            localStorage.removeItem(storageKey);
            hasAttemptedRestore.current = true;
          }
        } catch (error) {
          console.warn("Failed to restore selectedGame:", error);
          if (!hasAttemptedRestore.current) {
            localStorage.removeItem(storageKey);
            hasAttemptedRestore.current = true;
          }
        }
      }
    }
  }, [
    isMounted,
    games,
    isLoading,
    selectedGame,
    address,
    storageKey,
    viewModeKey,
    isConnected,
  ]);

  // Reset restoration flag when address changes
  useEffect(() => {
    hasAttemptedRestore.current = false;
  }, [address]);

  // Validate restored game - ensure user is still part of it
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      address &&
      selectedGame &&
      games.length > 0
    ) {
      const game = games.find(
        (g) =>
          g.metadata.gameId.toString() ===
          selectedGame.metadata.gameId.toString()
      );
      if (!game) {
        // Game no longer exists, clear it
        setSelectedGame(null);
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedGame, address, storageKey, games]);

  // Track previous selectedGame to detect explicit clears
  const prevSelectedGameRef = useRef<GameDataView | null>(null);

  // Save selectedGame to localStorage when it changes
  // Only save after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && address) {
      if (selectedGame) {
        const gameId = selectedGame.metadata.gameId.toString();
        localStorage.setItem(storageKey, gameId);
        localStorage.setItem(viewModeKey, "detail");
      } else if (prevSelectedGameRef.current) {
        // Only clear if selectedGame was previously set (explicit clear)
        // Don't clear on initial mount when it's null
        localStorage.removeItem(storageKey);
        localStorage.setItem(viewModeKey, "list");
      }
      prevSelectedGameRef.current = selectedGame;
    }
  }, [isMounted, selectedGame, address, storageKey, viewModeKey]);

  // Clear selected game only when address becomes null (explicit disconnect)
  // Don't clear on temporary disconnects during page refresh
  const prevAddressRef = useRef<string | undefined>(address);
  useEffect(() => {
    // If address changes from something to null/undefined, it's an explicit disconnect
    if (prevAddressRef.current && !address) {
      setSelectedGame(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageKey);
      }
    }
    prevAddressRef.current = address;
  }, [address, storageKey]);

  // If a game is selected, show the game display
  if (selectedGame) {
    return (
      <GameDisplay
        game={selectedGame}
        onBack={() => {
          setSelectedGame(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem(storageKey);
            localStorage.setItem(viewModeKey, "list");
          }
        }}
        refetch={refetch}
      />
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-gray-400">
          Please connect your wallet to view your games.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-gray-400">Loading your games...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-mono text-white">Games</h1>
        <p className="text-red-400">Error loading games: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-mono text-white">Games</h1>

      {games.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No games found. Create a lobby and start playing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Total games: {games.length}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div
                key={game.metadata.gameId.toString()}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-mono text-white">
                    Game #{game.metadata.gameId.toString()}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      game.metadata.winner ===
                      "0x0000000000000000000000000000000000000000"
                        ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                        : game.metadata.winner === address
                        ? "bg-green-400/20 text-green-400 border border-green-400/30"
                        : "bg-red-400/20 text-red-400 border border-red-400/30"
                    }`}
                  >
                    {game.metadata.winner ===
                    "0x0000000000000000000000000000000000000000"
                      ? "IN PROGRESS"
                      : game.metadata.winner === address
                      ? "VICTORY"
                      : "DEFEAT"}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span className="opacity-60">Lobby ID:</span>
                    <span>{game.metadata.lobbyId.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Creator:</span>
                    <span className="font-mono text-xs">
                      {game.metadata.creator.slice(0, 6)}...
                      {game.metadata.creator.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Joiner:</span>
                    <span className="font-mono text-xs">
                      {game.metadata.joiner.slice(0, 6)}...
                      {game.metadata.joiner.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Started:</span>
                    <span>
                      {new Date(
                        Number(game.metadata.startedAt) * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Creator Score:</span>
                    <span>{game.creatorScore.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Joiner Score:</span>
                    <span>{game.joinerScore.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Max Score:</span>
                    <span>{game.maxScore.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Current Turn:</span>
                    <span className="font-mono text-xs">
                      {game.turnState.currentTurn === address
                        ? "YOU"
                        : "OPPONENT"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Time Remaining:</span>
                    {(() => {
                      const isFinished =
                        game.metadata.winner !==
                        "0x0000000000000000000000000000000000000000";
                      const remaining = isFinished
                        ? 0
                        : calculateTimeRemaining(game);
                      return (
                        <span
                          className={`font-mono text-xs ${
                            remaining <= 10 ? "text-red-400" : "text-gray-300"
                          }`}
                        >
                          {isFinished ? "--:--" : formatSeconds(remaining)}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Game Actions */}
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <button
                    className="w-full px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                    onClick={() => setSelectedGame(game)}
                  >
                    {game.metadata.winner ===
                    "0x0000000000000000000000000000000000000000"
                      ? "CONTINUE GAME"
                      : "VIEW GAME"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;
