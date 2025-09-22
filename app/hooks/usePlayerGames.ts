import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetGamesForPlayer } from "./useGameContract";
import { GameDataView } from "../types/types";

export function usePlayerGames() {
  const { address } = useAccount();
  const [games, setGames] = useState<GameDataView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single call: Get all games for the player
  const {
    data: gamesData,
    isLoading: isLoadingGames,
    error: gamesError,
    refetch: refetchGames,
  } = useGetGamesForPlayer(address || "0x0");

  // Process the game data when it changes
  useEffect(() => {
    setIsLoading(isLoadingGames);
    setError(gamesError?.message || null);

    if (!gamesData || !Array.isArray(gamesData)) {
      setGames([]);
      return;
    }

    const fetchedGames: GameDataView[] = [];

    // Process all games
    gamesData.forEach((gameData, index) => {
      if (gameData && typeof gameData === "object") {
        try {
          // The contract returns GameDataView structs directly
          const game = gameData as GameDataView;
          fetchedGames.push(game);
        } catch (err) {
          console.error(`Error converting game at index ${index}:`, err);
        }
      }
    });

    setGames(fetchedGames);
  }, [gamesData, isLoadingGames, gamesError, address]);

  return {
    games,
    isLoading,
    error,
    refetch: refetchGames,
  };
}
