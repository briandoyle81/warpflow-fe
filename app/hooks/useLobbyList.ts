import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useLobbyCount, useLobbiesRead } from "./useLobbiesContract";
import { Lobby, LobbyStatus, LobbyTuple, tupleToLobby } from "../types/types";

export function useLobbyList() {
  const { address } = useAccount();
  const { data: lobbyCount } = useLobbyCount();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use individual hooks for now (lobbies 1-5)
  const lobby1 = useLobbiesRead("getLobby", [1n]);
  const lobby2 = useLobbiesRead("getLobby", [2n]);
  const lobby3 = useLobbiesRead("getLobby", [3n]);
  const lobby4 = useLobbiesRead("getLobby", [4n]);
  const lobby5 = useLobbiesRead("getLobby", [5n]);

  // Process the lobby data when it changes
  useEffect(() => {
    const fetchedLobbies: Lobby[] = [];

    // Process all lobby hooks
    const lobbyHooks = [lobby1, lobby2, lobby3, lobby4, lobby5];

    lobbyHooks.forEach((lobbyHook, index) => {
      if (
        lobbyHook.data &&
        Array.isArray(lobbyHook.data) &&
        lobbyHook.data.length >= 15
      ) {
        try {
          const lobby = tupleToLobby(lobbyHook.data as LobbyTuple);
          fetchedLobbies.push(lobby);
        } catch (err) {
          console.error(`Error converting lobby ${index + 1}:`, err);
        }
      }
    });

    console.log("Fetched lobbies before filtering:", fetchedLobbies);
    console.log("Current address:", address);

    // Filter lobbies to show only:
    // 1. Open lobbies (no joiner yet)
    // 2. Lobbies where current player is creator or joiner
    const filteredLobbies = fetchedLobbies.filter((lobby) => {
      console.log("Checking lobby:", lobby.basic.id.toString());
      console.log("Joiner:", lobby.players.joiner);
      console.log("Creator:", lobby.basic.creator);
      console.log("Status:", lobby.state.status);

      // Show if it's open for joining (no joiner and status is Open)
      if (
        lobby.players.joiner === "0x0000000000000000000000000000000000000000" &&
        lobby.state.status === 0 // LobbyStatus.Open
      ) {
        console.log("Lobby is open for joining");
        return true;
      }

      // Show if current player is involved (regardless of status)
      if (
        address &&
        (lobby.basic.creator.toLowerCase() === address.toLowerCase() ||
          lobby.players.joiner.toLowerCase() === address.toLowerCase())
      ) {
        console.log("Player is involved in this lobby");
        return true;
      }

      console.log("Lobby filtered out");
      return false;
    });

    console.log("Filtered lobbies:", filteredLobbies);

    setLobbies(filteredLobbies);
    setIsLoading(lobbyHooks.some((hook) => hook.isLoading));
    setError(lobbyHooks.find((hook) => hook.error)?.error?.message || null);
  }, [
    lobby1.data,
    lobby2.data,
    lobby3.data,
    lobby4.data,
    lobby5.data,
    lobby1.isLoading,
    lobby2.isLoading,
    lobby3.isLoading,
    lobby4.isLoading,
    lobby5.isLoading,
    lobby1.error,
    lobby2.error,
    lobby3.error,
    lobby4.error,
    lobby5.error,
    address,
  ]);

  const refetch = () => {
    console.log("Refetching lobbies...");
    // Trigger refetch for all lobby hooks
    lobby1.refetch();
    lobby2.refetch();
    lobby3.refetch();
    lobby4.refetch();
    lobby5.refetch();
  };

  return {
    lobbies,
    isLoading,
    error,
    refetch,
  };
}
