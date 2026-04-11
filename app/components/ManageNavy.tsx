"use client";

import React, { useEffect } from "react";
import {
  useOwnedShips,
  useShipDetails,
  useContractEvents,
  useFreeShipClaiming,
  clearShipImageCacheForShip,
  clearBrokenImageCache,
  clearAllShipImageCache,
  resetAllShipRequestStates,
  clearAllShipRetryTimeouts,
  restartQueueProcessing,
  getQueueStatus,
  clearCacheOnLogout,
} from "../hooks";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { Ship } from "../types/types";
import ShipPurchaseInterface from "./ShipPurchaseInterface";
import { FreeShipClaimButton } from "./FreeShipClaimButton";
import { ShipActionButton } from "./ShipActionButton";
import ShipCard from "./ShipCard";
import { useTransaction } from "../providers/TransactionContext";
import { useShipsRead } from "../hooks/useShipsContract";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { useCurrentCostsVersion } from "../hooks/useShipAttributesContract";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { fetchAndPersistShipAttributesCaches } from "../utils/shipAttributesLocalCache";
import {
  dismissBuyShipsTutorialForSession,
  dismissConstructDeliveryTutorialForSession,
  dismissDroneFactoryTutorialForSession,
  hasCompletedBuyShipsTutorial,
  hasCompletedConstructDeliveryTutorial,
  hasEverClickedFreeShipClaim,
  isBuyShipsTutorialSessionDismissed,
  isConstructDeliveryTutorialSessionDismissed,
  isDroneFactoryTutorialSessionDismissed,
  persistBuyShipsTutorialCompleted,
  persistConstructDeliveryTutorialCompleted,
  persistFreeShipClaimClicked,
} from "../utils/freeShipClaimTutorialStorage";

/** Same typography as `TutorialGridTaskPanel` brief body. */
const MANAGE_NAVY_TUTORIAL_MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
};

/** Matches construct-all UI: batch cap when there are more than this many targets. */
const STALE_COST_SYNC_BATCH_CAP = 150;

function ManageNavyDroneFactoryBrief({
  onNotNow,
  className = "",
}: {
  onNotNow: () => void;
  /** e.g. absolute positioning so the panel does not shift the three-button row */
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto flex min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 border-cyan-400/90 bg-[#0f172a] p-3 shadow-lg shadow-cyan-500/15 ${className}`}
      style={{
        borderRadius: 0,
      }}
      role="region"
      aria-label="Drone factory briefing"
    >
      <h3
        className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan-300"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        }}
      >
        Drone factories online
      </h3>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gray-700">
        <div
          className="h-1 bg-cyan-400 transition-all duration-300"
          style={{ width: "33%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-gray-200 whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, your faction has access to drone-based factories that stay hard at work producing new ships.

The drones make ships efficiently, but they are not very responsive when you demand exact specifications. In any given run you never know what they will produce.

Use the highlighted [CLAIM FREE SHIPS] control to draw from the next production batch.`}
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onNotNow}
          className="px-2 py-0.5 text-sm bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 whitespace-nowrap"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}

function ManageNavyConstructDeliveryBrief({
  onNotNow,
  constructButtonLabel,
  className = "",
}: {
  onNotNow: () => void;
  constructButtonLabel: "[CONSTRUCT ALL SHIPS]" | "[CONSTRUCT 150 SHIPS]";
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto flex min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 border-cyan-400/90 bg-[#0f172a] p-3 shadow-lg shadow-cyan-500/15 ${className}`}
      style={{
        borderRadius: 0,
      }}
      role="region"
      aria-label="Construct delivery briefing"
    >
      <h3
        className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan-300"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        }}
      >
        Ready for delivery
      </h3>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gray-700">
        <div
          className="h-1 bg-cyan-400 transition-all duration-300"
          style={{ width: "66%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-gray-200 whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, your new ships are staged for fit and finishing. The yard will not release them until you give the word.

Tell the drones you are ready for delivery with the highlighted ${constructButtonLabel} control.`}
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onNotNow}
          className="px-2 py-0.5 text-sm bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 whitespace-nowrap"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}

function ManageNavyBuyShipsBrief({
  onNotNow,
  className = "",
}: {
  onNotNow: () => void;
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto flex min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 border-cyan-400/90 bg-[#0f172a] p-3 shadow-lg shadow-cyan-500/15 ${className}`}
      style={{
        borderRadius: 0,
      }}
      role="region"
      aria-label="Buy ships briefing"
    >
      <h3
        className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan-300"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        }}
      >
        Materials and energy
      </h3>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gray-700">
        <div
          className="h-1 bg-cyan-400 transition-all duration-300"
          style={{ width: "100%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-gray-200 whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, you can order more hulls from the drone yards by supplying them with materials and energy.

Big orders make the drones happy. The more hulls you order in one go, the higher the guaranteed floor on quality you can expect.`}
      </p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onNotNow}
          className="px-2 py-0.5 text-sm bg-gray-700 text-gray-300 rounded-none font-mono hover:bg-gray-600 whitespace-nowrap"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}

const ManageNavy: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const shipsContractAddress = React.useMemo(
    () => getContractAddresses(chainId).SHIPS as `0x${string}`,
    [chainId],
  );
  const shipAttributesContractAddress = React.useMemo(
    () => getContractAddresses(chainId).SHIP_ATTRIBUTES as `0x${string}`,
    [chainId],
  );
  const publicClient = usePublicClient();
  const { transactionState } = useTransaction();
  const { ships, isLoading, error, hasShips, shipCount, refetch } =
    useOwnedShips();
  const { fleetStats, shipsByStatus } = useShipDetails();

  // Read the recycle reward amount from the contract
  const { data: recycleReward } = useShipsRead("recycleReward");

  const { data: currentCostsVersion } = useCurrentCostsVersion();
  const globalCostsVersion =
    currentCostsVersion !== undefined && currentCostsVersion !== null
      ? Number(currentCostsVersion)
      : null;

  const staleCostSyncShipIds = React.useMemo(() => {
    if (globalCostsVersion === null) return [] as bigint[];
    return ships
      .filter((ship) => {
        const shipCv = Number(ship.shipData.costsVersion);
        return (
          ship.shipData.constructed &&
          ship.shipData.timestampDestroyed === 0n &&
          !ship.shipData.inFleet &&
          shipCv !== globalCostsVersion
        );
      })
      .map((s) => s.id);
  }, [ships, globalCostsVersion]);

  // Read the user's purchase count
  const { data: amountPurchased } = useShipsRead(
    "amountPurchased",
    address ? [address] : undefined,
  );

  // Get ship attributes for in-game properties
  const shipIds = ships.map((ship) => ship.id);
  const shipIdsRef = React.useRef(shipIds);
  React.useEffect(() => {
    shipIdsRef.current = shipIds;
  }, [shipIds]);

  const afterShipCostSyncPersistCaches = React.useCallback(() => {
    if (!publicClient) return;
    void fetchAndPersistShipAttributesCaches(publicClient, {
      chainId,
      shipAttributesAddress: shipAttributesContractAddress,
      shipIds: shipIdsRef.current,
    });
  }, [publicClient, chainId, shipAttributesContractAddress]);

  const {
    attributes: shipAttributes,
    isLoading: attributesLoading,
    isFromCache,
  } = useShipAttributesByIds(shipIds);

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

  // Check if user can recycle (minimum 10 purchases required)
  const canRecycle = amountPurchased ? Number(amountPurchased) >= 10 : false;

  // Note: Ship actions are now handled by ShipActionButton components

  // Check if wallet is connecting
  const isConnecting = status === "connecting" || status === "reconnecting";

  // Free ship claiming functionality
  const {
    isEligible,
    error: freeShipError,
    claimStatusError,
    isLoadingClaimStatus,
    nextClaimInFormatted,
  } = useFreeShipClaiming();

  const [showDroneFactoryTutorial, setShowDroneFactoryTutorial] =
    React.useState(false);

  const markFreeShipClaimClickedForTutorial = React.useCallback(() => {
    if (!address) return;
    persistFreeShipClaimClicked(address, chainId);
    setShowDroneFactoryTutorial(false);
  }, [address, chainId]);

  const dismissDroneFactoryTutorialNotNow = React.useCallback(() => {
    dismissDroneFactoryTutorialForSession();
    setShowDroneFactoryTutorial(false);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (hasEverClickedFreeShipClaim(address, chainId)) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialSessionDismissed()) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    setShowDroneFactoryTutorial(true);
  }, [address, chainId, isConnected]);

  const [showConstructDeliveryTutorial, setShowConstructDeliveryTutorial] =
    React.useState(false);

  const dismissConstructDeliveryTutorialNotNow = React.useCallback(() => {
    dismissConstructDeliveryTutorialForSession();
    setShowConstructDeliveryTutorial(false);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isLoading) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasShips) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasEverClickedFreeShipClaim(address, chainId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (hasCompletedConstructDeliveryTutorial(address, chainId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isConstructDeliveryTutorialSessionDismissed()) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (fleetStats.unconstructedShips === 0) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    setShowConstructDeliveryTutorial(true);
  }, [
    address,
    chainId,
    isConnected,
    isLoading,
    hasShips,
    fleetStats.unconstructedShips,
  ]);

  /**
   * After navy data is loaded, if nothing is left unconstructed, mark this step done.
   * Must not run while loading: unconstructed reads as 0 when `ships` is still empty, which
   * used to persist "completed" immediately and hide the panel forever.
   */
  React.useEffect(() => {
    if (typeof window === "undefined" || !address) return;
    if (isLoading) return;
    if (!hasShips) return;
    if (!hasEverClickedFreeShipClaim(address, chainId)) return;
    if (hasCompletedConstructDeliveryTutorial(address, chainId)) return;
    if (fleetStats.unconstructedShips > 0) return;
    persistConstructDeliveryTutorialCompleted(address, chainId);
  }, [
    address,
    chainId,
    fleetStats.unconstructedShips,
    isLoading,
    hasShips,
  ]);

  const [showBuyShipsTutorial, setShowBuyShipsTutorial] = React.useState(false);

  const dismissBuyShipsTutorialNotNow = React.useCallback(() => {
    dismissBuyShipsTutorialForSession();
    setShowBuyShipsTutorial(false);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isLoading) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (!hasShips) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (!hasCompletedConstructDeliveryTutorial(address, chainId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (hasCompletedBuyShipsTutorial(address, chainId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isBuyShipsTutorialSessionDismissed()) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (fleetStats.unconstructedShips > 0) {
      setShowBuyShipsTutorial(false);
      return;
    }
    setShowBuyShipsTutorial(true);
  }, [
    address,
    chainId,
    isConnected,
    isLoading,
    hasShips,
    fleetStats.unconstructedShips,
  ]);

  const showManageNavyTutorialChrome =
    showDroneFactoryTutorial ||
    showConstructDeliveryTutorial ||
    showBuyShipsTutorial;

  // Phase 3: Real-time updates
  const { isListening } = useContractEvents();

  // Clear cache when user disconnects
  useEffect(() => {
    if (!address) {
      clearCacheOnLogout();
    }
  }, [address]);

  // State for ship selection and filtering
  const [selectedShips, setSelectedShips] = React.useState<Set<string>>(
    new Set(),
  );
  const [filterStatus, setFilterStatus] = React.useState<
    "all" | "constructed" | "unconstructed" | "starred"
  >("all");
  const [sortBy, setSortBy] = React.useState<
    "id" | "cost" | "accuracy" | "hull" | "speed"
  >("id");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [showDebugButtons, setShowDebugButtons] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  // State for starred ships
  const [starredShips, setStarredShips] = React.useState<Set<string>>(
    new Set(),
  );
  const [showShipPurchase, setShowShipPurchase] = React.useState(false);

  const handleBuyNewShipsClick = React.useCallback(() => {
    if (address && showBuyShipsTutorial) {
      persistBuyShipsTutorialCompleted(address, chainId);
      setShowBuyShipsTutorial(false);
    }
    setShowShipPurchase(true);
  }, [address, chainId, showBuyShipsTutorial]);

  const [paymentMethod, setPaymentMethod] = React.useState<"FLOW" | "UTC">(
    "FLOW",
  );
  const [showRecycleModal, setShowRecycleModal] = React.useState(false);
  const [shipToRecycle, setShipToRecycle] = React.useState<Ship | null>(null);

  // Load starred ships from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("void-tactics-starred-ships");
    if (saved) {
      try {
        const starredArray = JSON.parse(saved);
        setStarredShips(new Set(starredArray));
      } catch (error) {
        console.error("Error loading starred ships:", error);
      }
    }
  }, []);

  // Save starred ships to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem(
      "void-tactics-starred-ships",
      JSON.stringify(Array.from(starredShips)),
    );
  }, [starredShips]);

  // Toggle star status for a ship
  const toggleStar = (shipId: string) => {
    setStarredShips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shipId)) {
        newSet.delete(shipId);
      } else {
        newSet.add(shipId);
      }
      return newSet;
    });
  };

  // Filter and sort ships
  const filteredAndSortedShips = React.useMemo(() => {
    let filtered = ships;

    // Apply status filter
    if (filterStatus === "constructed") {
      filtered = filtered.filter((ship) => ship.shipData.constructed);
    } else if (filterStatus === "unconstructed") {
      filtered = filtered.filter((ship) => !ship.shipData.constructed);
    } else if (filterStatus === "starred") {
      filtered = filtered.filter((ship) =>
        starredShips.has(ship.id.toString()),
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: number | bigint;
      let bValue: number | bigint;

      switch (sortBy) {
        case "cost":
          aValue = a.shipData.cost;
          bValue = b.shipData.cost;
          break;
        case "accuracy":
          aValue = a.traits.accuracy;
          bValue = b.traits.accuracy;
          break;
        case "hull":
          aValue = a.traits.hull;
          bValue = b.traits.hull;
          break;
        case "speed":
          aValue = a.traits.speed;
          bValue = b.traits.speed;
          break;
        default: // 'id'
          aValue = a.id;
          bValue = b.id;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [ships, filterStatus, sortBy, sortOrder, starredShips]);

  // Handle ship selection
  const toggleShipSelection = (shipId: string) => {
    const newSelected = new Set(selectedShips);
    if (newSelected.has(shipId)) {
      newSelected.delete(shipId);
    } else {
      newSelected.add(shipId);
    }
    setSelectedShips(newSelected);
  };

  // Handle recycle confirmation
  const handleRecycleClick = (ship: Ship) => {
    setShipToRecycle(ship);
    setShowRecycleModal(true);
  };

  const handleRecycleCancel = () => {
    setShowRecycleModal(false);
    setShipToRecycle(null);
  };

  // Handle bulk actions - now handled by ShipActionButton components

  const handleSelectAll = () => {
    if (selectedShips.size === filteredAndSortedShips.length) {
      setSelectedShips(new Set());
    } else {
      setSelectedShips(
        new Set(filteredAndSortedShips.map((ship) => ship.id.toString())),
      );
    }
  };

  const shipGridRef = React.useRef<HTMLDivElement>(null);
  const [nameBlockMinHeights, setNameBlockMinHeights] = React.useState<
    Record<string, number>
  >({});

  const shipsLayoutKey = React.useMemo(
    () =>
      [
        filteredAndSortedShips.map((s) => s.id.toString()).join("\0"),
        showInGameProperties ? "ig" : "nft",
      ].join("|"),
    [filteredAndSortedShips, showInGameProperties],
  );

  const measureShipNameRowHeights = React.useCallback(() => {
    const grid = shipGridRef.current;
    if (!grid) return;

    const children = [...grid.children] as HTMLElement[];
    const rowMap = new Map<number, { ids: string[]; heights: number[] }>();

    for (const el of children) {
      const id = el.dataset.shipId;
      if (!id) continue;
      const block = el.querySelector(
        "[data-ship-name-block]",
      ) as HTMLElement | null;
      if (!block) continue;
      const top = el.offsetTop;
      if (!rowMap.has(top)) {
        rowMap.set(top, { ids: [], heights: [] });
      }
      const g = rowMap.get(top)!;
      g.ids.push(id);
      g.heights.push(Math.round(block.getBoundingClientRect().height));
    }

    /** Name row is star + title; one line is typically under this (px). */
    const singleLineBlockMaxPx = 52;
    const next: Record<string, number> = {};

    for (const { ids, heights } of rowMap.values()) {
      if (ids.length === 0) continue;
      const minH = Math.min(...heights);
      const maxH = Math.max(...heights);
      const rowHasMultilineOrMixed =
        maxH > singleLineBlockMaxPx || maxH > minH + 8;
      if (!rowHasMultilineOrMixed) continue;
      for (const sid of ids) {
        next[sid] = maxH;
      }
    }

    setNameBlockMinHeights((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const k of nextKeys) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!hasShips) {
      setNameBlockMinHeights({});
      return;
    }
    setNameBlockMinHeights({});
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;
    raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      measureShipNameRowHeights();
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        measureShipNameRowHeights();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hasShips, shipsLayoutKey, measureShipNameRowHeights]);

  React.useEffect(() => {
    if (!hasShips) return;
    const grid = shipGridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => measureShipNameRowHeights());
    ro.observe(grid);
    window.addEventListener("resize", measureShipNameRowHeights);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureShipNameRowHeights);
    };
  }, [hasShips, shipsLayoutKey, measureShipNameRowHeights]);

  if (!address || !isConnected) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <p className="text-lg opacity-80">
          Please connect your wallet to view your navy
        </p>
        <div className="mt-4 text-sm text-cyan-400">
          <p>Address: {address || "undefined"}</p>
          <p>Connected: {isConnected ? "yes" : "no"}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-3">Loading navy data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <p className="text-red-400 text-lg">
          Error loading navy: {error.message}
        </p>
      </div>
    );
  }

  // Show loading state while wallet is connecting
  if (isConnecting) {
    return (
      <div className="text-center text-cyan-400 font-mono">
        <div className="text-xl mb-4">Connecting to wallet...</div>
        <div className="text-sm text-cyan-400/60">
          Please wait while we establish your connection
        </div>
      </div>
    );
  }

  const constructTutorialButtonLabel =
    fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP
      ? ("[CONSTRUCT 150 SHIPS]" as const)
      : ("[CONSTRUCT ALL SHIPS]" as const);

  const claimFreeShipControls = (
    <div className="flex flex-nowrap items-center justify-center gap-4">
      {isLoadingClaimStatus && (
        <button
          disabled
          className="px-6 py-3 rounded-none border-2 border-gray-400 text-gray-400 font-mono font-bold tracking-wider opacity-50 cursor-not-allowed"
        >
          [CHECKING ELIGIBILITY...]
        </button>
      )}
      {!isLoadingClaimStatus && freeShipError && (
        <button
          disabled
          className="px-6 py-3 rounded-none border-2 border-red-400 text-red-400 font-mono font-bold tracking-wider opacity-50 cursor-not-allowed"
        >
          [ERROR CLAIMING]
        </button>
      )}
      {!isLoadingClaimStatus && !freeShipError && claimStatusError && (
        <FreeShipClaimButton
          isEligible={true}
          className="px-6 py-3 rounded-none border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onPress={markFreeShipClaimClickedForTutorial}
          onSuccess={() => {
            refetch();
          }}
        >
          [TRY CLAIM FREE SHIPS]
        </FreeShipClaimButton>
      )}
      {!isLoadingClaimStatus &&
        !freeShipError &&
        !claimStatusError &&
        isEligible && (
          <FreeShipClaimButton
            isEligible={isEligible}
            className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onPress={markFreeShipClaimClickedForTutorial}
            onSuccess={() => {
              refetch();
            }}
          >
            [CLAIM FREE SHIPS]
          </FreeShipClaimButton>
        )}
      {!isLoadingClaimStatus &&
        !freeShipError &&
        !claimStatusError &&
        !isEligible &&
        nextClaimInFormatted != null && (
          <div
            className="px-6 py-3 rounded-none border-2 border-amber-400/80 text-amber-400 font-mono font-bold tracking-wider bg-amber-400/5"
            title="Time until you can claim free ships again"
          >
            NEXT CLAIM IN: {nextClaimInFormatted}
          </div>
        )}
    </div>
  );

  const staleCostBulkButton =
    staleCostSyncShipIds.length === 0 ? null : (
      <TransactionButton
        transactionId="manage-navy-sync-stale-costs-bulk"
        contractAddress={shipsContractAddress}
        abi={CONTRACT_ABIS.SHIPS as Abi}
        functionName="syncShipCosts"
        args={[
          staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
            ? staleCostSyncShipIds.slice(0, STALE_COST_SYNC_BATCH_CAP)
            : staleCostSyncShipIds,
        ]}
        disabled={transactionState.isPending}
        className="px-6 py-3 rounded-none border-2 border-amber-400 text-amber-400 hover:border-amber-300 hover:text-amber-300 hover:bg-amber-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0 }}
        onSuccess={() => {
          toast.success(
            staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
              ? "150 ships cost version update started!"
              : "Ship cost versions updated!",
          );
          afterShipCostSyncPersistCaches();
          setTimeout(() => refetch(), 1000);
        }}
        onError={() => {
          toast.error("Failed to update ship cost versions");
        }}
      >
        {staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
          ? "[UPDATE 150 SHIPS]"
          : "[UPDATE ALL SHIPS]"}
      </TransactionButton>
    );

  return (
    <div
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        color: "var(--color-text-primary)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3
            className="text-2xl font-bold tracking-wider uppercase"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              color: "var(--color-text-primary)",
            }}
          >
            [MANAGE NAVY]
          </h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showDebugButtons}
              onChange={(e) => setShowDebugButtons(e.target.checked)}
              className="w-4 h-4"
              style={{
                accentColor: "var(--color-cyan)",
                borderColor: "var(--color-cyan)",
                backgroundColor: "var(--color-near-black)",
                borderRadius: 0,
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                width: "16px",
                height: "16px",
                border: "2px solid",
              }}
            />
            <span style={{ color: "var(--color-text-secondary)" }}>
              Debug Mode
            </span>
          </label>
        </div>

        {/* Real-time Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2"
              style={{
                backgroundColor: isListening
                  ? "var(--color-phosphor-green)"
                  : "var(--color-warning-red)",
                animation: isListening
                  ? "pulse-functional 1.5s ease-in-out infinite"
                  : "none",
              }}
            ></div>
            <span
              className="text-xs uppercase font-semibold tracking-wider"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                color: isListening
                  ? "var(--color-phosphor-green)"
                  : "var(--color-warning-red)",
              }}
            >
              {isListening ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: same three-button row with or without tutorial; brief is absolute (no layout shift). When tutorial is on, stack above ship grid so art does not cover the panel. */}
      <div
        className={`relative isolate mb-8 flex w-full flex-wrap items-center justify-center gap-4 overflow-visible ${
          showManageNavyTutorialChrome ? "z-[200]" : ""
        }`}
      >
        {showConstructDeliveryTutorial ? (
          <div className="relative inline-flex items-start gap-4">
            {/* Same pattern as claim tutorial: brief is absolute beside the highlighted control; here to the RIGHT of construct */}
            <div className="relative z-[100] shrink-0">
              <div
                className="border border-yellow-400/90 bg-yellow-400/24 animate-pulse p-[3px]"
                style={{ borderRadius: 0 }}
              >
                <div className="flex flex-nowrap items-center justify-center gap-4">
                  {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                    <ShipActionButton
                      action="constructShips"
                      shipIds={shipsByStatus.unconstructed
                        .slice(0, STALE_COST_SYNC_BATCH_CAP)
                        .map((ship: Ship) => ship.id)}
                      className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={fleetStats.unconstructedShips === 0}
                      onSuccess={() => {
                        if (address) {
                          persistConstructDeliveryTutorialCompleted(
                            address,
                            chainId,
                          );
                          setShowConstructDeliveryTutorial(false);
                        }
                        toast.success("150 ships construction started!");
                        ships.forEach((ship) => {
                          clearShipImageCacheForShip(ship.id.toString());
                        });
                        refetch();
                      }}
                    >
                      [CONSTRUCT 150 SHIPS]
                    </ShipActionButton>
                  ) : (
                    <ShipActionButton
                      action="constructAll"
                      className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={fleetStats.unconstructedShips === 0}
                      onSuccess={() => {
                        if (address) {
                          persistConstructDeliveryTutorialCompleted(
                            address,
                            chainId,
                          );
                          setShowConstructDeliveryTutorial(false);
                        }
                        toast.success("Ships constructed successfully!");
                        ships.forEach((ship) => {
                          clearShipImageCacheForShip(ship.id.toString());
                        });
                        refetch();
                      }}
                    >
                      [CONSTRUCT ALL SHIPS]
                    </ShipActionButton>
                  )}
                  {staleCostBulkButton}
                </div>
              </div>
              <ManageNavyConstructDeliveryBrief
                className="absolute left-full top-0 z-[110] ml-4"
                constructButtonLabel={constructTutorialButtonLabel}
                onNotNow={dismissConstructDeliveryTutorialNotNow}
              />
            </div>
            <div className="relative z-10 flex shrink-0 items-start gap-4">
              <button
                type="button"
                onClick={handleBuyNewShipsClick}
                disabled={transactionState.isPending}
                className="px-6 py-3 border-2 border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 0,
                }}
              >
                [BUY NEW SHIPS]
              </button>
              <div className="shrink-0">{claimFreeShipControls}</div>
              <div
                className="pointer-events-auto absolute inset-0 z-20 rounded-none bg-slate-950/85"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : showBuyShipsTutorial ? (
          <div className="relative inline-flex items-start gap-4">
            <div className="relative z-10 flex shrink-0 gap-4">
              {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                <ShipActionButton
                  action="constructShips"
                  shipIds={shipsByStatus.unconstructed
                    .slice(0, STALE_COST_SYNC_BATCH_CAP)
                    .map((ship: Ship) => ship.id)}
                  className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("150 ships construction started!");
                    ships.forEach((ship) => {
                      clearShipImageCacheForShip(ship.id.toString());
                    });
                    refetch();
                  }}
                >
                  [CONSTRUCT 150 SHIPS]
                </ShipActionButton>
              ) : (
                <ShipActionButton
                  action="constructAll"
                  className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("Ships constructed successfully!");
                    ships.forEach((ship) => {
                      clearShipImageCacheForShip(ship.id.toString());
                    });
                    refetch();
                  }}
                >
                  [CONSTRUCT ALL SHIPS]
                </ShipActionButton>
              )}
              {staleCostBulkButton}
              <div
                className="pointer-events-auto absolute inset-0 z-20 rounded-none bg-slate-950/85"
                aria-hidden="true"
              />
            </div>
            <div className="relative z-[100] shrink-0">
              <ManageNavyBuyShipsBrief
                className="absolute right-full top-0 z-[110] mr-4"
                onNotNow={dismissBuyShipsTutorialNotNow}
              />
              <div
                className="border border-yellow-400/90 bg-yellow-400/24 animate-pulse p-[3px]"
                style={{ borderRadius: 0 }}
              >
                <button
                  type="button"
                  onClick={handleBuyNewShipsClick}
                  disabled={transactionState.isPending}
                  className="px-6 py-3 border-2 border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderRadius: 0,
                  }}
                >
                  [BUY NEW SHIPS]
                </button>
              </div>
            </div>
            <div className="relative z-10 shrink-0">
              <div className="relative">
                {claimFreeShipControls}
                <div
                  className="pointer-events-auto absolute inset-0 z-20 rounded-none bg-slate-950/85"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative inline-flex items-start gap-4">
            <div className="relative z-10 flex shrink-0 gap-4">
              {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                <ShipActionButton
                  action="constructShips"
                  shipIds={shipsByStatus.unconstructed
                    .slice(0, STALE_COST_SYNC_BATCH_CAP)
                    .map((ship: Ship) => ship.id)}
                  className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("150 ships construction started!");
                    ships.forEach((ship) => {
                      clearShipImageCacheForShip(ship.id.toString());
                    });
                    refetch();
                  }}
                >
                  [CONSTRUCT 150 SHIPS]
                </ShipActionButton>
              ) : (
                <ShipActionButton
                  action="constructAll"
                  className="px-6 py-3 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("Ships constructed successfully!");
                    ships.forEach((ship) => {
                      clearShipImageCacheForShip(ship.id.toString());
                    });
                    refetch();
                  }}
                >
                  [CONSTRUCT ALL SHIPS]
                </ShipActionButton>
              )}
              {staleCostBulkButton}

              <button
                type="button"
                onClick={handleBuyNewShipsClick}
                disabled={transactionState.isPending}
                className="px-6 py-3 border-2 border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 0,
                }}
              >
                [BUY NEW SHIPS]
              </button>

              {showDroneFactoryTutorial && (
                <div
                  className="pointer-events-auto absolute inset-0 z-20 rounded-none bg-slate-950/85"
                  aria-hidden="true"
                />
              )}
            </div>

            <div
              className={
                showDroneFactoryTutorial
                  ? "relative z-[100] shrink-0"
                  : "relative z-30 shrink-0"
              }
            >
              {showDroneFactoryTutorial && (
                <ManageNavyDroneFactoryBrief
                  className="absolute right-full top-0 z-[110] mr-4"
                  onNotNow={dismissDroneFactoryTutorialNotNow}
                />
              )}
              <div
                className={
                  showDroneFactoryTutorial
                    ? "border border-yellow-400/90 bg-yellow-400/24 animate-pulse p-[3px]"
                    : "p-0"
                }
                style={{ borderRadius: 0 }}
              >
                {claimFreeShipControls}
              </div>
            </div>
          </div>
        )}

        {/* Debug buttons - only show when debug mode is enabled */}
        {showDebugButtons && (
          <>
            <button
              onClick={() => {
                const cleared = clearBrokenImageCache();
                toast.success(`Cleared ${cleared} broken images from cache`);
              }}
              className="px-4 py-2 rounded-none border border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR BROKEN CACHE]
            </button>

            <button
              onClick={() => {
                const cleared = clearAllShipImageCache();
                resetAllShipRequestStates();
                clearAllShipRetryTimeouts();
                toast.success(
                  `Cleared all ${cleared} images from cache and reset all states`,
                );
                // Force refresh by reloading the page
                window.location.reload();
              }}
              className="px-4 py-2 rounded-none border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR ALL CACHE]
            </button>

            <button
              onClick={() => {
                resetAllShipRequestStates();
                toast.success(
                  `Reset all request states - try loading images again`,
                );
              }}
              className="px-4 py-2 rounded-none border border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [RESET REQUEST STATES]
            </button>

            <button
              onClick={() => {
                restartQueueProcessing();
                toast.success(`Restarted queue processing`);
              }}
              className="px-4 py-2 rounded-none border border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [RESTART QUEUE]
            </button>

            <button
              onClick={() => {
                const status = getQueueStatus();
                toast.success(
                  `Queue: ${status.queueLength} pending, ${status.activeRequests} active`,
                );
              }}
              className="px-4 py-2 rounded-none border border-purple-400 text-purple-400 hover:border-purple-300 hover:text-purple-300 hover:bg-purple-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [QUEUE STATUS]
            </button>

            <button
              onClick={() => {
                clearCacheOnLogout();
                toast.success(`Cleared cache and stopped queue processing`);
              }}
              className="px-4 py-2 rounded-none border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR ON LOGOUT]
            </button>
          </>
        )}

        {selectedShips.size > 0 &&
          (() => {
            // Filter out ships that are in fleets
            const recyclableShips = Array.from(selectedShips).filter((id) => {
              const ship = ships.find((s) => s.id.toString() === id);
              return ship && !ship.shipData.inFleet;
            });

            return recyclableShips.length > 0 ? (
              <ShipActionButton
                action="recycle"
                shipIds={recyclableShips.map((id) => BigInt(id))}
                className="px-6 py-3 rounded-none border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-200 disabled:cursor-not-allowed"
                onSuccess={() => {
                  // Show success toast
                  toast.success("Ships recycled successfully!");
                  // Clear selection and refetch ships data after successful recycling
                  setSelectedShips(new Set());
                  refetch();
                }}
              >
                {`[RECYCLE ${recyclableShips.length} SHIPS]`}
              </ShipActionButton>
            ) : (
              <div className="px-6 py-3 rounded-none border-2 border-orange-400 text-orange-400 font-mono font-bold tracking-wider opacity-50">
                [SELECTED SHIPS ARE IN FLEETS - CANNOT RECYCLE]
              </div>
            );
          })()}
      </div>

      {/* Ship Purchase Interface */}
      {showShipPurchase && (
        <div
          className="mb-8 border border-blue-400/80 bg-gradient-to-b from-slate-950/90 to-black/50 p-6 sm:p-8"
          style={{ borderRadius: 0 }}
        >
          <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-cyan-500/20 pb-4">
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-1">
                <h4
                  className="text-xl font-black uppercase tracking-[0.08em] text-cyan-300 sm:text-2xl"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  }}
                >
                  Ship purchasing
                </h4>
                <p
                  className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-red-400"
                  style={{
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                  }}
                >
                  Prices not yet normalized for all chains
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-300 font-mono text-sm">
                  PAYMENT METHOD:
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod("FLOW")}
                    className={`px-3 py-1 border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
                      paymentMethod === "FLOW"
                        ? "border-cyan-400 text-cyan-400 bg-cyan-400/10"
                        : "border-gray-600 text-gray-600 hover:border-gray-500 hover:text-gray-500"
                    }`}
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                    }}
                  >
                    TOKENS
                  </button>
                  <button
                    onClick={() => setPaymentMethod("UTC")}
                    className={`px-3 py-1 border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
                      paymentMethod === "UTC"
                        ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                        : "border-gray-600 text-gray-600 hover:border-gray-500 hover:text-gray-500"
                    }`}
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                    }}
                  >
                    UTC
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowShipPurchase(false)}
              className="text-blue-400 hover:text-blue-300 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <ShipPurchaseInterface
            onClose={() => setShowShipPurchase(false)}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
          />
          </div>
        </div>
      )}

      {/* Filtering and Sorting Controls */}
      <div
        className="border border-solid p-4 mb-6"
        style={{
          backgroundColor: "var(--color-slate)",
          borderColor: "var(--color-gunmetal)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
      >
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <label
              className="text-sm font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
              }}
            >
              FILTER:
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as
                    | "all"
                    | "constructed"
                    | "unconstructed"
                    | "starred",
                )
              }
              className="px-3 py-1 uppercase font-semibold tracking-wider text-sm"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            >
              <option value="all">ALL SHIPS</option>
              <option value="constructed">CONSTRUCTED</option>
              <option value="unconstructed">UNCONSTRUCTED</option>
              <option value="starred">STARRED</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label
              className="text-sm font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
              }}
            >
              SORT BY:
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "id"
                    | "cost"
                    | "accuracy"
                    | "hull"
                    | "speed",
                )
              }
              className="px-3 py-1 uppercase font-semibold tracking-wider text-sm"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            >
              <option value="id">ID</option>
              <option value="cost">THREAT</option>
              <option value="accuracy">ACCURACY</option>
              <option value="hull">HULL</option>
              <option value="speed">SPEED</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                borderColor: "var(--color-cyan)",
                color: "var(--color-cyan)",
                backgroundColor: "var(--color-steel)",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-slate)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-steel)";
              }}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showInGameProperties}
                onChange={(e) => setShowInGameProperties(e.target.checked)}
                className="w-4 h-4"
              />
              <span
                className="text-sm font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  color: "var(--color-cyan)",
                }}
              >
                IN-GAME PROPERTIES
                {isFromCache && (
                  <span
                    className="text-xs ml-1"
                    style={{ color: "var(--color-phosphor-green)" }}
                  >
                    (cached)
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Ships Display */}
      {!hasShips ? (
        <div className="text-center">
          <p className="text-lg opacity-80 mb-4">No ships found in your navy</p>
          <p className="text-sm opacity-60">Purchase ships to get started</p>
        </div>
      ) : (
        <div
          className={`space-y-4 ${
            showManageNavyTutorialChrome ? "relative z-0" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h4
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              [YOUR SHIPS] - Showing {filteredAndSortedShips.length} of{" "}
              {ships.length} ships
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  borderColor: "var(--color-gunmetal)",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-steel)",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-cyan)";
                  e.currentTarget.style.color = "var(--color-cyan)";
                  e.currentTarget.style.backgroundColor = "var(--color-slate)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                  e.currentTarget.style.backgroundColor = "var(--color-steel)";
                }}
              >
                {selectedShips.size === filteredAndSortedShips.length
                  ? "[DESELECT ALL]"
                  : "[SELECT ALL]"}
              </button>
              {selectedShips.size > 0 && (
                <span
                  className="text-sm uppercase tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {selectedShips.size} selected
                </span>
              )}
            </div>
          </div>
          <div
            ref={shipGridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAndSortedShips.map((ship: Ship) => {
              const shipCv = Number(ship.shipData.costsVersion);
              const costsVersionStale =
                globalCostsVersion !== null &&
                ship.shipData.constructed &&
                ship.shipData.timestampDestroyed === 0n &&
                !ship.shipData.inFleet &&
                shipCv !== globalCostsVersion;

              return (
                <ShipCard
                  key={ship.id.toString()}
                  ship={ship}
                  isStarred={starredShips.has(ship.id.toString())}
                  onToggleStar={() => toggleStar(ship.id.toString())}
                  isSelected={selectedShips.has(ship.id.toString())}
                  onToggleSelection={() =>
                    toggleShipSelection(ship.id.toString())
                  }
                  onRecycleClick={() => handleRecycleClick(ship)}
                  showInGameProperties={showInGameProperties}
                  inGameAttributes={attributesMap.get(ship.id)}
                  attributesLoading={attributesLoading}
                  costsVersionStale={costsVersionStale}
                  layoutShipId={ship.id.toString()}
                  nameBlockMinHeightPx={
                    nameBlockMinHeights[ship.id.toString()]
                  }
                  costVersionSyncButton={
                    costsVersionStale ? (
                      <TransactionButton
                        transactionId={`sync-ship-costs-${ship.id.toString()}`}
                        contractAddress={shipsContractAddress}
                        abi={CONTRACT_ABIS.SHIPS as Abi}
                        // Ships.syncShipCosts(uint256[]): permissionless; applies
                        // getCurrentCostsVersion + calculateShipCost. Not setCostOfShip
                        // (owner / game only). Reverts on-chain if ship is in fleet.
                        functionName="syncShipCosts"
                        args={[[ship.id]]}
                        className="w-full px-2 py-1.5 border-2 border-solid text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          borderColor: "var(--color-amber)",
                          color: "var(--color-amber)",
                          backgroundColor: "var(--color-near-black)",
                          borderRadius: 0,
                        }}
                        onSuccess={() => {
                          toast.success("Ship cost version updated");
                          afterShipCostSyncPersistCaches();
                          setTimeout(() => refetch(), 1000);
                        }}
                        onError={() => {
                          toast.error("Failed to update ship cost version");
                        }}
                      >
                        Update Ship Version
                      </TransactionButton>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Recycle Confirmation Modal */}
      {showRecycleModal && shipToRecycle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-400 rounded-none p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="text-red-400 text-4xl mb-4">☠️</div>
              {canRecycle ? (
                <>
                  <h3 className="text-xl font-bold text-red-400 mb-4">
                    DESTROY SHIP PERMANENTLY?
                  </h3>
                  <div className="text-cyan-300 mb-4">
                    <p className="font-bold">
                      {shipToRecycle.name || `Ship #${shipToRecycle.id}`}
                    </p>
                    <p className="text-sm opacity-80 mt-2">This action will:</p>
                    <ul className="text-sm text-left mt-2 space-y-1">
                      <li>
                        •{" "}
                        <span className="text-red-400">
                          Permanently destroy
                        </span>{" "}
                        this ship
                      </li>
                      <li>
                        •{" "}
                        <span className="text-blue-400">
                          Pay out{" "}
                          {recycleReward
                            ? formatEther(recycleReward as bigint)
                            : "..."}{" "}
                          UTC
                        </span>{" "}
                        per ship recycled
                      </li>
                      <li>
                        •{" "}
                        <span className="text-red-400">Cannot be reversed</span>{" "}
                        - this is permanent
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">
                    INSUFFICIENT PURCHASES
                  </h3>
                  <div className="text-cyan-300 mb-4">
                    <p className="font-bold">
                      {shipToRecycle.name || `Ship #${shipToRecycle.id}`}
                    </p>
                    <p className="text-sm opacity-80 mt-2">
                      You must purchase at least 10 ships before you can recycle
                      any ships.
                    </p>
                    <p className="text-sm text-yellow-400 mt-2 font-bold">
                      Current purchases:{" "}
                      {amountPurchased ? Number(amountPurchased) : 0} / 10
                      required
                    </p>
                  </div>
                </>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRecycleCancel}
                  className="px-6 py-2 border border-gray-400 text-gray-400 hover:border-gray-300 hover:text-gray-300 hover:bg-gray-400/10 rounded-none font-mono font-bold transition-all duration-200"
                >
                  CANCEL
                </button>
                {canRecycle && (
                  <TransactionButton
                    transactionId={`recycle-ship-${shipToRecycle.id}`}
                    contractAddress={shipsContractAddress}
                    abi={[
                      {
                        inputs: [
                          {
                            internalType: "uint256[]",
                            name: "_shipIds",
                            type: "uint256[]",
                          },
                        ],
                        name: "shipBreaker",
                        outputs: [],
                        stateMutability: "nonpayable",
                        type: "function",
                      },
                    ]}
                    functionName="shipBreaker"
                    args={[[shipToRecycle.id]]}
                    className="px-6 py-2 border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 rounded-none font-mono font-bold transition-all duration-200"
                    onSuccess={() => {
                      // Show success toast
                      toast.success("Ship recycled successfully!");
                      // Close modal and refetch ships data
                      setShowRecycleModal(false);
                      setShipToRecycle(null);
                      // Add a small delay to ensure blockchain state is updated
                      setTimeout(() => {
                        refetch();
                      }, 1000);
                    }}
                    onError={() => {
                      // Keep modal open on error so user can try again
                      console.error("Failed to recycle ship");
                    }}
                  >
                    DESTROY SHIP
                  </TransactionButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageNavy;
