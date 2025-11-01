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
import { useAccount } from "wagmi";
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
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";

const ManageNavy: React.FC = () => {
  const { address, chain, isConnected, status } = useAccount();
  const { transactionState } = useTransaction();
  const { ships, isLoading, error, hasShips, shipCount, refetch } =
    useOwnedShips();
  const { fleetStats, shipsByStatus } = useShipDetails();

  // Read the recycle reward amount from the contract
  const { data: recycleReward } = useShipsRead("recycleReward");

  // Read the user's purchase count
  const { data: amountPurchased } = useShipsRead(
    "amountPurchased",
    address ? [address] : undefined
  );

  // Get ship attributes for in-game properties
  const shipIds = ships.map((ship) => ship.id);
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
  } = useFreeShipClaiming();

  // Phase 3: Real-time updates
  const { isListening } = useContractEvents();

  // Clear cache when user disconnects
  useEffect(() => {
    if (!address) {
      console.log("🚪 User disconnected, clearing cache");
      clearCacheOnLogout();
    }
  }, [address]);

  // State for ship selection and filtering
  const [selectedShips, setSelectedShips] = React.useState<Set<string>>(
    new Set()
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
    new Set()
  );
  const [showShipPurchase, setShowShipPurchase] = React.useState(false);
  const [showRecycleModal, setShowRecycleModal] = React.useState(false);
  const [shipToRecycle, setShipToRecycle] = React.useState<Ship | null>(null);

  // Load starred ships from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("warpflow-starred-ships");
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
      "warpflow-starred-ships",
      JSON.stringify(Array.from(starredShips))
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
        starredShips.has(ship.id.toString())
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
        new Set(filteredAndSortedShips.map((ship) => ship.id.toString()))
      );
    }
  };

  // Debug connection state
  console.log("ManageNavy Debug:", {
    wagmiAddress: address,
    isConnected: isConnected,
  });

  console.log("Address", address);
  console.log("Chain", chain);
  console.log("Is Connected", isConnected);

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

  return (
    <div className="text-cyan-300 font-mono">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold tracking-wider">[MANAGE NAVY]</h3>
          <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDebugButtons}
              onChange={(e) => setShowDebugButtons(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Debug Mode</span>
          </label>
        </div>

        {/* Real-time Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isListening ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            ></div>
            <span className="text-xs text-cyan-300">
              {isListening ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Navy Statistics - Condensed */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
        <div className="border border-cyan-400 bg-black/40 rounded p-2 text-center">
          <h4 className="text-xs font-bold text-cyan-400 mb-1">🚀 TOTAL</h4>
          <p className="text-lg font-bold">{fleetStats.totalShips}</p>
        </div>
        <div className="border border-yellow-400 bg-black/40 rounded p-2 text-center">
          <h4 className="text-xs font-bold text-yellow-400 mb-1">✨ SHINY</h4>
          <p className="text-lg font-bold">{fleetStats.shinyShips}</p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded p-2 text-center">
          <h4 className="text-xs font-bold text-purple-400 mb-1">💎 COST</h4>
          <p className="text-lg font-bold">{fleetStats.totalCost}</p>
        </div>
        <div className="border border-gray-400 bg-black/40 rounded p-2 text-center">
          <h4 className="text-xs font-bold text-gray-400 mb-1">🛡️ UNBUILT</h4>
          <p className="text-lg font-bold">{fleetStats.unconstructedShips}</p>
        </div>
        <div className="border border-red-400 bg-black/40 rounded p-2 text-center">
          <h4 className="text-xs font-bold text-red-400 mb-1">💀 DEAD</h4>
          <p className="text-lg font-bold">{fleetStats.destroyedShips}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        {fleetStats.unconstructedShips > 150 ? (
          <ShipActionButton
            action="constructShips"
            shipIds={shipsByStatus.unconstructed
              .slice(0, 150)
              .map((ship: Ship) => ship.id)}
            className="px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={fleetStats.unconstructedShips === 0}
            onSuccess={() => {
              // Show success toast
              toast.success("150 ships construction started!");
              // Clear image cache for all ships to force refresh
              ships.forEach((ship) => {
                clearShipImageCacheForShip(ship.id.toString());
              });
              // Refetch ships data after successful construction
              refetch();
            }}
          >
            [CONSTRUCT 150 SHIPS]
          </ShipActionButton>
        ) : (
          <ShipActionButton
            action="constructAll"
            className="px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={fleetStats.unconstructedShips === 0}
            onSuccess={() => {
              // Show success toast
              toast.success("Ships constructed successfully!");
              // Clear image cache for all ships to force refresh
              ships.forEach((ship) => {
                clearShipImageCacheForShip(ship.id.toString());
              });
              // Refetch ships data after successful construction
              refetch();
            }}
          >
            [CONSTRUCT ALL SHIPS]
          </ShipActionButton>
        )}

        <button
          onClick={() => setShowShipPurchase(true)}
          disabled={transactionState.isPending}
          className="px-6 py-3 rounded-lg border-2 border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          [BUY NEW SHIPS]
        </button>

        {/* Debug buttons - only show when debug mode is enabled */}
        {showDebugButtons && (
          <>
            <button
              onClick={() => {
                const cleared = clearBrokenImageCache();
                toast.success(`Cleared ${cleared} broken images from cache`);
              }}
              className="px-4 py-2 rounded-lg border border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR BROKEN CACHE]
            </button>

            <button
              onClick={() => {
                const cleared = clearAllShipImageCache();
                resetAllShipRequestStates();
                clearAllShipRetryTimeouts();
                toast.success(
                  `Cleared all ${cleared} images from cache and reset all states`
                );
                // Force refresh by reloading the page
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR ALL CACHE]
            </button>

            <button
              onClick={() => {
                resetAllShipRequestStates();
                toast.success(
                  `Reset all request states - try loading images again`
                );
              }}
              className="px-4 py-2 rounded-lg border border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [RESET REQUEST STATES]
            </button>

            <button
              onClick={() => {
                restartQueueProcessing();
                toast.success(`Restarted queue processing`);
              }}
              className="px-4 py-2 rounded-lg border border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [RESTART QUEUE]
            </button>

            <button
              onClick={() => {
                const status = getQueueStatus();
                console.log("📊 Queue Status:", status);
                toast.success(
                  `Queue: ${status.queueLength} pending, ${status.activeRequests} active`
                );
              }}
              className="px-4 py-2 rounded-lg border border-purple-400 text-purple-400 hover:border-purple-300 hover:text-purple-300 hover:bg-purple-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [QUEUE STATUS]
            </button>

            <button
              onClick={() => {
                clearCacheOnLogout();
                toast.success(`Cleared cache and stopped queue processing`);
              }}
              className="px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR ON LOGOUT]
            </button>
          </>
        )}

        {/* Free Ship Claiming Button */}
        {isLoadingClaimStatus && (
          <button
            disabled
            className="px-6 py-3 rounded-lg border-2 border-gray-400 text-gray-400 font-mono font-bold tracking-wider opacity-50 cursor-not-allowed"
          >
            [CHECKING ELIGIBILITY...]
          </button>
        )}
        {!isLoadingClaimStatus && freeShipError && (
          <button
            disabled
            className="px-6 py-3 rounded-lg border-2 border-red-400 text-red-400 font-mono font-bold tracking-wider opacity-50 cursor-not-allowed"
          >
            [ERROR CLAIMING]
          </button>
        )}
        {!isLoadingClaimStatus && !freeShipError && claimStatusError && (
          <FreeShipClaimButton
            isEligible={true} // Allow trying even with read errors
            className="px-6 py-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onSuccess={() => {
              // Show success toast
              toast.success("Free ships claimed successfully!");
              // Refetch ships data after successful claim
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
              className="px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onSuccess={() => {
                // Show success toast
                toast.success("Free ships claimed successfully!");
                // Refetch ships data after successful claim
                refetch();
              }}
            >
              [CLAIM FREE SHIPS]
            </FreeShipClaimButton>
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
                className="px-6 py-3 rounded-lg border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-200 disabled:cursor-not-allowed"
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
              <div className="px-6 py-3 rounded-lg border-2 border-orange-400 text-orange-400 font-mono font-bold tracking-wider opacity-50">
                [SELECTED SHIPS ARE IN FLEETS - CANNOT RECYCLE]
              </div>
            );
          })()}
      </div>

      {/* Ship Purchase Interface */}
      {showShipPurchase && (
        <div className="bg-black/40 border border-blue-400 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-blue-400">
              [SHIP PURCHASING]
            </h4>
            <button
              onClick={() => setShowShipPurchase(false)}
              className="text-blue-400 hover:text-blue-300 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <ShipPurchaseInterface onClose={() => setShowShipPurchase(false)} />
        </div>
      )}

      {/* Filtering and Sorting Controls */}
      <div className="bg-black/40 border border-cyan-400 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-cyan-400">FILTER:</label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as
                    | "all"
                    | "constructed"
                    | "unconstructed"
                    | "starred"
                )
              }
              className="bg-black/60 border border-cyan-400 text-cyan-300 px-3 py-1 rounded font-mono text-sm"
            >
              <option value="all">ALL SHIPS</option>
              <option value="constructed">CONSTRUCTED</option>
              <option value="unconstructed">UNCONSTRUCTED</option>
              <option value="starred">STARRED</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-cyan-400">SORT BY:</label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "id"
                    | "cost"
                    | "accuracy"
                    | "hull"
                    | "speed"
                )
              }
              className="bg-black/60 border border-cyan-400 text-cyan-300 px-3 py-1 rounded font-mono text-sm"
            >
              <option value="id">ID</option>
              <option value="cost">COST</option>
              <option value="accuracy">ACCURACY</option>
              <option value="hull">HULL</option>
              <option value="speed">SPEED</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-1 border border-cyan-400 text-cyan-300 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 rounded font-mono text-sm transition-all duration-200"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showInGameProperties}
                onChange={(e) => setShowInGameProperties(e.target.checked)}
                className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
              />
              <span className="text-sm font-bold text-cyan-400">
                IN-GAME PROPERTIES
                {isFromCache && (
                  <span className="text-xs text-green-400 ml-1">(cached)</span>
                )}
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-cyan-300">
            Showing {filteredAndSortedShips.length} of {ships.length} ships
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 border border-purple-400 text-purple-400 hover:border-purple-300 hover:text-purple-300 hover:bg-purple-400/10 rounded font-mono text-sm transition-all duration-200"
            >
              {selectedShips.size === filteredAndSortedShips.length
                ? "[DESELECT ALL]"
                : "[SELECT ALL]"}
            </button>
            {selectedShips.size > 0 && (
              <span className="text-sm text-purple-300">
                {selectedShips.size} selected
              </span>
            )}
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
        <div className="space-y-4">
          <h4 className="text-xl font-bold mb-4 text-center">
            [YOUR SHIPS] - {shipCount} Total
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedShips.map((ship: Ship) => (
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Recycle Confirmation Modal */}
      {showRecycleModal && shipToRecycle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-400 rounded-lg p-6 max-w-md mx-4">
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
                  className="px-6 py-2 border border-gray-400 text-gray-400 hover:border-gray-300 hover:text-gray-300 hover:bg-gray-400/10 rounded font-mono font-bold transition-all duration-200"
                >
                  CANCEL
                </button>
                {canRecycle && (
                  <TransactionButton
                    transactionId={`recycle-ship-${shipToRecycle.id}`}
                    contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
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
                    className="px-6 py-2 border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 rounded font-mono font-bold transition-all duration-200"
                    onSuccess={() => {
                      console.log(
                        "Ship recycling transaction confirmed, calling onSuccess"
                      );
                      // Show success toast
                      toast.success("Ship recycled successfully!");
                      // Close modal and refetch ships data
                      setShowRecycleModal(false);
                      setShipToRecycle(null);
                      // Add a small delay to ensure blockchain state is updated
                      setTimeout(() => {
                        console.log("Calling refetch after ship recycling");
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
