"use client";

import Header from "../components/Header";
import GameDisplay from "../components/GameDisplay";
import { useGetGame } from "../hooks/useGameContract";
import { GameDataView } from "../types/types";
import { useRouter } from "next/navigation";

interface SpectatorGamePageProps {
  gameId: number | null;
  requestedPathId: string;
}

export default function SpectatorGamePage({
  gameId,
  requestedPathId,
}: SpectatorGamePageProps) {
  const router = useRouter();
  const {
    data: gameData,
    isLoading,
    error,
  } = useGetGame(gameId ?? 0);

  const game = gameData as GameDataView | undefined;
  const hasValidId = gameId !== null;

  return (
    <div
      className="grid grid-rows-[auto_1fr_20px] min-h-screen"
      style={{ backgroundColor: "var(--color-near-black)" }}
    >
      <Header />
      <main className="flex flex-col gap-8 row-start-2 pt-4 pb-20 w-full px-0">
        <div className="w-full px-2 sm:px-4">
          <div
            className="border border-solid p-4"
            style={{
              backgroundColor: "var(--color-slate)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
            }}
          >
            {!hasValidId ? (
              <div className="space-y-4">
                <div className="text-sm" style={{ color: "var(--color-warning-red)" }}>
                  Invalid game URL: {requestedPathId || "(empty)"}.
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  [BACK TO APP]
                </button>
              </div>
            ) : isLoading ? (
              <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Loading game {gameId}...
              </div>
            ) : error || !game ? (
              <div className="space-y-4">
                <div className="text-sm" style={{ color: "var(--color-warning-red)" }}>
                  Unable to load game {gameId}.
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  [BACK TO APP]
                </button>
              </div>
            ) : (
              <GameDisplay
                game={game}
                onBack={() => router.push("/")}
                readOnly={true}
              />
            )}
          </div>
        </div>
      </main>
      <footer
        className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm tracking-wider uppercase"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          color: "var(--color-text-muted)",
        }}
      >
        <span>VOID TACTICS ALPHA</span>
      </footer>
    </div>
  );
}

