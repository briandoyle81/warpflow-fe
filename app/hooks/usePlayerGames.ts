import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetGamesForPlayer } from "./useGameContract";
import { Game } from "../types/types";

export function usePlayerGames() {
  const { address } = useAccount();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single call: Get all games for the player
  const {
    data: gamesData,
    isLoading: isLoadingGames,
    error: gamesError,
  } = useGetGamesForPlayer(address || "0x0");

  // Process the game data when it changes
  useEffect(() => {
    console.log("=== Player Games Debug ===");
    console.log("Address:", address);
    console.log("Games data:", gamesData);
    console.log("Loading Games:", isLoadingGames);
    console.log("Games Error:", gamesError);

    setIsLoading(isLoadingGames);
    setError(gamesError?.message || null);

    if (!gamesData || !Array.isArray(gamesData)) {
      console.log("No games data or not array, setting empty array");
      setGames([]);
      return;
    }

    const fetchedGames: Game[] = [];

    // Process all games
    gamesData.forEach((gameData, index) => {
      if (gameData && typeof gameData === "object") {
        try {
          // The contract returns GameDataView structs directly
          const game = gameData as Game;
          fetchedGames.push(game);
          console.log(`Successfully converted game ${index}:`, game);
        } catch (err) {
          console.error(`Error converting game at index ${index}:`, err);
        }
      } else {
        console.log(`Invalid game data at index ${index}:`, gameData);
      }
    });

    console.log("Final fetched games:", fetchedGames);
    setGames(fetchedGames);
  }, [gamesData, isLoadingGames, gamesError, address]);

  return {
    games,
    isLoading,
    error,
  };
}
