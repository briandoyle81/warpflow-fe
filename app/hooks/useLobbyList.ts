import { useState, useEffect } from "react";
import { useAccount, useBlockNumber } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useLobbiesRead } from "./useLobbiesContract";
import { Lobby } from "../types/types";

export function useLobbyList() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the new single function that returns all lobbies for a player with duplicates
  const lobbiesData = useLobbiesRead("getAllLobbiesForPlayerWithDupes", [
    address || "0x0",
  ]);

  // Invalidate queries when block number changes (Wagmi v2 approach)
  useEffect(() => {
    if (blockNumber) {
      queryClient.invalidateQueries({
        queryKey: lobbiesData.queryKey,
      });
    }
  }, [blockNumber, queryClient, lobbiesData.queryKey]);

  // Set up 5-second interval for additional refresh
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: lobbiesData.queryKey,
      });
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [queryClient, lobbiesData.queryKey, address]);

  // Process the lobby data when it changes
  useEffect(() => {
    if (!lobbiesData.data || !Array.isArray(lobbiesData.data)) {
      setIsLoading(lobbiesData.isLoading);
      setError(lobbiesData.error?.message || null);
      return;
    }

    const fetchedLobbies: Lobby[] = [];
    const seenIds = new Set<string>();

    // Process all lobbies and deduplicate by ID
    lobbiesData.data.forEach((lobbyData, index) => {
      if (
        lobbyData &&
        typeof lobbyData === "object" &&
        lobbyData.basic &&
        lobbyData.basic.id
      ) {
        try {
          // The contract returns Lobby structs directly, not tuples
          const lobby = lobbyData as Lobby;
          const lobbyId = lobby.basic.id.toString();

          // Only add if we haven't seen this lobby ID before
          if (!seenIds.has(lobbyId)) {
            seenIds.add(lobbyId);
            fetchedLobbies.push(lobby);
          }
        } catch (err) {
          console.error(`Error converting lobby at index ${index}:`, err);
        }
      }
    });

    setLobbies(fetchedLobbies);
    setIsLoading(lobbiesData.isLoading);
    setError(lobbiesData.error?.message || null);
  }, [lobbiesData.data, lobbiesData.isLoading, lobbiesData.error, address]);

  const refetch = () => {
    lobbiesData.refetch();
  };

  return {
    lobbies,
    isLoading,
    error,
    refetch,
  };
}
