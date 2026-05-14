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
      return { text: "IN PROGRESS", color: "text-amber" };
    }
    if (address && game.metadata.winner.toLowerCase() === address.toLowerCase()) {
      return { text: "VICTORY", color: "text-phosphor-green" };
    }
    return { text: "DEFEAT", color: "text-warning-red" };
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
    <div className="text-cyan font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [PROFILE]
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div
          className="corner-bracket border bg-black/40 p-4"
          style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-cyan mb-2 tracking-widest">
            [STATISTICS]
          </h4>
          {isConnected ? (
            <div className="space-y-0 mt-2">
              <div className="data-readout">
                <span className="data-readout-label">Wins</span>
                <span className="font-bold text-phosphor-green font-mono text-xs">{stats.wins}</span>
              </div>
              <div className="data-readout">
                <span className="data-readout-label">Losses</span>
                <span className="font-bold text-warning-red font-mono text-xs">{stats.losses}</span>
              </div>
              <div className="data-readout">
                <span className="data-readout-label">Win Rate</span>
                <span className="font-bold font-mono text-xs">{stats.winRate}%</span>
              </div>
              {stats.inProgress > 0 && (
                <div className="data-readout">
                  <span className="data-readout-label">In Progress</span>
                  <span className="font-bold text-amber font-mono text-xs">{stats.inProgress}</span>
                </div>
              )}
              <div className="data-readout">
                <span className="data-readout-label">Total</span>
                <span className="font-mono text-xs opacity-60">{games.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-mono opacity-80 tracking-wider">
              // Connect wallet to view statistics
            </p>
          )}
        </div>
        <div
          className="corner-bracket corner-bracket-purple border border-purple bg-black/40 p-4"
          style={{ borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-purple mb-2 tracking-widest">
            [ACHIEVEMENTS]
          </h4>
          <p className="text-sm font-mono opacity-60 tracking-wider">// No achievements unlocked</p>
        </div>
      </div>

      {/* Game History */}
      {isConnected && (
        <div
          className="corner-bracket border bg-black/40 p-4"
          style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
        >
          <h4 className="text-lg font-bold text-cyan mb-4 tracking-widest">
            [ENGAGEMENT HISTORY]
          </h4>
          {isLoading ? (
            <p className="text-sm font-mono text-text-muted animate-pulse tracking-widest">&gt;&gt; RETRIEVING RECORDS...</p>
          ) : sortedGames.length === 0 ? (
            <p className="text-sm font-mono text-text-muted">[NO RECORDS FOUND]</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedGames.map((game) => {
                const outcome = getGameOutcome(game);
                return (
                  <div
                    key={game.metadata.gameId.toString()}
                    className="border border-gunmetal bg-black/20 p-2 text-xs"
                    style={{ borderRadius: 0 }}
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
