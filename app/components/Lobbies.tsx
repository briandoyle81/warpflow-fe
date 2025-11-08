"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useLobbies } from "../hooks/useLobbies";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetsRead } from "../hooks/useFleetsContract";
import { useShipsRead } from "../hooks/useShipsContract";
import { LobbyStatus, Ship, Attributes } from "../types/types";
import { toast } from "react-hot-toast";
import { cacheShipsData } from "../hooks/useShipDataCache";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
import { LobbyCreateButton } from "./LobbyCreateButton";
import { LobbyJoinButton } from "./LobbyJoinButton";
import { LobbyLeaveButton } from "./LobbyLeaveButton";
import { useTransaction } from "../providers/TransactionContext";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { calculateShipRank, getRankColor } from "../utils/shipLevel";
import { formatDestroyedDate } from "../utils/dateUtils";
import { MapDisplay } from "./MapDisplay";

const Lobbies: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const { transactionState } = useTransaction();
  const {
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,
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
  const [shipPositions, setShipPositions] = useState<
    Array<{ shipId: bigint; row: number; col: number }>
  >([]);
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [showFleetConfirmation, setShowFleetConfirmation] = useState(false);

  // Drag and drop state
  const [draggedShipId, setDraggedShipId] = useState<bigint | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ row: number; col: number } | null>(null);

  // Track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  // Persist selectedLobby to localStorage
  const storageKey = useMemo(
    () => `selectedLobby-${address || "anonymous"}`,
    [address]
  );

  // Track if we've restored from localStorage to avoid repeated restorations
  const hasRestoredRef = useRef(false);

  // Mark component as mounted after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize selectedLobby from localStorage on mount
  // Only restore after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (
      isMounted &&
      typeof window !== "undefined" &&
      address &&
      !hasRestoredRef.current
    ) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const lobbyId = BigInt(saved);
          // Restore immediately, validate later
          setSelectedLobby(lobbyId);
          hasRestoredRef.current = true;
        } catch (error) {
          console.warn(
            "Failed to restore selectedLobby from localStorage:",
            error
          );
          localStorage.removeItem(storageKey);
          hasRestoredRef.current = true;
        }
      } else {
        hasRestoredRef.current = true; // No saved value, mark as restored
      }
    }
  }, [isMounted, address, storageKey]);

  // Validate restored lobby once lobbies are loaded
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      address &&
      selectedLobby &&
      lobbyList.lobbies.length > 0
    ) {
      const lobby = lobbyList.lobbies.find(
        (l) =>
          l.basic.id === selectedLobby &&
          (l.basic.creator === address || l.players.joiner === address)
      );
      if (!lobby) {
        // Lobby no longer exists or user is not part of it, clear it
        setSelectedLobby(null);
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedLobby, address, storageKey, lobbyList.lobbies]);

  // Reset restoration flag when address changes
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [address]);

  // Save selectedLobby to localStorage when it changes
  // Only save after component has mounted to avoid hydration mismatches
  useEffect(() => {
    if (isMounted && typeof window !== "undefined" && address) {
      if (selectedLobby) {
        localStorage.setItem(storageKey, selectedLobby.toString());
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [isMounted, selectedLobby, address, storageKey]);
  const [isCreatingFleet, setIsCreatingFleet] = useState(false);
  const [showFleetView, setShowFleetView] = useState(false);
  const [viewingFleetId, setViewingFleetId] = useState<bigint | null>(null);
  const [viewingFleetOwner, setViewingFleetOwner] = useState<string | null>(
    null
  );

  // Fleet ship data fetching
  const { data: fleetShipIds, isLoading: fleetShipIdsLoading } = useFleetsRead(
    "getFleetShipIds",
    viewingFleetId ? [viewingFleetId] : undefined
  );
  // Also fetch positions together when available
  const { data: fleetIdsAndPositions } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    viewingFleetId ? [viewingFleetId] : undefined
  );

  const { data: fleetShips, isLoading: fleetShipsLoading } = useShipsRead(
    "getShipsByIds",
    fleetShipIds && Array.isArray(fleetShipIds) && fleetShipIds.length > 0
      ? [fleetShipIds]
      : undefined
  );

  // Cache fleet ships data
  React.useEffect(() => {
    if (fleetShips && Array.isArray(fleetShips)) {
      const ships = fleetShips as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [fleetShips]);

  // Determine the player's existing fleet ID when fleet selection modal is open
  const playerFleetId = React.useMemo(() => {
    if (!selectedLobby || !address) return null;
    const lobby = lobbyList.lobbies.find(
      (l) => l.basic.id === selectedLobby
    );
    if (!lobby) return null;
    const isCreator = lobby.basic.creator === address;
    return isCreator
      ? lobby.players.creatorFleetId > 0n
        ? lobby.players.creatorFleetId
        : null
      : lobby.players.joinerFleetId > 0n
      ? lobby.players.joinerFleetId
      : null;
  }, [selectedLobby, address, lobbyList.lobbies]);

  // Fetch the player's existing fleet data when viewing their own fleet
  const { data: playerFleetIdsAndPositions } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    playerFleetId ? [playerFleetId] : undefined,
    { query: { enabled: !!playerFleetId } }
  );

  // Extract player fleet ship IDs for fetching Ship objects
  const playerFleetShipIds = React.useMemo(() => {
    if (!playerFleetIdsAndPositions) return [];
    const tuple = playerFleetIdsAndPositions as [
      bigint[],
      Array<{ row: number; col: number }>
    ];
    return (tuple?.[0] || []) as bigint[];
  }, [playerFleetIdsAndPositions]);

  // Fetch player's fleet Ship objects so they can be displayed on the grid
  const {
    data: playerFleetShipsData,
    isLoading: playerFleetShipsLoading
  } = useShipsRead(
    "getShipsByIds",
    playerFleetShipIds.length > 0 ? [playerFleetShipIds] : undefined
  );

  // Cache player fleet ships data
  React.useEffect(() => {
    if (playerFleetShipsData && Array.isArray(playerFleetShipsData)) {
      const ships = playerFleetShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [playerFleetShipsData]);

  // Normalize player fleet ships
  const playerFleetShips = React.useMemo(() => {
    const ships = (playerFleetShipsData as Ship[]) || [];
    // Ensure all ships have the required structure
    return ships.filter(
      (ship): ship is Ship =>
        !!ship &&
        !!ship.id &&
        !!ship.equipment &&
        !!ship.shipData &&
        !!ship.traits &&
        !!ship.owner
    );
  }, [playerFleetShipsData]);

  // Track the last loaded fleet ID to avoid reloading unnecessarily
  const lastLoadedFleetIdRef = useRef<bigint | null>(null);

  // Load player's existing fleet into selection state when modal opens
  useEffect(() => {
    if (
      selectedLobby &&
      playerFleetId &&
      playerFleetIdsAndPositions &&
      lastLoadedFleetIdRef.current !== playerFleetId
    ) {
      const tuple = playerFleetIdsAndPositions as [
        bigint[],
        Array<{ row: number; col: number }>
      ];
      const ids: bigint[] = (tuple?.[0] || []) as bigint[];
      const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
        []) as Array<{ row: number; col: number }>;

      if (ids.length > 0) {
        setSelectedShips(ids);
        setShipPositions(
          ids.map((id, i) => ({
            shipId: id,
            row: positions?.[i]?.row ?? 0,
            col: positions?.[i]?.col ?? 0,
          }))
        );
        lastLoadedFleetIdRef.current = playerFleetId;
      }
    } else if (!selectedLobby || !playerFleetId) {
      // Clear the ref when modal closes or no fleet exists
      lastLoadedFleetIdRef.current = null;
    }
  }, [
    selectedLobby,
    playerFleetId,
    playerFleetIdsAndPositions,
  ]);

  // Normalize opponent positions for MapDisplay when viewing a fleet
  const opponentPositions = React.useMemo(() => {
    if (!fleetIdsAndPositions)
      return [] as Array<{ shipId: bigint; row: number; col: number }>;
    const tuple = fleetIdsAndPositions as [
      bigint[],
      Array<{ row: number; col: number }>
    ];
    const ids: bigint[] = (tuple?.[0] || []) as bigint[];
    const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
      []) as Array<{ row: number; col: number }>;
    return ids.map((id, i) => ({
      shipId: id,
      row: positions?.[i]?.row ?? 0,
      col: positions?.[i]?.col ?? 0,
    }));
  }, [fleetIdsAndPositions]);

  // Load opponent ship objects using existing ships contract reader
  const { data: opponentShipsData } = useShipsRead(
    "getShipsByIds",
    opponentPositions.length > 0
      ? [opponentPositions.map((p) => p.shipId)]
      : undefined
  );

  // Cache opponent ships data
  React.useEffect(() => {
    if (opponentShipsData && Array.isArray(opponentShipsData)) {
      const ships = opponentShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [opponentShipsData]);
  // Use existing image caching via ShipImage component; just shape into array
  const opponentShips = React.useMemo(
    () => (opponentShipsData as Ship[]) || [],
    [opponentShipsData]
  );

  // Fleet selection filters
  const [fleetFilters, setFleetFilters] = useState({
    showShiny: true,
    showCommon: true,
    showUnavailable: false,
    minCost: 0,
    maxCost: 10000,
    minAccuracy: 0,
    maxAccuracy: 2,
    minHull: 0,
    maxHull: 2,
    minSpeed: 0,
    maxSpeed: 2,
    weaponType: "all",
    defenseType: "all",
    specialType: "all",
  });

  // In-game properties toggle
  const [showInGameProperties, setShowInGameProperties] = useState(true);

  // Get ship attributes for in-game properties
  const shipIds = React.useMemo(() => ships.map((ship) => ship.id), [ships]);
  const {
    attributes: shipAttributes,
    isLoading: attributesLoading,
    isFromCache,
  } = useShipAttributesByIds(shipIds);

  // Helper function to find next available position for a ship
  const findNextPosition = (
    isCreator: boolean,
    existingPositions: Array<{ row: number; col: number }>
  ) => {
    if (isCreator) {
      // Creator ships start in upper left (rows 0-12, cols 0-4)
      // Find the next available position in order: (0,0), (1,0), (2,0), ..., (12,0), (0,1), (1,1), etc.
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 13; row++) {
          if (
            !existingPositions.some((pos) => pos.row === row && pos.col === col)
          ) {
            return { row, col };
          }
        }
      }
    } else {
      // Joiner ships start in lower right (rows 0-12, cols 20-24)
      // Find the next available position in order: (12,24), (11,24), (10,24), ..., (0,24), (12,23), etc.
      for (let col = 24; col >= 20; col--) {
        for (let row = 12; row >= 0; row--) {
          if (
            !existingPositions.some((pos) => pos.row === row && pos.col === col)
          ) {
            return { row, col };
          }
        }
      }
    }
    return null; // No available position
  };

  // Function to add ship to fleet with position
  const addShipToFleet = (shipId: bigint) => {
    const currentLobby = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === selectedLobby
    );
    if (!currentLobby) return;

    const isCreator = currentLobby.basic.creator === address;
    const existingPositions = shipPositions.map((pos) => ({
      row: pos.row,
      col: pos.col,
    }));

    const position = findNextPosition(isCreator, existingPositions);

    if (position) {
      setSelectedShips((prev) => [...prev, shipId]);
      setShipPositions((prev) => [
        ...prev,
        { shipId, row: position.row, col: position.col },
      ]);
    }
  };

  // Function to remove ship from fleet
  const removeShipFromFleet = (shipId: bigint) => {
    setSelectedShips((prev) => prev.filter((id) => id !== shipId));
    setShipPositions((prev) => prev.filter((pos) => pos.shipId !== shipId));
    // Clear selection if the removed ship was selected
    if (selectedShipId === shipId) {
      setSelectedShipId(null);
    }
  };

  // Function to handle ship selection on the grid
  const handleShipSelect = (shipId: bigint) => {
    setSelectedShipId(shipId);
  };

  // Function to handle ship movement on the grid
  const handleShipMove = (shipId: bigint, row: number, col: number) => {
    // Check if the ship is already in the fleet
    if (!selectedShips.includes(shipId)) {
      // Ship not in fleet - try to add it
      const currentLobby = lobbyList.lobbies.find(
        (lobby) => lobby.basic.id === selectedLobby
      );
      if (!currentLobby) return;

      const isCreator = currentLobby.basic.creator === address;

      // Check if position is valid for this player
      const isValidPosition = isCreator
        ? (row >= 0 && row < 13 && col >= 0 && col < 25)
        : (row >= 0 && row < 13 && col >= 0 && col < 25);

      if (!isValidPosition) return;

      // Check if position is already occupied
      const existingPosition = shipPositions.find(
        (pos) => pos.row === row && pos.col === col
      );
      if (existingPosition) {
        return; // Position already occupied
      }

      // Add ship to fleet at this position
      setSelectedShips((prev) => [...prev, shipId]);
      setShipPositions((prev) => [
        ...prev,
        { shipId, row, col },
      ]);
      return;
    }

    // Check if position is already occupied
    const existingPosition = shipPositions.find(
      (pos) => pos.row === row && pos.col === col
    );
    if (existingPosition) {
      return; // Position already occupied
    }

    // Update the ship's position
    setShipPositions((prev) =>
      prev.map((pos) => (pos.shipId === shipId ? { ...pos, row, col } : pos))
    );

    // Clear selection after moving
    setSelectedShipId(null);
  };

  // Drag and drop handlers
  const handleDragStart = (shipId: bigint) => {
    setDraggedShipId(shipId);
  };

  const handleDragEnd = () => {
    setDraggedShipId(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    setDragOverPosition({ row, col });
  };

  const handleDrop = (row: number, col: number, e?: React.DragEvent) => {
    // Try to get ship ID from draggedShipId state first (from ship list)
    let shipIdToMove = draggedShipId;

    // If not in state, try to get from dataTransfer (from grid drag)
    if (!shipIdToMove && e) {
      const data = e.dataTransfer.getData("text/plain");
      if (data) {
        try {
          shipIdToMove = BigInt(data);
        } catch (error) {
          console.error("Failed to parse ship ID from drag data:", error);
        }
      }
    }

    if (!shipIdToMove) return;

    // Use handleShipMove to handle the drop
    handleShipMove(shipIdToMove, row, col);

    // Clear drag state
    setDraggedShipId(null);
    setDragOverPosition(null);
  };

  // Create a map of ship ID to attributes for quick lookup
  const attributesMap = React.useMemo(() => {
    const map = new Map<bigint, (typeof shipAttributes)[0]>();
    shipIds.forEach((shipId, index) => {
      if (shipAttributes[index]) {
        map.set(shipId, shipAttributes[index]);
      }
    });
    return map;
  }, [shipIds, shipAttributes]);

  const [dragging, setDragging] = useState<{
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed"
      | null;
    startX: number;
    startValue: number;
    container: HTMLElement | null;
  }>({ type: null, startX: 0, startValue: 0, container: null });

  const handleThumbMouseDown = (
    e: React.MouseEvent,
    type:
      | "minAccuracy"
      | "maxAccuracy"
      | "minHull"
      | "maxHull"
      | "minSpeed"
      | "maxSpeed"
  ) => {
    e.preventDefault();
    const container = (e.target as HTMLElement).closest(
      ".range-slider-container"
    ) as HTMLElement;
    if (!container) return;

    const currentValue = fleetFilters[type];
    setDragging({
      type,
      startX: e.clientX,
      startValue: currentValue,
      container, // Store the specific container
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.type || !dragging.container) return;

      const rect = dragging.container.getBoundingClientRect();
      const containerWidth = rect.width - 20; // Account for 10px padding on each side
      const halfThumbWidth = 9; // Account for half thumb width
      const availableWidth = containerWidth - halfThumbWidth;
      const relativeX = e.clientX - rect.left - 10; // Account for padding
      const percentage = Math.max(0, Math.min(1, relativeX / availableWidth));
      const newValue = Math.round(percentage * 2); // 0, 1, or 2

      // Clamp the value to valid range (0, 1, 2)
      const clampedValue = Math.max(0, Math.min(2, newValue));

      if (dragging.type.includes("min")) {
        const maxType = dragging.type.replace(
          "min",
          "max"
        ) as keyof typeof fleetFilters;
        const maxValue = fleetFilters[maxType] as number;
        if (clampedValue <= maxValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      } else {
        const minType = dragging.type.replace(
          "max",
          "min"
        ) as keyof typeof fleetFilters;
        const minValue = fleetFilters[minType] as number;
        if (clampedValue >= minValue) {
          setFleetFilters((prev) => ({
            ...prev,
            [dragging.type!]: clampedValue,
          }));
        }
      }
    },
    [dragging.type, dragging.container, fleetFilters]
  );

  const handleMouseUp = () => {
    setDragging({ type: null, startX: 0, startValue: 0, container: null });
  };

  useEffect(() => {
    if (dragging.type) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  // Filter panel state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter ships based on current filters
  const filteredShips = ships.filter((ship) => {
    // Always show selected ships regardless of filters
    if (selectedShips.includes(ship.id)) return true;

    // Filter out ships that are not available for fleet selection
    // Ships must be constructed, not destroyed, and not already in a fleet
    // Unless showUnavailable is enabled
    if (!fleetFilters.showUnavailable) {
      if (!ship.shipData.constructed) return false;
      if (ship.shipData.timestampDestroyed > 0n) return false;
      if (ship.shipData.inFleet) return false;
    }

    const cost = Number(ship.shipData.cost);
    const isShiny = ship.shipData.shiny;
    const accuracy = ship.traits.accuracy;
    const hull = ship.traits.hull;
    const speed = ship.traits.speed;

    // Rarity filters
    if (isShiny && !fleetFilters.showShiny) return false;
    if (!isShiny && !fleetFilters.showCommon) return false;

    // Cost filters
    if (cost < fleetFilters.minCost || cost > fleetFilters.maxCost)
      return false;

    // Trait filters
    if (
      accuracy < fleetFilters.minAccuracy ||
      accuracy > fleetFilters.maxAccuracy
    )
      return false;
    if (hull < fleetFilters.minHull || hull > fleetFilters.maxHull)
      return false;
    if (speed < fleetFilters.minSpeed || speed > fleetFilters.maxSpeed)
      return false;

    // Equipment filters
    if (fleetFilters.weaponType !== "all") {
      const weaponName = getMainWeaponName(
        ship.equipment.mainWeapon
      ).toLowerCase();
      if (!weaponName.includes(fleetFilters.weaponType.toLowerCase()))
        return false;
    }

    if (fleetFilters.defenseType !== "all") {
      const hasShield = ship.equipment.shields > 0;
      if (fleetFilters.defenseType === "shield" && !hasShield) return false;
      if (fleetFilters.defenseType === "armor" && hasShield) return false;
    }

    if (fleetFilters.specialType !== "all") {
      const specialName = getSpecialName(ship.equipment.special).toLowerCase();
      if (fleetFilters.specialType === "none" && specialName !== "none")
        return false;
      if (
        fleetFilters.specialType !== "none" &&
        !specialName.includes(fleetFilters.specialType.toLowerCase())
      )
        return false;
    }

    return true;
  });

  // Create lobby form state
  const [createForm, setCreateForm] = useState({
    costLimit: "1000", // Fixed cost limit
    turnTime: "300", // 5 minutes
    selectedMapId: "1",
    maxScore: "100",
    creatorGoesFirst: false,
  });

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

    const currentLobby = lobbyList.lobbies.find(
      (lobby) => lobby.basic.id === lobbyId
    );
    const totalCost = selectedShips.reduce((sum, shipId) => {
      const ship = ships.find((s) => s.id === shipId);
      return sum + (ship ? Number(ship.shipData.cost) : 0);
    }, 0);
    const costLimit = currentLobby
      ? Number(currentLobby.basic.costLimit)
      : 1000;
    const ninetyPercentThreshold = costLimit * 0.9;
    const isUnderNinetyPercent = totalCost < ninetyPercentThreshold;

    if (isUnderNinetyPercent) {
      setShowFleetConfirmation(true);
      return;
    }

    await createFleetWithConfirmation(lobbyId);
  };

  const createFleetWithConfirmation = async (lobbyId: bigint) => {
    if (!isConnected || selectedShips.length === 0) return;

    setIsCreatingFleet(true);
    try {
      // Convert shipPositions to the format expected by the contract
      const startingPositions = shipPositions.map((pos) => ({
        row: pos.row,
        col: pos.col,
      }));

      // Submit tx
      await createFleet(lobbyId, selectedShips, startingPositions);

      // Transaction submitted successfully - close modal
      setShowFleetView(false);
      setSelectedShips([]);
      setShipPositions([]);
      setSelectedShipId(null);
      toast.success("Fleet created successfully!");
      setShowFleetConfirmation(false);
    } catch (error) {
      console.error("Failed to create fleet:", error);
    } finally {
      setIsCreatingFleet(false);
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

  // NOTE: Early returns moved below to keep hook order stable across renders

  // Auto-fetch opponent fleet data for grid preview (cache immutable fleets)
  const opponentCacheKey = React.useMemo(() => {
    if (!selectedLobby) return null;
    const lobby = lobbyList.lobbies.find((l) => l.basic.id === selectedLobby);
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === address;
    const opponentFleetId = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return opponentFleetId && opponentFleetId > 0n
      ? `fleet:${opponentFleetId.toString()}`
      : null;
  }, [selectedLobby, lobbyList.lobbies, address]);

  // Compute opponent fleetId for grid
  const opponentFleetIdForGrid = React.useMemo(() => {
    if (!selectedLobby) return null as bigint | null;
    const lobby = lobbyList.lobbies.find((l) => l.basic.id === selectedLobby);
    if (!lobby) return null;
    const myIsCreator = lobby.basic.creator === address;
    const fid = myIsCreator
      ? lobby.players.joinerFleetId
      : lobby.players.creatorFleetId;
    return fid && fid > 0n ? fid : null;
  }, [selectedLobby, lobbyList.lobbies, address]);

  // Whether the opponent fleet (when shown) belongs to the lobby creator
  const opponentIsCreator = React.useMemo(() => {
    if (!selectedLobby) return false;
    const lobby = lobbyList.lobbies.find((l) => l.basic.id === selectedLobby);
    if (!lobby) return false;
    const opponentFid = opponentFleetIdForGrid;
    if (!opponentFid) return false;
    return lobby.players.creatorFleetId === opponentFid;
  }, [selectedLobby, lobbyList.lobbies, opponentFleetIdForGrid]);

  const [opponentGridPositions, setOpponentGridPositions] = React.useState<
    Array<{ shipId: bigint; row: number; col: number }>
  >([]);
  const [opponentGridShips, setOpponentGridShips] = React.useState<Ship[]>([]);

  // Hook read for ids+positions when opponent fleet exists
  const { data: oppIdsPos } = useFleetsRead(
    "getFleetShipIdsAndPositions",
    opponentFleetIdForGrid ? [opponentFleetIdForGrid] : undefined,
    { query: { enabled: !!opponentFleetIdForGrid } }
  );

  // Normalize to positions and ids
  const opponentGridPositionsFromHook = React.useMemo(() => {
    if (!oppIdsPos)
      return [] as Array<{ shipId: bigint; row: number; col: number }>;
    const tuple = oppIdsPos as [bigint[], Array<{ row: number; col: number }>];
    const ids: bigint[] = (tuple?.[0] || []) as bigint[];
    const positions: Array<{ row: number; col: number }> = (tuple?.[1] ||
      []) as Array<{ row: number; col: number }>;
    return ids.map((id, i) => ({
      shipId: id,
      row: positions?.[i]?.row ?? 0,
      col: positions?.[i]?.col ?? 0,
    }));
  }, [oppIdsPos]);

  // Fetch opponent ships when we have ids
  const { data: opponentGridShipsData } = useShipsRead(
    "getShipsByIds",
    opponentGridPositionsFromHook.length > 0
      ? [opponentGridPositionsFromHook.map((p) => p.shipId)]
      : undefined
  );

  // Cache opponent grid ships data
  React.useEffect(() => {
    if (opponentGridShipsData && Array.isArray(opponentGridShipsData)) {
      const ships = opponentGridShipsData as Ship[];
      if (ships.length > 0) {
        cacheShipsData(ships);
      }
    }
  }, [opponentGridShipsData]);

  // Opponent attributes (grid preview)
  const opponentGridShipIds = React.useMemo(
    () => opponentGridPositionsFromHook.map((p) => p.shipId),
    [opponentGridPositionsFromHook]
  );
  const { attributes: opponentGridAttributes } =
    useShipAttributesByIds(opponentGridShipIds);

  // Opponent attributes (modal view)
  const opponentViewShipIds = React.useMemo(
    () => opponentPositions.map((p) => p.shipId),
    [opponentPositions]
  );
  const { attributes: opponentViewAttributes } =
    useShipAttributesByIds(opponentViewShipIds);

  // Combine both fleets for grid view during selection
  const combinedPositions = React.useMemo(
    () => [
      ...shipPositions,
      ...(opponentGridPositionsFromHook.length > 0
        ? opponentGridPositionsFromHook
        : []),
    ],
    [shipPositions, opponentGridPositionsFromHook]
  );

  const combinedShips = React.useMemo<Ship[]>(() => {
    const shipsArray = (ships as Ship[]) || [];
    const opponentShipsArray = ((opponentGridShipsData as Ship[]) ?? []) as Ship[];
    const playerFleetShipsArray = playerFleetShips || [];

    // Combine all ships, avoiding duplicates by ship ID
    const shipMap = new Map<bigint, Ship>();

    // Add owned ships first
    shipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    // Add player's fleet ships (these may not be in owned ships if they're in a fleet)
    // These are critical for displaying existing fleet selections
    // Priority: player fleet ships override owned ships to ensure we have the latest data
    playerFleetShipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    // Add opponent ships
    opponentShipsArray.forEach((ship) => {
      if (ship?.id && ship?.equipment) {
        shipMap.set(ship.id, ship);
      }
    });

    return Array.from(shipMap.values());
  }, [ships, opponentGridShipsData, playerFleetShips, selectedShips, playerFleetId]);

  // Get attributes for player's fleet ships
  const { attributes: playerFleetAttributes } = useShipAttributesByIds(
    playerFleetShipIds
  );

  const combinedAttributes = React.useMemo(
    () => [
      ...(shipAttributes as Attributes[]),
      ...(((playerFleetAttributes as Attributes[]) ?? []) as Attributes[]),
      ...(((opponentGridAttributes as Attributes[]) ?? []) as Attributes[]),
    ],
    [shipAttributes, playerFleetAttributes, opponentGridAttributes]
  );

  // Selection allowed only on current builder's ships
  const selectableShipIds = selectedShips;
  // Flip opponent ships if opponent is creator (grid preview)
  const flippedShipIds = React.useMemo(
    () => (opponentIsCreator ? opponentGridShipIds : []),
    [opponentIsCreator, opponentGridShipIds]
  );

  // Apply cache-first and update state when data loads
  React.useEffect(() => {
    // Load from cache first
    if (opponentCacheKey && typeof window !== "undefined") {
      const cached = window.localStorage.getItem(opponentCacheKey);
      if (
        cached &&
        opponentGridPositions.length === 0 &&
        opponentGridShips.length === 0
      ) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.positions && parsed?.ships) {
            setOpponentGridPositions(parsed.positions);
            setOpponentGridShips(parsed.ships);
          }
        } catch {}
      }
    }
  }, [
    opponentCacheKey,
    opponentGridPositions.length,
    opponentGridShips.length,
  ]);

  React.useEffect(() => {
    // Update from hook reads
    if (opponentGridPositionsFromHook.length > 0) {
      setOpponentGridPositions(opponentGridPositionsFromHook);
    }
    if (opponentGridShipsData && Array.isArray(opponentGridShipsData)) {
      setOpponentGridShips(opponentGridShipsData as Ship[]);
    }
    // Write-through to cache when we have both
    if (
      opponentCacheKey &&
      opponentGridPositionsFromHook.length > 0 &&
      opponentGridShipsData &&
      typeof window !== "undefined"
    ) {
      try {
        window.localStorage.setItem(
          opponentCacheKey,
          JSON.stringify({
            positions: opponentGridPositionsFromHook,
            ships: opponentGridShipsData,
          })
        );
      } catch {}
    }
  }, [opponentCacheKey, opponentGridPositionsFromHook, opponentGridShipsData]);

  return (
    <div className="text-cyan-300 font-mono">
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
        }
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(6, 182, 212, 0.4),
            0 3px 6px rgba(0, 0, 0, 0.6);
        }
        .slider-thumb::-webkit-slider-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-moz-range-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .slider-thumb::-webkit-slider-runnable-track {
          background: linear-gradient(to right, #374151, #4b5563);
          height: 8px;
          border-radius: 4px;
          border: 1px solid #1f2937;
        }
        .range-slider-container {
          position: relative;
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 10px;
        }
        .range-slider-track {
          position: absolute;
          top: 50%;
          left: 10px;
          right: 10px;
          height: 6px;
          background: #374151;
          border-radius: 3px;
          transform: translateY(-50%);
        }
        .range-slider-fill {
          position: absolute;
          top: 50%;
          left: 10px;
          height: 6px;
          background: linear-gradient(to right, #06b6d4, #0891b2);
          border-radius: 3px;
          transform: translateY(-50%);
          transition: all 0.2s ease;
        }
        .range-slider-thumb {
          position: absolute;
          top: 50%;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border: 3px solid #000;
          border-radius: 50%;
          cursor: pointer;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 6px rgba(6, 182, 212, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.5);
          transition: all 0.2s ease;
          z-index: 10;
        }
        .range-slider-thumb:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.6);
        }
        .range-slider-thumb:active {
          transform: translate(-50%, -50%) scale(1.05);
        }
      `}</style>
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [CREATE AND JOIN NEW GAMES]
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
              <LobbyCreateButton
                costLimit={BigInt(createForm.costLimit)}
                turnTime={BigInt(createForm.turnTime)}
                creatorGoesFirst={createForm.creatorGoesFirst}
                selectedMapId={BigInt(createForm.selectedMapId)}
                maxScore={BigInt(createForm.maxScore)}
                value={
                  needsPaymentForLobby
                    ? (additionalLobbyFee as bigint) || 0n
                    : 0n
                }
                className="flex-1 px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200"
                onSuccess={() => {
                  // Show success toast
                  // Close the form
                  setShowCreateForm(false);
                  // Refresh lobby list
                  loadLobbies();
                }}
                onError={(error) => {
                  console.error("Failed to create lobby:", error);
                }}
              >
                CREATE
              </LobbyCreateButton>
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
                  <p
                    className={`text-sm ${
                      address &&
                      lobby.basic.creator.toLowerCase() ===
                        address.toLowerCase()
                        ? "text-cyan-400 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    Creator: {lobby.basic.creator.slice(0, 6)}...
                    {lobby.basic.creator.slice(-4)}
                  </p>
                  {lobby.players.joiner !==
                    "0x0000000000000000000000000000000000000000" && (
                    <p
                      className={`text-sm ${
                        address &&
                        lobby.players.joiner.toLowerCase() ===
                          address.toLowerCase()
                          ? "text-cyan-400 font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      Joiner: {lobby.players.joiner.slice(0, 6)}...
                      {lobby.players.joiner.slice(-4)}
                    </p>
                  )}

                  {/* Fleet Selection Indicators */}
                  <div className="flex gap-2 mt-2">
                    {lobby.players.creatorFleetId > 0n && (
                      <button
                        onClick={() => {
                          setViewingFleetId(lobby.players.creatorFleetId);
                          setViewingFleetOwner(lobby.basic.creator);
                          setShowFleetView(true);
                        }}
                        className={`px-2 py-1 text-xs rounded border ${
                          address &&
                          lobby.basic.creator.toLowerCase() ===
                            address.toLowerCase()
                            ? "border-cyan-400 text-cyan-400 hover:bg-cyan-400/20"
                            : "border-green-400 text-green-400 hover:bg-green-400/20"
                        }`}
                      >
                        Creator Fleet #{lobby.players.creatorFleetId.toString()}
                      </button>
                    )}
                    {lobby.players.joinerFleetId > 0n && (
                      <button
                        onClick={() => {
                          setViewingFleetId(lobby.players.joinerFleetId);
                          setViewingFleetOwner(lobby.players.joiner);
                          setShowFleetView(true);
                        }}
                        className={`px-2 py-1 text-xs rounded border ${
                          address &&
                          lobby.players.joiner.toLowerCase() ===
                            address.toLowerCase()
                            ? "border-cyan-400 text-cyan-400 hover:bg-cyan-400/20"
                            : "border-green-400 text-green-400 hover:bg-green-400/20"
                        }`}
                      >
                        Joiner Fleet #{lobby.players.joinerFleetId.toString()}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(
                      lobby.state.status
                    )}`}
                  >
                    {getStatusText(lobby.state.status)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      lobby.players.joiner !==
                      "0x0000000000000000000000000000000000000000"
                        ? "bg-green-400/20 text-green-400"
                        : "bg-gray-400/20 text-gray-400"
                    }`}
                  >
                    {lobby.players.joiner !==
                    "0x0000000000000000000000000000000000000000"
                      ? "JOINED"
                      : "WAITING"}
                  </span>
                </div>
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
                  <div className="space-y-2">
                    <LobbyJoinButton
                      lobbyId={lobby.basic.id}
                      disabled={hasActiveLobby}
                      className="w-full px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onSuccess={() => {
                        // Show success toast
                        // Refresh lobby list
                        loadLobbies();
                      }}
                      onError={(error) => {
                        console.error("Failed to join lobby:", error);
                      }}
                    >
                      JOIN LOBBY
                    </LobbyJoinButton>
                    {hasActiveLobby && (
                      <p className="text-xs text-yellow-400 text-center">
                        You already have an active lobby. Complete it before
                        joining another.
                      </p>
                    )}
                  </div>
                )}

              {/* Show action buttons for creator */}
              {lobby.basic.creator === address && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Fleet selection button - only show if no fleet selected AND joiner has joined */}
                  {lobby.players.creatorFleetId === 0n &&
                    lobby.players.joiner !==
                      "0x0000000000000000000000000000000000000000" && (
                      <button
                        onClick={() => setSelectedLobby(lobby.basic.id)}
                        disabled={transactionState.isPending}
                        className="flex-1 px-4 py-2 rounded-lg border border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        SELECT FLEET
                      </button>
                    )}

                  {/* View Fleet Selection button - show if fleet is selected */}
                  {lobby.players.creatorFleetId > 0n && (
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      disabled={transactionState.isPending}
                      className="flex-1 px-4 py-2 rounded-lg border border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      VIEW FLEET SELECTION
                    </button>
                  )}

                  {/* Show waiting message if no joiner has joined yet */}
                  {lobby.players.creatorFleetId === 0n &&
                    lobby.players.joiner ===
                      "0x0000000000000000000000000000000000000000" && (
                      <div className="flex-1 px-4 py-2 rounded-lg border border-gray-400 text-gray-400 text-center font-mono font-bold text-sm tracking-wider">
                        WAITING FOR JOINER
                      </div>
                    )}

                  {/* Leave button - show for all pre-game scenarios */}
                  {lobby.state.status !== LobbyStatus.InGame && (
                    <LobbyLeaveButton
                      lobbyId={lobby.basic.id}
                      className="flex-1 px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onSuccess={() => {
                        // If leaving from fleet selection modal, close it
                        if (selectedLobby === lobby.basic.id) {
                          setSelectedLobby(null);
                          setSelectedShips([]);
                          setShipPositions([]);
                          setSelectedShipId(null);
                          setFiltersExpanded(false);
                          setShowFleetConfirmation(false);
                          lastLoadedFleetIdRef.current = null;
                          setFleetFilters({
                            showShiny: true,
                            showCommon: true,
                            showUnavailable: false,
                            minCost: 0,
                            maxCost: 10000,
                            minAccuracy: 0,
                            maxAccuracy: 2,
                            minHull: 0,
                            maxHull: 2,
                            minSpeed: 0,
                            maxSpeed: 2,
                            weaponType: "all",
                            defenseType: "all",
                            specialType: "all",
                          });
                        }
                        // Refresh lobby list
                        loadLobbies();
                      }}
                      onError={(error) => {
                        console.error("Failed to leave lobby:", error);
                      }}
                    >
                      LEAVE LOBBY
                    </LobbyLeaveButton>
                  )}
                </div>
              )}

              {/* Show fleet selection for joiner if they haven't selected a fleet yet */}
              {lobby.players.joiner === address &&
                lobby.players.joinerFleetId === 0n && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      className="px-4 py-2 rounded-lg border border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                    >
                      SELECT FLEET
                    </button>
                  </div>
                )}

              {/* Show View Fleet Selection button for joiner if they have selected a fleet */}
              {lobby.players.joiner === address &&
                lobby.players.joinerFleetId > 0n && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setSelectedLobby(lobby.basic.id)}
                      className="px-4 py-2 rounded-lg border border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                    >
                      VIEW FLEET SELECTION
                    </button>
                  </div>
                )}

              {/* Show fleet selection phase message when both players are in lobby but haven't both selected fleets */}
              {lobby.state.status === LobbyStatus.FleetSelection &&
                lobby.players.joiner !==
                  "0x0000000000000000000000000000000000000000" &&
                (lobby.players.creatorFleetId === 0n ||
                  lobby.players.joinerFleetId === 0n) && (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-400">
                      Fleet selection phase - waiting for both players to select
                      fleets
                    </p>
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
      {selectedLobby &&
        (() => {
          const currentLobby = lobbyList.lobbies.find(
            (lobby) => lobby.basic.id === selectedLobby
          );
          const isCreator = currentLobby
            ? currentLobby.basic.creator === address
            : false;
          const totalCost = selectedShips.reduce((sum, shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            return sum + (ship ? Number(ship.shipData.cost) : 0);
          }, 0);
          const costLimit = currentLobby
            ? Number(currentLobby.basic.costLimit)
            : 1000;
          const isOverLimit = totalCost > costLimit;
          const isUnder90Percent = totalCost < costLimit * 0.9;

          // Check if all ships are not in the default column
          // Creator default: column 0, Joiner default: column 24
          const hasMovedShip =
            shipPositions.length > 0 &&
            shipPositions.some((pos) => {
              if (isCreator) {
                // Creator: at least one ship must not be in column 0
                return pos.col !== 0;
              } else {
                // Joiner: at least one ship must not be in column 24
                return pos.col !== 24;
              }
            });

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-black border border-cyan-400 rounded-lg p-6 w-[100vw] h-[100vh] flex flex-col">
                <div className="relative flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-cyan-400">
                      {playerFleetId ? "VIEW FLEET" : "SELECT FLEET"}
                    </h4>
                    {playerFleetId && (
                      <span className="px-3 py-1 text-xs font-bold text-green-400 bg-green-400/20 border border-green-400 rounded">
                        FLEET SELECTED
                      </span>
                    )}
                  </div>
                  {/* Centered buttons - only show if no fleet is selected */}
                  {!playerFleetId && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-2 items-center">
                      <button
                        onClick={() => handleCreateFleet(selectedLobby)}
                        disabled={
                          selectedShips.length === 0 ||
                          isCreatingFleet ||
                          isUnder90Percent ||
                          !hasMovedShip
                        }
                        className="px-4 py-2 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingFleet
                          ? "CREATING FLEET..."
                          : isUnder90Percent
                          ? `NEED ${Math.round(costLimit * 0.9)} POINTS`
                          : !hasMovedShip
                          ? "MOVE AT LEAST ONE SHIP FORWARD"
                          : `CREATE FLEET (${selectedShips.length})`}
                      </button>
                      <button
                        onClick={() => {
                          if (isCreatingFleet) return; // Prevent closing during transaction
                          setSelectedLobby(null);
                          setSelectedShips([]);
                          setShipPositions([]);
                          setSelectedShipId(null);
                          setFiltersExpanded(false);
                          setShowFleetConfirmation(false);
                          lastLoadedFleetIdRef.current = null;
                          setFleetFilters({
                            showShiny: true,
                            showCommon: true,
                            showUnavailable: false,
                            minCost: 0,
                            maxCost: 10000,
                            minAccuracy: 0,
                            maxAccuracy: 2,
                            minHull: 0,
                            maxHull: 2,
                            minSpeed: 0,
                            maxSpeed: 2,
                            weaponType: "all",
                            defenseType: "all",
                            specialType: "all",
                          });
                        }}
                        disabled={isCreatingFleet}
                        className="px-4 py-2 border border-red-400 text-red-400 rounded hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Filter Button */}
                    <button
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="px-2 py-1 text-xs font-bold text-cyan-400 border border-cyan-400 rounded hover:text-cyan-300 hover:border-cyan-300 transition-colors"
                    >
                      FILTERS ▼
                    </button>
                    {/* Total Points Display */}
                    <div
                      className={`text-lg font-bold px-3 py-1 rounded ${
                        isOverLimit
                          ? "text-red-400 bg-red-400/20 border border-red-400/30"
                          : isUnder90Percent
                          ? "text-yellow-400 bg-yellow-400/20 border border-yellow-400/30"
                          : "text-green-400 bg-green-400/20 border border-green-400/30"
                      }`}
                    >
                      {totalCost}/{costLimit}
                    </div>
                    {/* Leave Lobby Button (in fleet selection modal) - only show if no fleet is selected */}
                    {!playerFleetId && (
                      <LobbyLeaveButton
                        lobbyId={selectedLobby}
                        className="px-3 py-1 text-sm font-bold text-red-400 border border-red-400 rounded hover:text-red-300 hover:border-red-300 transition-colors"
                        onSuccess={() => {
                          setSelectedLobby(null);
                          setSelectedShips([]);
                          setShipPositions([]);
                          setSelectedShipId(null);
                          setFiltersExpanded(false);
                          setShowFleetConfirmation(false);
                          lastLoadedFleetIdRef.current = null;
                          setFleetFilters({
                            showShiny: true,
                            showCommon: true,
                            showUnavailable: false,
                            minCost: 0,
                            maxCost: 10000,
                            minAccuracy: 0,
                            maxAccuracy: 2,
                            minHull: 0,
                            maxHull: 2,
                            minSpeed: 0,
                            maxSpeed: 2,
                            weaponType: "all",
                            defenseType: "all",
                            specialType: "all",
                          });
                          loadLobbies();
                        }}
                        onError={(error) => {
                          console.error("Failed to leave lobby:", error);
                        }}
                      >
                        LEAVE LOBBY
                      </LobbyLeaveButton>
                    )}
                    {/* Close Button */}
                    <button
                      onClick={() => {
                        setSelectedLobby(null);
                        setSelectedShips([]);
                        setShipPositions([]);
                        setSelectedShipId(null);
                        setFiltersExpanded(false);
                        setShowFleetConfirmation(false);
                        lastLoadedFleetIdRef.current = null;
                        setFleetFilters({
                          showShiny: true,
                          showCommon: true,
                          showUnavailable: false,
                          minCost: 0,
                          maxCost: 10000,
                          minAccuracy: 0,
                          maxAccuracy: 2,
                          minHull: 0,
                          maxHull: 2,
                          minSpeed: 0,
                          maxSpeed: 2,
                          weaponType: "all",
                          defenseType: "all",
                          specialType: "all",
                        });
                      }}
                      className="px-3 py-1 text-sm font-bold text-gray-400 border border-gray-400 rounded hover:text-gray-300 hover:border-gray-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {!playerFleetId && (
                  <p className="text-sm text-yellow-400 mb-4">
                    ⚡ Creating your fleet first will make you go first in the
                    game!
                  </p>
                )}

                {/* Filter Overlay */}
                {filtersExpanded && (
                  <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
                    onClick={() => setFiltersExpanded(false)}
                  >
                    <div
                      className="bg-black border border-cyan-400 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-cyan-400">
                          FILTERS
                        </h3>
                        <button
                          onClick={() => setFiltersExpanded(false)}
                          className="text-gray-400 hover:text-white text-xl"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        {/* Rarity Filters */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Rarity
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showCommon}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showCommon: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-gray-400">Common</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showShiny}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showShiny: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-yellow-400">Shiny ✨</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={fleetFilters.showUnavailable}
                                onChange={(e) =>
                                  setFleetFilters((prev) => ({
                                    ...prev,
                                    showUnavailable: e.target.checked,
                                  }))
                                }
                                className="mr-2"
                              />
                              <span className="text-orange-400">
                                Show Unavailable
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Cost Range */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Cost Range
                          </label>
                          <div className="space-y-1">
                            <input
                              type="number"
                              placeholder="Min"
                              value={fleetFilters.minCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  minCost: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={fleetFilters.maxCost}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  maxCost: parseInt(e.target.value) || 10000,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            />
                          </div>
                        </div>

                        {/* Equipment Filters */}
                        <div>
                          <label className="block text-gray-400 mb-1">
                            Equipment
                          </label>
                          <div className="space-y-1">
                            <select
                              value={fleetFilters.weaponType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  weaponType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            >
                              <option value="all">All Weapons</option>
                              <option value="laser">Laser</option>
                              <option value="cannon">Cannon</option>
                              <option value="plasma">Plasma</option>
                              <option value="missile">Missile</option>
                            </select>
                            <select
                              value={fleetFilters.defenseType}
                              onChange={(e) =>
                                setFleetFilters((prev) => ({
                                  ...prev,
                                  defenseType: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-xs"
                            >
                              <option value="all">All Defense</option>
                              <option value="shield">Shields</option>
                              <option value="armor">Armor</option>
                            </select>
                          </div>
                        </div>

                        {/* Trait Filters */}
                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Accuracy: {fleetFilters.minAccuracy} -{" "}
                            {fleetFilters.maxAccuracy}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxAccuracy -
                                    fleetFilters.minAccuracy) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minAccuracy")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxAccuracy / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxAccuracy")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Poor (0)</span>
                            <span className="font-medium">Average (1)</span>
                            <span className="font-medium">Excellent (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Hull: {fleetFilters.minHull} -{" "}
                            {fleetFilters.maxHull}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxHull -
                                    fleetFilters.minHull) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minHull")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxHull / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxHull")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Weak (0)</span>
                            <span className="font-medium">Standard (1)</span>
                            <span className="font-medium">Reinforced (2)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-2 font-medium">
                            Speed: {fleetFilters.minSpeed} -{" "}
                            {fleetFilters.maxSpeed}
                          </label>
                          <div className="range-slider-container">
                            <div className="range-slider-track"></div>
                            <div
                              className="range-slider-fill"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                                width: `calc(${
                                  ((fleetFilters.maxSpeed -
                                    fleetFilters.minSpeed) /
                                    2) *
                                  (100 - 4.5)
                                }%)`,
                              }}
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.minSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "minSpeed")
                              }
                            ></div>
                            <div
                              className="range-slider-thumb"
                              style={{
                                left: `calc(10px + ${
                                  (fleetFilters.maxSpeed / 2) * (100 - 4.5)
                                }%)`,
                              }}
                              onMouseDown={(e) =>
                                handleThumbMouseDown(e, "maxSpeed")
                              }
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                            <span className="font-medium">Slow (0)</span>
                            <span className="font-medium">Normal (1)</span>
                            <span className="font-medium">Fast (2)</span>
                          </div>
                        </div>

                        {/* In-Game Properties Toggle */}
                        <div className="col-span-2 md:col-span-3">
                          <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showInGameProperties}
                              onChange={(e) =>
                                setShowInGameProperties(e.target.checked)
                              }
                              className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
                            />
                            <span className="text-sm font-bold text-cyan-400">
                              IN-GAME PROPERTIES
                              {isFromCache && (
                                <span className="text-xs text-green-400 ml-1">
                                  (cached)
                                </span>
                              )}
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-xs">
                        <span className="text-gray-400">
                          Showing {filteredShips.length} of {ships.length} ships
                        </span>
                        <button
                          onClick={() =>
                            setFleetFilters({
                              showShiny: true,
                              showCommon: true,
                              showUnavailable: false,
                              minCost: 0,
                              maxCost: 10000,
                              minAccuracy: 0,
                              maxAccuracy: 2,
                              minHull: 0,
                              maxHull: 2,
                              minSpeed: 0,
                              maxSpeed: 2,
                              weaponType: "all",
                              defenseType: "all",
                              specialType: "all",
                            })
                          }
                          className="text-cyan-400 hover:text-cyan-300 underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {shipsLoading ? (
                  <div className="text-center text-gray-400 flex-1 flex items-center justify-center">
                    Loading ships...
                  </div>
                ) : (
                  <div className="flex gap-4 flex-1">
                    {isCreator ? (
                      <>
                        {/* Ship Selection Grid - 1/4 width */}
                        <div className="w-1/4 h-full">
                          <div className="grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh]">
                            {filteredShips
                              .sort((a, b) => {
                                // Selected ships first
                                const aSelected = selectedShips.includes(a.id);
                                const bSelected = selectedShips.includes(b.id);

                                if (aSelected && !bSelected) return -1;
                                if (!aSelected && bSelected) return 1;

                                // Within each group, sort by ship ID
                                return Number(a.id - b.id);
                              })
                              .map((ship) => {
                                const canSelect =
                                  ship.shipData.timestampDestroyed === 0n &&
                                  ship.shipData.constructed &&
                                  !ship.shipData.inFleet;

                                const handleCardClick = () => {
                                  if (!canSelect) return;
                                  if (selectedShips.includes(ship.id)) {
                                    removeShipFromFleet(ship.id);
                                  } else {
                                    addShipToFleet(ship.id);
                                  }
                                };

                                return (
                                  <div
                                    key={ship.id.toString()}
                                    draggable={canSelect}
                                    onDragStart={(e) => {
                                      if (canSelect) {
                                        handleDragStart(ship.id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }
                                    }}
                                    onDragEnd={handleDragEnd}
                                    className={canSelect ? "cursor-move" : ""}
                                  >
                                    <ShipCard
                                      ship={ship}
                                      isStarred={false}
                                      onToggleStar={() => {}}
                                      isSelected={selectedShips.includes(ship.id)}
                                      onToggleSelection={() => {
                                        if (canSelect) {
                                          handleCardClick();
                                        }
                                      }}
                                      onRecycleClick={() => {}}
                                      showInGameProperties={showInGameProperties}
                                      inGameAttributes={attributesMap.get(
                                        ship.id
                                      )}
                                      attributesLoading={attributesLoading}
                                      selectionMode={true}
                                      hideRecycle={true}
                                      hideCheckbox={true}
                                      onCardClick={handleCardClick}
                                      canSelect={canSelect}
                                      flipShip={isCreator}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Map Display - 3/4 width */}
                        <div className="w-3/4 h-full flex items-center justify-center">
                          {/* Map Display */}
                          {currentLobby && (
                            <MapDisplay
                              mapId={Number(
                                currentLobby.gameConfig.selectedMapId
                              )}
                              className="w-full h-full"
                              showPlayerOverlay={true}
                              isCreator={currentLobby.basic.creator === address}
                              isCreatorViewer={
                                currentLobby.basic.creator === address
                              }
                              shipPositions={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentPositions
                                  : combinedPositions
                              }
                              ships={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentShips
                                  : combinedShips
                              }
                              shipAttributes={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? (opponentViewAttributes as Attributes[])
                                  : (combinedAttributes as Attributes[])
                              }
                              selectedShipId={selectedShipId}
                              onShipSelect={handleShipSelect}
                              onShipMove={handleShipMove}
                              allowSelection={
                                !(
                                  showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner
                                )
                              }
                              selectableShipIds={selectableShipIds}
                              flippedShipIds={flippedShipIds as bigint[]}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              dragOverPosition={dragOverPosition}
                            />
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Map Display - 3/4 width (left for joiner) */}
                        <div className="w-3/4 h-full flex items-center justify-center">
                          {/* Map Display */}
                          {currentLobby && (
                            <MapDisplay
                              mapId={Number(
                                currentLobby.gameConfig.selectedMapId
                              )}
                              className="w-full h-full"
                              showPlayerOverlay={true}
                              isCreator={currentLobby.basic.creator === address}
                              isCreatorViewer={
                                currentLobby.basic.creator === address
                              }
                              shipPositions={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentPositions
                                  : combinedPositions
                              }
                              ships={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? opponentShips
                                  : combinedShips
                              }
                              shipAttributes={
                                showFleetView &&
                                viewingFleetOwner &&
                                viewingFleetId
                                  ? (opponentViewAttributes as Attributes[])
                                  : (combinedAttributes as Attributes[])
                              }
                              selectedShipId={selectedShipId}
                              onShipSelect={handleShipSelect}
                              onShipMove={handleShipMove}
                              allowSelection={
                                !(
                                  showFleetView &&
                                  viewingFleetId &&
                                  viewingFleetOwner
                                )
                              }
                              selectableShipIds={selectableShipIds}
                              flippedShipIds={flippedShipIds as bigint[]}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              dragOverPosition={dragOverPosition}
                            />
                          )}
                        </div>

                        {/* Ship Selection Grid - 1/4 width (right for joiner) */}
                        <div className="w-1/4 h-full">
                          <div className="grid grid-cols-1 gap-4 mb-6 overflow-y-auto content-start max-h-[80vh]">
                            {filteredShips
                              .sort((a, b) => {
                                // Selected ships first
                                const aSelected = selectedShips.includes(a.id);
                                const bSelected = selectedShips.includes(b.id);

                                if (aSelected && !bSelected) return -1;
                                if (!aSelected && bSelected) return 1;

                                // Within each group, sort by ship ID
                                return Number(a.id - b.id);
                              })
                              .map((ship) => {
                                const canSelect =
                                  ship.shipData.timestampDestroyed === 0n &&
                                  ship.shipData.constructed &&
                                  !ship.shipData.inFleet;

                                const handleCardClick = () => {
                                  if (!canSelect) return;
                                  if (selectedShips.includes(ship.id)) {
                                    removeShipFromFleet(ship.id);
                                  } else {
                                    addShipToFleet(ship.id);
                                  }
                                };

                                return (
                                  <div
                                    key={ship.id.toString()}
                                    draggable={canSelect}
                                    onDragStart={(e) => {
                                      if (canSelect) {
                                        handleDragStart(ship.id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }
                                    }}
                                    onDragEnd={handleDragEnd}
                                    className={canSelect ? "cursor-move" : ""}
                                  >
                                    <ShipCard
                                      ship={ship}
                                      isStarred={false}
                                      onToggleStar={() => {}}
                                      isSelected={selectedShips.includes(ship.id)}
                                      onToggleSelection={() => {
                                        if (canSelect) {
                                          handleCardClick();
                                        }
                                      }}
                                      onRecycleClick={() => {}}
                                      showInGameProperties={showInGameProperties}
                                      inGameAttributes={attributesMap.get(
                                        ship.id
                                      )}
                                      attributesLoading={attributesLoading}
                                      selectionMode={true}
                                      hideRecycle={true}
                                      hideCheckbox={true}
                                      onCardClick={handleCardClick}
                                      canSelect={canSelect}
                                      flipShip={isCreator}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Fleet Cost Confirmation Dialog */}
      {showFleetConfirmation &&
        selectedLobby &&
        (() => {
          const currentLobby = lobbyList.lobbies.find(
            (lobby) => lobby.basic.id === selectedLobby
          );
          const totalCost = selectedShips.reduce((sum, shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            return sum + (ship ? Number(ship.shipData.cost) : 0);
          }, 0);
          const costLimit = currentLobby
            ? Number(currentLobby.basic.costLimit)
            : 1000;

          return (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60">
              <div className="bg-black border border-yellow-400 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">
                    FLEET COST WARNING
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Your fleet cost ({totalCost}) is less than 90% of the
                    maximum ({costLimit}). You&apos;re only using{" "}
                    {Math.round((totalCost / costLimit) * 100)}% of your
                    available budget.
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    Consider adding more ships to maximize your fleet&apos;s
                    potential, or proceed with your current selection.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFleetConfirmation(false)}
                      className="flex-1 px-4 py-2 border border-gray-400 text-gray-400 rounded hover:bg-gray-400/20"
                    >
                      GO BACK
                    </button>
                    <button
                      onClick={() => createFleetWithConfirmation(selectedLobby)}
                      disabled={isCreatingFleet}
                      className="flex-1 px-4 py-2 border border-yellow-400 text-yellow-400 rounded hover:bg-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingFleet ? "CREATING..." : "CONFIRM FLEET"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Fleet View Modal */}
      {showFleetView && viewingFleetId && viewingFleetOwner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60">
          <div className="bg-black border border-cyan-400 rounded-lg p-6 max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-bold text-cyan-400">
                FLEET #{viewingFleetId.toString()}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowFleetView(false);
                    setViewingFleetId(null);
                    setViewingFleetOwner(null);
                  }}
                  className="px-4 py-2 border border-gray-400 text-gray-400 rounded hover:bg-gray-400/20"
                >
                  CLOSE
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-black/40 border border-gray-600 rounded">
              <p className="text-sm text-gray-300">
                <span className="text-cyan-400">Owner:</span>{" "}
                {viewingFleetOwner.slice(0, 6)}...{viewingFleetOwner.slice(-4)}
                {address &&
                  viewingFleetOwner.toLowerCase() === address.toLowerCase() && (
                    <span className="ml-2 text-cyan-400 font-bold">(You)</span>
                  )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {fleetShipIdsLoading || fleetShipsLoading ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-lg mb-2">Loading Fleet...</p>
                  <p className="text-sm">Fetching ship data...</p>
                </div>
              ) : fleetShips &&
                Array.isArray(fleetShips) &&
                fleetShips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fleetShips.map((ship: unknown, index: number) => {
                    const shipData = ship as Ship;
                    return (
                      <div
                        key={shipData.id?.toString() || index}
                        className="border rounded-lg p-4 bg-black/40 border-gray-600"
                      >
                        {/* Ship Image */}
                        <div className="mb-3">
                          <ShipImage
                            key={`fleet-${shipData.id?.toString() || index}-${
                              shipData.shipData?.constructed
                                ? "constructed"
                                : "unconstructed"
                            }`}
                            ship={shipData}
                            className="w-full h-32 rounded border border-gray-600"
                            showLoadingState={true}
                          />
                        </div>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm">
                              {shipData.name || `Ship #${shipData.id}`}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                shipData.shipData?.shiny
                                  ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                                  : "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                              }`}
                            >
                              {shipData.shipData?.shiny ? "SHINY ✨" : "COMMON"}
                            </span>
                            {/* Rank */}
                            {shipData.shipData?.constructed && (
                              <span
                                className={`text-xs px-2 py-1 rounded border ${getRankColor(
                                  calculateShipRank(shipData).rank
                                )}`}
                              >
                                R{calculateShipRank(shipData).rank}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ship Stats */}
                        {shipData.shipData?.constructed ? (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="opacity-60">Acc:</span>
                              <span className="ml-2">
                                {shipData.traits?.accuracy || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Hull:</span>
                              <span className="ml-2">
                                {shipData.traits?.hull || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Speed:</span>
                              <span className="ml-2">
                                {shipData.traits?.speed || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Cost:</span>
                              <span className="ml-2">
                                {shipData.shipData?.cost || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Wpn:</span>
                              <span className="ml-2">
                                {getMainWeaponName(
                                  shipData.equipment?.mainWeapon || 0
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">
                                {shipData.equipment?.shields > 0
                                  ? "Shd:"
                                  : "Arm:"}
                              </span>
                              <span className="ml-2">
                                {shipData.equipment?.shields > 0
                                  ? getShieldName(shipData.equipment.shields)
                                  : getArmorName(
                                      shipData.equipment?.armor || 0
                                    )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="opacity-60">Spc:</span>
                              <span className="ml-2">
                                {getSpecialName(
                                  shipData.equipment?.special || 0
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="opacity-60">Status:</span>
                              <span className="ml-2 text-green-400">READY</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-yellow-400 text-sm">
                            {shipData.shipData?.timestampDestroyed > 0n
                              ? `DESTROYED ${formatDestroyedDate(shipData.shipData.timestampDestroyed)}`
                              : "UNDER CONSTRUCTION"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-lg mb-2">No Ships Found</p>
                  <p className="text-sm">
                    This fleet appears to be empty or the data could not be
                    loaded.
                  </p>
                  <p className="text-xs mt-2 text-gray-500">
                    Fleet ID: {viewingFleetId?.toString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobbies;
