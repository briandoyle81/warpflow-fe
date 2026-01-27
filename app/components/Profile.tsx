"use client";

import React, { useMemo } from "react";
import { useAccount } from "wagmi";
import { usePlayerGames } from "../hooks/usePlayerGames";

const Profile: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { games, isLoading } = usePlayerGames();

  // Calculate statistics from finished games
  const stats = useMemo(() => {
    if (!address || !games.length) {
      return { wins: 0, losses: 0, inProgress: 0, winRate: 0 };
    }

    const finishedGames = games.filter(
      (game) =>
        game.metadata.winner !==
        "0x0000000000000000000000000000000000000000"
    );

    const wins = finishedGames.filter(
      (game) => game.metadata.winner.toLowerCase() === address.toLowerCase()
    ).length;

    const losses = finishedGames.length - wins;
    const inProgress = games.length - finishedGames.length;
    const winRate =
      finishedGames.length > 0
        ? Math.round((wins / finishedGames.length) * 100)
        : 0;

    return { wins, losses, inProgress, winRate };
  }, [games, address]);

  // Sort games: finished first (by startedAt desc), then in progress
  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const aFinished =
        a.metadata.winner !== "0x0000000000000000000000000000000000000000";
      const bFinished =
        b.metadata.winner !== "0x0000000000000000000000000000000000000000";

      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // Both same status, sort by startedAt descending
      return Number(b.metadata.startedAt) - Number(a.metadata.startedAt);
    });
  }, [games]);

  const getGameOutcome = (game: typeof games[0]) => {
    if (
      game.metadata.winner === "0x0000000000000000000000000000000000000000"
    ) {
      return { text: "IN PROGRESS", color: "text-yellow-400" };
    }
    if (address && game.metadata.winner.toLowerCase() === address.toLowerCase()) {
      return { text: "VICTORY", color: "text-green-400" };
    }
    return { text: "DEFEAT", color: "text-red-400" };
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [PROFILE]
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div
          className="border border-cyan-400 bg-black/40 p-4"
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          <h4 className="text-lg font-bold text-cyan-400 mb-2">
            📊 STATISTICS
          </h4>
          {isConnected ? (
            <div className="space-y-1 text-sm">
              <p className="opacity-80">
                Wins: <span className="text-green-400 font-bold">{stats.wins}</span>
              </p>
              <p className="opacity-80">
                Losses: <span className="text-red-400 font-bold">{stats.losses}</span>
              </p>
              <p className="opacity-80">
                Win Rate: <span className="font-bold">{stats.winRate}%</span>
              </p>
              {stats.inProgress > 0 && (
                <p className="opacity-80">
                  In Progress: <span className="text-yellow-400 font-bold">{stats.inProgress}</span>
                </p>
              )}
              <p className="opacity-60 text-xs mt-2">
                Total Games: {games.length}
              </p>
            </div>
          ) : (
            <p className="text-sm opacity-80">
              Connect wallet to view statistics
            </p>
          )}
        </div>
        <div
          className="border border-purple-400 bg-black/40 p-4"
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          <h4 className="text-lg font-bold text-purple-400 mb-2">
            🏅 ACHIEVEMENTS
          </h4>
          <p className="text-sm opacity-80">No achievements unlocked yet</p>
        </div>
      </div>

      {/* Game History */}
      {isConnected && (
        <div
          className="border border-cyan-400 bg-black/40 p-4"
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          <h4 className="text-lg font-bold text-cyan-400 mb-4">
            🎮 GAME HISTORY
          </h4>
          {isLoading ? (
            <p className="text-sm opacity-80">Loading games...</p>
          ) : sortedGames.length === 0 ? (
            <p className="text-sm opacity-80">No games found</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedGames.map((game) => {
                const outcome = getGameOutcome(game);
                return (
                  <div
                    key={game.metadata.gameId.toString()}
                    className="border border-gray-600 bg-black/20 p-2 text-xs"
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">
                          Game #{game.metadata.gameId.toString()}
                        </span>
                        <span className={`font-bold ${outcome.color}`}>
                          [{outcome.text}]
                        </span>
                      </div>
                      <span className="opacity-60">
                        {formatDate(game.metadata.startedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
