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
import {
  Ship,
  getMainWeaponName,
  getArmorName,
  getShieldName,
  getSpecialName,
} from "../types/types";
import { calculateShipRank } from "../utils/shipLevel";
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
  clearManageNavyTutorialCache,
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
import {
  readFleetCompositionPersisted,
  writeFleetCompositionPersisted,
  newFleetCompositionId,
  fleetCompositionLocalNoticeSessionKey,
  parseFleetCompositionImport,
  buildFleetCompositionExport,
  type FleetComposition,
} from "../utils/fleetCompositionStorage";

/** Same typography as `TutorialGridTaskPanel` brief body. */
const MANAGE_NAVY_TUTORIAL_MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
};

/** Matches construct-all UI: batch cap when there are more than this many targets. */
const STALE_COST_SYNC_BATCH_CAP = 150;

type NavyFilterCategory =
  | "all"
  | "constructed"
  | "unconstructed"
  | "starred"
  | "shiny"
  | "not_shiny"
  | "in_fleet"
  | "not_in_fleet"
  | "destroyed"
  | "alive"
  | "eq_weapon"
  | "eq_armor"
  | "eq_shield"
  | "eq_special"
  | "trait_accuracy"
  | "trait_hull"
  | "trait_speed"
  | "trait_variant"
  | "data_threat"
  | "data_rank";

type NavyFilterCriterion = {
  id: string;
  category: NavyFilterCategory;
  value: string;
};

const NAVY_FILTER_GROUPS: Array<{
  label: string;
  categories: NavyFilterCategory[];
}> = [
  {
    label: "Status",
    categories: [
      "constructed",
      "unconstructed",
      "starred",
      "shiny",
      "not_shiny",
      "in_fleet",
      "not_in_fleet",
      "destroyed",
      "alive",
      "data_rank",
    ],
  },
  {
    label: "Equipment",
    categories: ["eq_weapon", "eq_armor", "eq_shield", "eq_special"],
  },
  {
    label: "Traits",
    categories: [
      "trait_accuracy",
      "trait_hull",
      "trait_speed",
      "trait_variant",
    ],
  },
];

function navyFilterCategoryLabel(category: NavyFilterCategory): string {
  switch (category) {
    case "all":
      return "All ships";
    case "constructed":
      return "Constructed";
    case "unconstructed":
      return "Unconstructed";
    case "starred":
      return "Starred";
    case "shiny":
      return "Shiny";
    case "not_shiny":
      return "Not shiny";
    case "in_fleet":
      return "In fleet";
    case "not_in_fleet":
      return "Not in fleet";
    case "destroyed":
      return "Destroyed";
    case "alive":
      return "Not destroyed";
    case "eq_weapon":
      return "Main weapon";
    case "eq_armor":
      return "Armor";
    case "eq_shield":
      return "Shields";
    case "eq_special":
      return "Special";
    case "trait_accuracy":
      return "Accuracy";
    case "trait_hull":
      return "Hull";
    case "trait_speed":
      return "Speed";
    case "trait_variant":
      return "Variant";
    case "data_threat":
      return "Threat (cost)";
    case "data_rank":
      return "Rank";
    default:
      return category;
  }
}

function needsNavyFilterValue(category: NavyFilterCategory): boolean {
  return !(
    category === "all" ||
    category === "constructed" ||
    category === "unconstructed" ||
    category === "starred" ||
    category === "shiny" ||
    category === "not_shiny" ||
    category === "in_fleet" ||
    category === "not_in_fleet" ||
    category === "destroyed" ||
    category === "alive"
  );
}

function uniqSortedInts(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function navyFilterSecondaryOptions(
  category: NavyFilterCategory,
  fleet: Ship[],
): { value: string; label: string }[] {
  switch (category) {
    case "eq_weapon":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getMainWeaponName(v).toUpperCase(),
      }));
    case "eq_armor":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getArmorName(v).toUpperCase(),
      }));
    case "eq_shield":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getShieldName(v).toUpperCase(),
      }));
    case "eq_special":
      return [0, 1, 2, 3].map((v) => ({
        value: String(v),
        label: getSpecialName(v).toUpperCase(),
      }));
    case "trait_accuracy":
      return uniqSortedInts(fleet.map((s) => s.traits.accuracy)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_hull":
      return uniqSortedInts(fleet.map((s) => s.traits.hull)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_speed":
      return uniqSortedInts(fleet.map((s) => s.traits.speed)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "trait_variant":
      return uniqSortedInts(fleet.map((s) => s.traits.variant)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "data_threat":
      return uniqSortedInts(fleet.map((s) => s.shipData.cost)).map((v) => ({
        value: String(v),
        label: String(v),
      }));
    case "data_rank":
      return [1, 2, 3, 4, 5].map((v) => ({
        value: String(v),
        label: `R${v}`,
      }));
    default:
      return [];
  }
}

function shipMatchesNavyFilter(
  ship: Ship,
  category: NavyFilterCategory,
  valueStr: string,
  starredShipIds: Set<string>,
): boolean {
  if (category === "all") return true;
  const n = Number(valueStr);
  const numOk = Number.isFinite(n);

  switch (category) {
    case "constructed":
      return ship.shipData.constructed;
    case "unconstructed":
      return !ship.shipData.constructed;
    case "starred":
      return starredShipIds.has(ship.id.toString());
    case "shiny":
      return ship.shipData.shiny;
    case "not_shiny":
      return !ship.shipData.shiny;
    case "in_fleet":
      return ship.shipData.inFleet;
    case "not_in_fleet":
      return !ship.shipData.inFleet;
    case "destroyed":
      return ship.shipData.timestampDestroyed > 0n;
    case "alive":
      return ship.shipData.timestampDestroyed === 0n;
    case "eq_weapon":
      return numOk && ship.equipment.mainWeapon === n;
    case "eq_armor":
      return numOk && ship.equipment.armor === n;
    case "eq_shield":
      return numOk && ship.equipment.shields === n;
    case "eq_special":
      return numOk && ship.equipment.special === n;
    case "trait_accuracy":
      return numOk && ship.traits.accuracy === n;
    case "trait_hull":
      return numOk && ship.traits.hull === n;
    case "trait_speed":
      return numOk && ship.traits.speed === n;
    case "trait_variant":
      return numOk && ship.traits.variant === n;
    case "data_threat":
      return numOk && ship.shipData.cost <= n;
    case "data_rank":
      return numOk && calculateShipRank(ship).rank === n;
    default:
      return true;
  }
}

function isEquipmentOrTraitFilterCategory(category: NavyFilterCategory): boolean {
  return (
    category === "eq_weapon" ||
    category === "eq_armor" ||
    category === "eq_shield" ||
    category === "eq_special" ||
    category === "trait_accuracy" ||
    category === "trait_hull" ||
    category === "trait_speed" ||
    category === "trait_variant" ||
    category === "data_rank"
  );
}

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

  const shouldForceDroneFactoryTutorial =
    !hasShips || (shipCount > 0 && shipCount <= 3);

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
    if (
      hasEverClickedFreeShipClaim(address, chainId) &&
      !shouldForceDroneFactoryTutorial
    ) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialSessionDismissed()) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    setShowDroneFactoryTutorial(true);
  }, [address, chainId, isConnected, shouldForceDroneFactoryTutorial]);

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
  const [showFilterWindow, setShowFilterWindow] = React.useState(false);
  const [filterWindowAnchor, setFilterWindowAnchor] = React.useState<{
    top: number;
    left: number;
  }>({ top: 120, left: 24 });
  const [navyFilterDraftCategory, setNavyFilterDraftCategory] =
    React.useState<NavyFilterCategory>("constructed");
  const [navyFilterDraftValue, setNavyFilterDraftValue] =
    React.useState<string>("");
  const [activeNavyFilters, setActiveNavyFilters] = React.useState<
    NavyFilterCriterion[]
  >([]);
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

  const [fleetCompositions, setFleetCompositions] = React.useState<
    FleetComposition[]
  >([]);
  const [fleetCompositionSelectedId, setFleetCompositionSelectedId] =
    React.useState<string | null>(null);
  const [fleetCompositionRenameDraft, setFleetCompositionRenameDraft] =
    React.useState("");
  const [showFleetCompositionLocalModal, setShowFleetCompositionLocalModal] =
    React.useState(false);
  const fleetSelectPendingRef = React.useRef<{ value: string } | null>(null);
  const fleetImportInputRef = React.useRef<HTMLInputElement>(null);
  const [fleetCompositionHydrated, setFleetCompositionHydrated] =
    React.useState(false);

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

  const navyFilterDraftValueOptions = React.useMemo(
    () => navyFilterSecondaryOptions(navyFilterDraftCategory, ships),
    [navyFilterDraftCategory, ships],
  );

  React.useEffect(() => {
    if (!needsNavyFilterValue(navyFilterDraftCategory)) return;
    if (navyFilterDraftCategory === "data_threat") {
      return;
    }
    const opts = navyFilterSecondaryOptions(navyFilterDraftCategory, ships);
    if (opts.length === 0) return;
    if (
      !navyFilterDraftValue ||
      !opts.some((o) => o.value === navyFilterDraftValue)
    ) {
      setNavyFilterDraftValue(opts[0].value);
    }
  }, [ships, navyFilterDraftCategory, navyFilterDraftValue]);

  // Filter and sort ships
  const filteredAndSortedShips = React.useMemo(() => {
    const filtered = ships.filter((ship) => {
      if (activeNavyFilters.length === 0) return true;
      const byCategory = new Map<NavyFilterCategory, NavyFilterCriterion[]>();
      for (const criterion of activeNavyFilters) {
        const existing = byCategory.get(criterion.category);
        if (existing) {
          existing.push(criterion);
        } else {
          byCategory.set(criterion.category, [criterion]);
        }
      }
      // AND across categories, OR within each category.
      for (const criteria of byCategory.values()) {
        const matchesAnyInCategory = criteria.some((criterion) =>
          shipMatchesNavyFilter(
            ship,
            criterion.category,
            criterion.value,
            starredShips,
          ),
        );
        if (!matchesAnyInCategory) return false;
      }
      return true;
    });

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
  }, [
    ships,
    activeNavyFilters,
    sortBy,
    sortOrder,
    starredShips,
  ]);

  const formatNavyFilterCriterion = React.useCallback(
    (criterion: NavyFilterCriterion): string => {
      const categoryLabel = navyFilterCategoryLabel(criterion.category);
      if (!needsNavyFilterValue(criterion.category)) return categoryLabel;
      const opts = navyFilterSecondaryOptions(criterion.category, ships);
      const valueLabel =
        opts.find((o) => o.value === criterion.value)?.label ??
        criterion.value;
      return `${categoryLabel}: ${valueLabel}`;
    },
    [ships],
  );

  const upsertNavyFilter = React.useCallback(
    (category: NavyFilterCategory, value: string) => {
      setActiveNavyFilters((prev) => {
        const existsExact = prev.some(
          (x) => x.category === category && x.value === value,
        );
        if (existsExact) return prev;
        const nextWithoutCategory = isEquipmentOrTraitFilterCategory(category)
          ? prev
          : prev.filter((x) => x.category !== category);
        return [
          ...nextWithoutCategory,
          { id: newFleetCompositionId(), category, value },
        ];
      });
    },
    [],
  );

  const toggleBooleanNavyFilter = React.useCallback(
    (category: NavyFilterCategory) => {
      setActiveNavyFilters((prev) => {
        const hasCategory = prev.some(
          (x) => x.category === category && x.value === "",
        );
        if (hasCategory) {
          return prev.filter((x) => x.category !== category);
        }
        const nextWithoutCategory = prev.filter((x) => x.category !== category);
        return [
          ...nextWithoutCategory,
          { id: newFleetCompositionId(), category, value: "" },
        ];
      });
    },
    [],
  );

  const toggleFilterValue = React.useCallback(
    (category: NavyFilterCategory, value: string) => {
      setActiveNavyFilters((prev) => {
        const hasExact = prev.some(
          (x) => x.category === category && x.value === value,
        );
        if (hasExact) {
          return prev.filter(
            (x) => !(x.category === category && x.value === value),
          );
        }
        const nextBase = isEquipmentOrTraitFilterCategory(category)
          ? prev
          : prev.filter((x) => x.category !== category);
        return [...nextBase, { id: newFleetCompositionId(), category, value }];
      });
    },
    [],
  );

  React.useEffect(() => {
    if (!address) {
      setFleetCompositions([]);
      setFleetCompositionSelectedId(null);
      setFleetCompositionHydrated(false);
      return;
    }
    const persisted = readFleetCompositionPersisted(chainId, address);
    setFleetCompositions(persisted.fleets);
    setFleetCompositionSelectedId(persisted.selectedFleetId);
    setFleetCompositionHydrated(true);
  }, [chainId, address]);

  React.useEffect(() => {
    if (!address || !fleetCompositionHydrated) return;
    writeFleetCompositionPersisted(
      chainId,
      address,
      fleetCompositions,
      fleetCompositionSelectedId,
    );
  }, [
    chainId,
    address,
    fleetCompositions,
    fleetCompositionHydrated,
    fleetCompositionSelectedId,
  ]);

  React.useEffect(() => {
    if (fleetCompositionSelectedId == null) return;
    if (!fleetCompositions.some((f) => f.id === fleetCompositionSelectedId)) {
      setFleetCompositionSelectedId(null);
    }
  }, [fleetCompositions, fleetCompositionSelectedId]);

  const fleetCompositionsRef = React.useRef(fleetCompositions);
  fleetCompositionsRef.current = fleetCompositions;
  React.useEffect(() => {
    if (fleetCompositionSelectedId == null) {
      setFleetCompositionRenameDraft("");
      return;
    }
    const f = fleetCompositionsRef.current.find(
      (x) => x.id === fleetCompositionSelectedId,
    );
    setFleetCompositionRenameDraft(f?.name ?? "");
  }, [fleetCompositionSelectedId]);

  React.useEffect(() => {
    if (!address || isLoading) return;
    setFleetCompositions((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((f) => {
        const nextIds = f.shipIds.filter((id) => {
          const s = ships.find((x) => x.id.toString() === id);
          return (
            s &&
            s.shipData.constructed &&
            s.shipData.timestampDestroyed === 0n
          );
        });
        if (nextIds.length !== f.shipIds.length) changed = true;
        return { ...f, shipIds: nextIds };
      });
      return changed ? next : prev;
    });
  }, [ships, address, isLoading]);

  const activeCompositionFleet = React.useMemo(
    () =>
      fleetCompositionSelectedId
        ? fleetCompositions.find((f) => f.id === fleetCompositionSelectedId)
        : undefined,
    [fleetCompositionSelectedId, fleetCompositions],
  );

  const shipsForGridDisplay = React.useMemo(() => {
    if (!fleetCompositionSelectedId || !activeCompositionFleet) {
      return filteredAndSortedShips;
    }
    const f = activeCompositionFleet;
    const idSet = new Set(f.shipIds);
    const inOrder = f.shipIds
      .map((id) =>
        filteredAndSortedShips.find((s) => s.id.toString() === id),
      )
      .filter((s): s is Ship => s != null);
    const rest = filteredAndSortedShips.filter(
      (s) => !idSet.has(s.id.toString()),
    );
    return [...inOrder, ...rest];
  }, [
    fleetCompositionSelectedId,
    activeCompositionFleet,
    filteredAndSortedShips,
  ]);

  const activeCompositionThreatTotal = React.useMemo(() => {
    if (!activeCompositionFleet) return 0;
    return activeCompositionFleet.shipIds.reduce((sum, id) => {
      const s = ships.find((x) => x.id.toString() === id);
      if (
        !s ||
        !s.shipData.constructed ||
        s.shipData.timestampDestroyed > 0n
      ) {
        return sum;
      }
      return sum + Number(s.shipData.cost);
    }, 0);
  }, [activeCompositionFleet, ships]);

  const fleetRenameIsDirty = React.useMemo(() => {
    if (!activeCompositionFleet || fleetCompositionSelectedId == null) {
      return false;
    }
    const next = fleetCompositionRenameDraft.trim() || "Unnamed fleet";
    return next !== activeCompositionFleet.name;
  }, [
    activeCompositionFleet,
    fleetCompositionSelectedId,
    fleetCompositionRenameDraft,
  ]);

  const finishFleetSelect = React.useCallback((v: string) => {
    if (v === "") {
      setFleetCompositionSelectedId(null);
      return;
    }
    if (v === "__create__") {
      const id = newFleetCompositionId();
      setFleetCompositions((p) => {
        const n = p.length + 1;
        return [...p, { id, name: `Fleet ${n}`, shipIds: [] }];
      });
      setFleetCompositionSelectedId(id);
      return;
    }
    setFleetCompositionSelectedId(v);
  }, []);

  const onFleetCompositionSelectChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (v === "") {
        finishFleetSelect("");
        return;
      }
      if (
        address &&
        typeof window !== "undefined" &&
        sessionStorage.getItem(
          fleetCompositionLocalNoticeSessionKey(chainId, address),
        ) !== "1"
      ) {
        fleetSelectPendingRef.current = { value: v };
        setShowFleetCompositionLocalModal(true);
        return;
      }
      finishFleetSelect(v);
    },
    [address, chainId, finishFleetSelect],
  );

  const acknowledgeFleetCompositionLocalModal = React.useCallback(() => {
    if (address) {
      sessionStorage.setItem(
        fleetCompositionLocalNoticeSessionKey(chainId, address),
        "1",
      );
    }
    setShowFleetCompositionLocalModal(false);
    const pending = fleetSelectPendingRef.current;
    fleetSelectPendingRef.current = null;
    if (pending) finishFleetSelect(pending.value);
  }, [address, chainId, finishFleetSelect]);

  const cancelFleetCompositionLocalModal = React.useCallback(() => {
    setShowFleetCompositionLocalModal(false);
    fleetSelectPendingRef.current = null;
  }, []);

  const addShipToActiveComposition = React.useCallback(
    (shipIdStr: string) => {
      if (!fleetCompositionSelectedId) return;
      setFleetCompositions((prev) =>
        prev.map((f) => {
          if (f.id !== fleetCompositionSelectedId) return f;
          if (f.shipIds.includes(shipIdStr)) return f;
          return { ...f, shipIds: [...f.shipIds, shipIdStr] };
        }),
      );
    },
    [fleetCompositionSelectedId],
  );

  const removeShipFromActiveComposition = React.useCallback(
    (shipIdStr: string) => {
      if (!fleetCompositionSelectedId) return;
      setFleetCompositions((prev) =>
        prev.map((f) => {
          if (f.id !== fleetCompositionSelectedId) return f;
          return { ...f, shipIds: f.shipIds.filter((id) => id !== shipIdStr) };
        }),
      );
    },
    [fleetCompositionSelectedId],
  );

  const commitFleetRename = React.useCallback(() => {
    if (!fleetCompositionSelectedId) return;
    const name = fleetCompositionRenameDraft.trim() || "Unnamed fleet";
    setFleetCompositions((prev) =>
      prev.map((f) =>
        f.id === fleetCompositionSelectedId ? { ...f, name } : f,
      ),
    );
  }, [fleetCompositionSelectedId, fleetCompositionRenameDraft]);

  const deleteActiveFleet = React.useCallback(() => {
    if (!fleetCompositionSelectedId) return;
    if (
      !confirm(
        "Delete this fleet preset? It is only stored in this browser.",
      )
    ) {
      return;
    }
    const id = fleetCompositionSelectedId;
    setFleetCompositions((prev) => prev.filter((f) => f.id !== id));
    setFleetCompositionSelectedId(null);
  }, [fleetCompositionSelectedId]);

  const exportFleetCompositionsFile = React.useCallback(() => {
    if (fleetCompositions.length === 0) {
      toast.error("No fleet presets to export");
      return;
    }
    const payload = buildFleetCompositionExport(chainId, fleetCompositions);
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fleet_compositions_chain${chainId}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Fleet presets exported");
  }, [chainId, fleetCompositions]);

  const onFleetImportFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const result = parseFleetCompositionImport(text, chainId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setFleetCompositions((prev) => {
          const byId = new Map<string, FleetComposition>();
          for (const f of prev) byId.set(f.id, f);
          for (const f of result.fleets) byId.set(f.id, f);
          return Array.from(byId.values());
        });
        toast.success(`Imported ${result.fleets.length} fleet preset(s)`);
      };
      reader.readAsText(file);
    },
    [chainId],
  );

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
    if (selectedShips.size === shipsForGridDisplay.length) {
      setSelectedShips(new Set());
    } else {
      setSelectedShips(
        new Set(shipsForGridDisplay.map((ship) => ship.id.toString())),
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
        shipsForGridDisplay.map((s) => s.id.toString()).join("\0"),
        showInGameProperties ? "ig" : "nft",
      ].join("|"),
    [shipsForGridDisplay, showInGameProperties],
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

  const fleetCompositionSelectControl = (
    <div className="flex flex-col gap-1">
      <label
        className="text-[10px] font-bold uppercase tracking-wider opacity-70"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-cyan)",
        }}
      >
        Fleets
      </label>
      <select
        value={fleetCompositionSelectedId ?? ""}
        onChange={onFleetCompositionSelectChange}
        className="px-3 py-2 uppercase font-semibold tracking-wider text-sm min-w-[12rem] max-w-[16rem]"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundColor: "var(--color-near-black)",
          color: "var(--color-text-primary)",
          border: "2px solid var(--color-gunmetal)",
          borderRadius: 0,
        }}
      >
        <option value="">Manage Fleets</option>
        <option value="__create__">+ Create new fleet</option>
        {fleetCompositions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
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
                  {fleetCompositionSelectControl}
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
              {fleetCompositionSelectControl}
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
              {fleetCompositionSelectControl}
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
                if (!address) {
                  toast.error("Connect wallet to clear tutorial cache");
                  return;
                }
                clearManageNavyTutorialCache(address, chainId);
                setShowDroneFactoryTutorial(true);
                setShowConstructDeliveryTutorial(false);
                setShowBuyShipsTutorial(false);
                toast.success("Cleared Manage Navy tutorial cache");
              }}
              className="px-4 py-2 rounded-none border border-amber-400 text-amber-400 hover:border-amber-300 hover:text-amber-300 hover:bg-amber-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR TUTORIAL CACHE]
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
          <div className="flex flex-wrap items-center gap-4">
            <label
              className="text-sm font-bold uppercase tracking-wider shrink-0"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
              }}
            >
              FILTER:
            </label>
            <button
              type="button"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setFilterWindowAnchor({
                  top: rect.bottom + 8,
                  left: Math.max(12, rect.left),
                });
                setShowFilterWindow(true);
              }}
              className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
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
              {activeNavyFilters.length > 0
                ? `[FILTERS ${activeNavyFilters.length}]`
                : "[FILTERS]"}
            </button>
            {activeNavyFilters.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveNavyFilters([])}
                className="px-3 py-1 border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 uppercase font-semibold tracking-wider text-xs transition-all duration-150"
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
                  borderRadius: 0,
                }}
              >
                [CLEAR]
              </button>
            )}
            {activeNavyFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeNavyFilters.map((criterion) => (
                  <button
                    type="button"
                    key={criterion.id}
                    onClick={() =>
                      setActiveNavyFilters((prev) =>
                        prev.filter((x) => x.id !== criterion.id),
                      )
                    }
                    className="px-2 py-1 border border-cyan-500/60 text-cyan-200 hover:border-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 text-xs tracking-wide"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      borderRadius: 0,
                    }}
                    title="Remove filter"
                  >
                    {formatNavyFilterCriterion(criterion)} ×
                  </button>
                ))}
              </div>
            )}
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

      {showFilterWindow && (
        <>
          <div
            className="fixed inset-0 z-[259]"
            onMouseDown={() => setShowFilterWindow(false)}
          />
          <div
            className="fixed z-[260] p-2"
            style={{
              top: `${filterWindowAnchor.top}px`,
              left: `${filterWindowAnchor.left}px`,
            }}
          >
            <div
              className="max-h-[78vh] w-[min(96vw,72rem)] overflow-auto border border-cyan-500/70 bg-[#0b1220] p-4 shadow-2xl"
              style={{ borderRadius: 0 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-cyan-500/30 pb-3">
                <h4
                  className="text-lg font-black uppercase tracking-[0.08em] text-cyan-300"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                  }}
                >
                  Manage Navy Filters
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFilterWindow(false)}
                  className="px-3 py-1 border border-cyan-500/80 text-cyan-300 hover:bg-cyan-500/10 text-xs uppercase tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                    borderRadius: 0,
                  }}
                >
                  [CLOSE]
                </button>
              </div>

              <section
                className="border border-cyan-500/30 p-3"
                style={{ borderRadius: 0 }}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h5 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Select filter criteria
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-gray-400">
                      Threat at or below
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={
                        activeNavyFilters.find((f) => f.category === "data_threat")
                          ?.value ?? ""
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === "") {
                          setActiveNavyFilters((prev) =>
                            prev.filter((f) => f.category !== "data_threat"),
                          );
                          return;
                        }
                        const parsed = Number(next);
                        if (Number.isInteger(parsed) && parsed >= 0) {
                          upsertNavyFilter("data_threat", String(parsed));
                        }
                      }}
                      className="px-3 py-1 w-28 font-semibold tracking-wider text-sm"
                      style={{
                        fontFamily:
                          "var(--font-jetbrains-mono), 'Courier New', monospace",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                  {needsNavyFilterValue(navyFilterDraftCategory) &&
                    !isEquipmentOrTraitFilterCategory(
                      navyFilterDraftCategory,
                    ) &&
                    navyFilterDraftCategory !== "data_threat" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-gray-400">
                        {navyFilterCategoryLabel(navyFilterDraftCategory)} value
                      </span>
                      {navyFilterDraftCategory === "data_rank" ? (
                        <select
                          value={navyFilterDraftValue}
                          onChange={(e) => {
                            const next = e.target.value;
                            setNavyFilterDraftValue(next);
                            if (next) {
                              upsertNavyFilter("data_rank", next);
                            }
                          }}
                          className="px-3 py-1 uppercase font-semibold tracking-wider text-sm"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            borderRadius: 0,
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((rank) => (
                            <option key={rank} value={String(rank)}>
                              {`R${rank}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={navyFilterDraftValue}
                          onChange={(e) => {
                            const next = e.target.value;
                            setNavyFilterDraftValue(next);
                            if (next) {
                              upsertNavyFilter(navyFilterDraftCategory, next);
                            }
                          }}
                          disabled={navyFilterDraftValueOptions.length === 0}
                          className="px-3 py-1 uppercase font-semibold tracking-wider text-sm disabled:opacity-40"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            borderRadius: 0,
                          }}
                        >
                          {navyFilterDraftValueOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {NAVY_FILTER_GROUPS.map((group) => (
                    <div
                      key={group.label}
                      className="border border-cyan-500/20 p-2"
                      style={{ borderRadius: 0 }}
                    >
                      <div className="mb-2 text-xs uppercase tracking-wider text-cyan-400">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.categories.map((category) => (
                          <div key={category} className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNavyFilterDraftCategory(category);
                                if (!needsNavyFilterValue(category)) {
                                  toggleBooleanNavyFilter(category);
                                } else if (!isEquipmentOrTraitFilterCategory(category)) {
                                  if (category === "data_threat") {
                                    const existing = activeNavyFilters.find(
                                      (f) => f.category === category,
                                    );
                                    const next = existing?.value ?? "100";
                                    setNavyFilterDraftValue(next);
                                    upsertNavyFilter("data_threat", next);
                                    return;
                                  }
                                  const opts = navyFilterSecondaryOptions(
                                    category,
                                    ships,
                                  );
                                  const preferred = opts.find(
                                    (o) => o.value === navyFilterDraftValue,
                                  )?.value;
                                  const chosen = preferred ?? opts[0]?.value ?? "";
                                  if (chosen) {
                                    setNavyFilterDraftValue(chosen);
                                    upsertNavyFilter(category, chosen);
                                  }
                                }
                              }}
                              className={`px-2 py-1 text-xs uppercase tracking-wide border ${
                                navyFilterDraftCategory === category
                                  ? "border-cyan-300 bg-cyan-500/20 text-cyan-100"
                                  : "border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-cyan-200"
                              }`}
                              style={{
                                fontFamily:
                                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                                borderRadius: 0,
                              }}
                            >
                              {navyFilterCategoryLabel(category)}
                            </button>
                            {isEquipmentOrTraitFilterCategory(category) && (
                              <div className="ml-1 flex flex-wrap gap-1">
                                {navyFilterSecondaryOptions(category, ships).map(
                                  (option) => {
                                    const isSelected = activeNavyFilters.some(
                                      (f) =>
                                        f.category === category &&
                                        f.value === option.value,
                                    );
                                    return (
                                      <button
                                        type="button"
                                        key={`${category}-${option.value}`}
                                        onClick={() =>
                                          toggleFilterValue(
                                            category,
                                            option.value,
                                          )
                                        }
                                        className={`px-2 py-0.5 text-[11px] uppercase tracking-wide border ${
                                          isSelected
                                            ? "border-emerald-300 bg-emerald-500/20 text-emerald-100"
                                            : "border-gray-600 text-gray-300 hover:border-emerald-400 hover:text-emerald-200"
                                        }`}
                                        style={{
                                          fontFamily:
                                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                                          borderRadius: 0,
                                        }}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* Ships Display */}
      {!hasShips ? (
        <div className="text-center">
          <p className="text-lg opacity-80 mb-4">
            Claim free ships to get started
          </p>
        </div>
      ) : (
        <div
          className={`space-y-4 ${
            showManageNavyTutorialChrome ? "relative z-0" : ""
          }`}
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h4
                className="text-xl font-bold min-w-0"
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
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cyan)";
                    e.currentTarget.style.color = "var(--color-cyan)";
                    e.currentTarget.style.backgroundColor =
                      "var(--color-slate)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                  }}
                >
                  {selectedShips.size === shipsForGridDisplay.length
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
              className="flex flex-wrap items-center gap-3 border border-solid px-3 py-2"
              style={{
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                backgroundColor: "var(--color-near-black)",
                borderRadius: 0,
              }}
            >
              {fleetCompositionSelectedId != null &&
                activeCompositionFleet && (
                  <>
                    <label
                      className="text-xs font-bold uppercase tracking-wider shrink-0"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        color: "var(--color-cyan)",
                      }}
                    >
                      Fleet name
                    </label>
                    <input
                      type="text"
                      value={fleetCompositionRenameDraft}
                      onChange={(e) =>
                        setFleetCompositionRenameDraft(e.target.value)
                      }
                      onBlur={commitFleetRename}
                      className="px-2 py-1 text-sm min-w-[8rem] max-w-[16rem] flex-1 sm:flex-none"
                      style={{
                        fontFamily:
                          "var(--font-jetbrains-mono), 'Courier New', monospace",
                        backgroundColor: "var(--color-slate)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-gunmetal)",
                        borderRadius: 0,
                      }}
                    />
                    <button
                      type="button"
                      onClick={commitFleetRename}
                      disabled={!fleetRenameIsDirty}
                      className="px-3 py-1.5 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold text-xs tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      style={{ borderRadius: 0 }}
                    >
                      [SAVE]
                    </button>
                    <span
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{
                        fontFamily:
                          "var(--font-jetbrains-mono), 'Courier New', monospace",
                        color: "var(--color-amber)",
                      }}
                    >
                      Total threat: {activeCompositionThreatTotal}
                    </span>
                    <button
                      type="button"
                      onClick={deleteActiveFleet}
                      className="px-3 py-1.5 rounded-none border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
                      style={{ borderRadius: 0 }}
                    >
                      [DELETE FLEET]
                    </button>
                  </>
                )}
              {fleetCompositions.length > 0 && (
                <button
                  type="button"
                  onClick={exportFleetCompositionsFile}
                  className="px-3 py-1.5 rounded-none border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
                  style={{ borderRadius: 0 }}
                >
                  [EXPORT FLEETS]
                </button>
              )}
              <button
                type="button"
                onClick={() => fleetImportInputRef.current?.click()}
                className="px-3 py-1.5 rounded-none border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-xs tracking-wider transition-all duration-200"
                style={{ borderRadius: 0 }}
              >
                [IMPORT FLEETS]
              </button>
              <input
                ref={fleetImportInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={onFleetImportFileChange}
              />
            </div>
          </div>
          <div
            ref={shipGridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {shipsForGridDisplay.map((ship: Ship) => {
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
                        // (owner / game only). Reverts onchain if ship is in fleet.
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
                  fleetCompositionControls={(() => {
                    if (
                      !fleetCompositionSelectedId ||
                      !activeCompositionFleet
                    ) {
                      return undefined;
                    }
                    const sid = ship.id.toString();
                    const destroyed = ship.shipData.timestampDestroyed > 0n;
                    const inComp =
                      activeCompositionFleet.shipIds.includes(sid);
                    if (!ship.shipData.constructed) return undefined;
                    if (destroyed && !inComp) return undefined;

                    const addBtn = (
                      <button
                        type="button"
                        className="w-full px-2 py-2 rounded-none border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                        onClick={() => addShipToActiveComposition(sid)}
                      >
                        [ADD TO FLEET]
                      </button>
                    );
                    const removeBtn = (
                      <button
                        type="button"
                        className="w-full px-2 py-2 rounded-none border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
                        style={{ borderRadius: 0 }}
                        onClick={() => removeShipFromActiveComposition(sid)}
                      >
                        [REMOVE FROM FLEET]
                      </button>
                    );

                    if (destroyed && inComp) {
                      return (
                        <div className="text-center py-3 px-2 space-y-2">
                          <div className="text-red-400 text-xs font-mono">
                            Destroyed: remove from preset
                          </div>
                          {removeBtn}
                        </div>
                      );
                    }
                    return (
                      <div className="text-center py-3 px-2">
                        {inComp ? removeBtn : addBtn}
                      </div>
                    );
                  })()}
                />
              );
            })}
          </div>
        </div>
      )}

      {showFleetCompositionLocalModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4">
          <div
            className="max-w-md w-full border-2 border-cyan-400/80 bg-[#0f172a] p-5 shadow-lg"
            style={{ borderRadius: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fleet-composition-local-title"
          >
            <h3
              id="fleet-composition-local-title"
              className="text-lg font-bold uppercase tracking-wide text-cyan-300 mb-3"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              Local fleet presets
            </h3>
            <p
              className="text-sm leading-relaxed text-gray-200 mb-5"
              style={MANAGE_NAVY_TUTORIAL_MONO}
            >
              Fleet compositions are saved only in this browser (local
              storage). Clearing site data, another device, or another browser
              will not have these presets. Use export to back up JSON and import
              to restore on this chain.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={cancelFleetCompositionLocalModal}
                className="px-4 py-2 border border-gray-500 text-gray-300 hover:bg-gray-700/50 font-mono text-sm"
                style={{ borderRadius: 0 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={acknowledgeFleetCompositionLocalModal}
                className="px-4 py-2 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 font-mono font-bold text-sm"
                style={{ borderRadius: 0 }}
              >
                Continue
              </button>
            </div>
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
