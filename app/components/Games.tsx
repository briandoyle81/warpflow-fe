"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { useContractEvents } from "../hooks/useContractEvents";
import GameDisplay from "./GameDisplay";
import { GameDataView } from "../types/types";

const Games: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { games, isLoading, error, refetch } = usePlayerGames();
  const [selectedGame, setSelectedGame] = useState<GameDataView | null>(null);

  // Enable real-time event listening for game updates
  useContractEvents();

  // Persist selected game in localStorage
  useEffect(() => {
    if (selectedGame) {
      localStorage.setItem(
        "selectedGameId",
        selectedGame.metadata.gameId.toString()
      );
    } else {
      localStorage.removeItem("selectedGameId");
    }
  }, [selectedGame]);

  // Restore selected game from localStorage on page load
  useEffect(() => {
    if (games.length > 0 && !selectedGame) {
      const savedGameId = localStorage.getItem("selectedGameId");
      if (savedGameId) {
        const gameToRestore = games.find(
          (game) => game.metadata.gameId.toString() === savedGameId
        );
        if (gameToRestore) {
          console.log(`Restoring game ${savedGameId} from localStorage`);
          setSelectedGame(gameToRestore);
        } else {
          // Game not found, clear the saved ID
          localStorage.removeItem("selectedGameId");
        }
      }
    }
  }, [games, selectedGame]);

  // Clear selected game when user disconnects
  useEffect(() => {
    if (!isConnected) {
      setSelectedGame(null);
      localStorage.removeItem("selectedGameId");
    }
  }, [isConnected]);

  // If a game is selected, show the game display
  if (selectedGame) {
    return (
      <GameDisplay
        game={selectedGame}
        onBack={() => setSelectedGame(null)}
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
                </div>

                {/* Game Actions */}
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <button
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded font-mono hover:bg-blue-700 transition-colors"
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
