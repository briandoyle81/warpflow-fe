import React from "react";
import {
  useOwnedShips,
  useShipDetails,
  useShipActions,
  useContractEvents,
  useNavyAnalytics,
  useNavyOptimization,
} from "../hooks";
import { useAccount } from "wagmi";
import { Ship } from "../types/types";
import ShipPurchaseInterface from "./ShipPurchaseInterface";

const ManageNavy: React.FC = () => {
  const { address } = useAccount();
  const { ships, isLoading, error, hasShips, shipCount } = useOwnedShips();
  const { fleetStats } = useShipDetails();
  const { constructShip, constructAllShips, recycleShips, isPending } =
    useShipActions();

  // Phase 3: Real-time updates and analytics
  const { isListening } = useContractEvents();
  const {
    navyComposition: fleetComposition,
    navyPerformance: fleetPerformance,
    optimizationSuggestions,
    navyTiers: fleetTiers,
  } = useNavyAnalytics();
  const {
    searchTerm,
    handleSearchChange,
    searchResults,
    performanceMetrics,
    cleanup,
  } = useNavyOptimization();

  // Cleanup optimization resources on unmount
  React.useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // State for ship selection and filtering
  const [selectedShips, setSelectedShips] = React.useState<Set<string>>(
    new Set()
  );
  const [filterStatus, setFilterStatus] = React.useState<
    "all" | "constructed" | "unconstructed"
  >("all");
  const [sortBy, setSortBy] = React.useState<
    "id" | "cost" | "accuracy" | "hull" | "speed"
  >("id");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [showShipPurchase, setShowShipPurchase] = React.useState(false);

  // Filter and sort ships (with search integration)
  const filteredAndSortedShips = React.useMemo(() => {
    let filtered = searchResults || ships;

    // Apply status filter
    if (filterStatus === "constructed") {
      filtered = filtered.filter((ship) => ship.shipData.constructed);
    } else if (filterStatus === "unconstructed") {
      filtered = filtered.filter((ship) => !ship.shipData.constructed);
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
  }, [ships, searchResults, filterStatus, sortBy, sortOrder]);

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

  // Handle bulk actions
  const handleBulkRecycle = () => {
    if (selectedShips.size === 0) return;
    const shipIds = Array.from(selectedShips).map((id) => BigInt(id));
    recycleShips(shipIds);
    setSelectedShips(new Set());
  };

  const handleSelectAll = () => {
    if (selectedShips.size === filteredAndSortedShips.length) {
      setSelectedShips(new Set());
    } else {
      setSelectedShips(
        new Set(filteredAndSortedShips.map((ship) => ship.id.toString()))
      );
    }
  };

  if (!address) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <p className="text-lg opacity-80">
          Please connect your wallet to view your navy
        </p>
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

  return (
    <div className="text-cyan-300 font-mono">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold tracking-wider">[MANAGE NAVY]</h3>

        {/* Real-time Status & Search */}
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

          <div className="relative">
            <input
              type="text"
              placeholder="Search ships..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-black/60 border border-cyan-400 text-cyan-300 px-3 py-1 rounded font-mono text-sm w-48 focus:outline-none focus:border-cyan-300"
            />
            {searchTerm && (
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-cyan-400">
                {searchResults?.length || 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navy Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-cyan-400 bg-black/40 rounded-lg p-4 text-center">
          <h4 className="text-lg font-bold text-cyan-400 mb-2">
            🚀 TOTAL SHIPS
          </h4>
          <p className="text-2xl font-bold">{fleetStats.totalShips}</p>
        </div>
        <div className="border border-green-400 bg-black/40 rounded-lg p-4 text-center">
          <h4 className="text-lg font-bold text-green-400 mb-2">
            ⚡ CONSTRUCTED
          </h4>
          <p className="text-2xl font-bold">{fleetStats.constructedShips}</p>
        </div>
        <div className="border border-amber-400 bg-black/40 rounded-lg p-4 text-center">
          <h4 className="text-lg font-bold text-amber-400 mb-2">
            🛡️ UNCONSTRUCTED
          </h4>
          <p className="text-2xl font-bold">{fleetStats.unconstructedShips}</p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4 text-center">
          <h4 className="text-lg font-bold text-purple-400 mb-2">
            💎 TOTAL COST
          </h4>
          <p className="text-2xl font-bold">{fleetStats.totalCost}</p>
        </div>
      </div>

      {/* Enhanced Navy Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-yellow-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-yellow-400 mb-3 text-center">
            ✨ SHINY SHIPS
          </h4>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {fleetStats.shinyShips}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {fleetStats.totalShips > 0
                ? `${(
                    (fleetStats.shinyShips / fleetStats.totalShips) *
                    100
                  ).toFixed(1)}% of navy`
                : "0% of navy"}
            </p>
          </div>
        </div>

        <div className="border border-blue-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-blue-400 mb-3 text-center">
            🎯 NAVY READINESS
          </h4>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">
              {fleetStats.totalShips > 0
                ? `${(
                    (fleetStats.constructedShips / fleetStats.totalShips) *
                    100
                  ).toFixed(0)}%`
                : "0%"}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {fleetStats.constructedShips} of {fleetStats.totalShips} ready
            </p>
          </div>
        </div>

        <div className="border border-red-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-red-400 mb-3 text-center">
            💀 DESTROYED
          </h4>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-400">
              {fleetStats.destroyedShips}
            </p>
            <p className="text-sm opacity-80 mt-1">
              {fleetStats.totalShipsDestroyed} total kills
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Navy Analytics */}
      <div className="bg-black/40 border border-purple-400 rounded-lg p-6 mb-8">
        <h4 className="text-xl font-bold text-purple-400 mb-4 text-center">
          [ADVANCED NAVY ANALYTICS]
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Navy Performance */}
          <div className="space-y-3">
            <h5 className="text-lg font-bold text-purple-400 text-center">
              🎯 PERFORMANCE
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Avg Accuracy:</span>
                <span className="text-cyan-300">
                  {fleetPerformance.averageAccuracy.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Hull:</span>
                <span className="text-cyan-300">
                  {fleetPerformance.averageHull.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Speed:</span>
                <span className="text-cyan-300">
                  {fleetPerformance.averageSpeed.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Combat Power:</span>
                <span className="text-cyan-300">
                  {fleetPerformance.totalCombatPower.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Efficiency:</span>
                <span className="text-cyan-300">
                  {fleetPerformance.navyEfficiency.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Navy Tiers */}
          <div className="space-y-3">
            <h5 className="text-lg font-bold text-purple-400 text-center">
              🏆 NAVY TIERS
            </h5>
            <div className="space-y-2 text-sm">
              {Object.entries(fleetTiers).map(([tier, count]) => (
                <div key={tier} className="flex justify-between">
                  <span
                    className={`font-bold ${
                      tier === "S"
                        ? "text-yellow-400"
                        : tier === "A"
                        ? "text-green-400"
                        : tier === "B"
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                  >
                    {tier} Tier:
                  </span>
                  <span className="text-cyan-300">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment Composition */}
          <div className="space-y-3">
            <h5 className="text-lg font-bold text-purple-400 text-center">
              ⚔️ EQUIPMENT
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Weapon Types:</span>
                <span className="text-cyan-300">
                  {Object.keys(fleetComposition.weaponTypes).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Armor Types:</span>
                <span className="text-cyan-300">
                  {Object.keys(fleetComposition.armorTypes).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shield Types:</span>
                <span className="text-cyan-300">
                  {Object.keys(fleetComposition.shieldTypes).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Special Types:</span>
                <span className="text-cyan-300">
                  {Object.keys(fleetComposition.specialTypes).length}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h5 className="text-lg font-bold text-purple-400 text-center">
              ⚡ PERFORMANCE
            </h5>
            <div className="space-y-2 text-sm">
              {performanceMetrics && (
                <>
                  <div className="flex justify-between">
                    <span>Processing:</span>
                    <span
                      className={`text-cyan-300 ${
                        performanceMetrics.isOptimized
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {performanceMetrics.processingTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ships/ms:</span>
                    <span className="text-cyan-300">
                      {performanceMetrics.shipsPerMs}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        performanceMetrics.isOptimized
                          ? "bg-green-400/20 text-green-400"
                          : "bg-yellow-400/20 text-yellow-400"
                      }`}
                    >
                      {performanceMetrics.isOptimized
                        ? "OPTIMIZED"
                        : "NEEDS OPTIMIZATION"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      {optimizationSuggestions.length > 0 && (
        <div className="bg-black/40 border border-amber-400 rounded-lg p-4 mb-8">
          <h4 className="text-lg font-bold text-amber-400 mb-3 text-center">
            💡 OPTIMIZATION SUGGESTIONS
          </h4>
          <div className="space-y-2">
            {optimizationSuggestions.slice(0, 3).map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-black/20 rounded border border-amber-400/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        suggestion.priority === "high"
                          ? "bg-red-400/20 text-red-400"
                          : suggestion.priority === "medium"
                          ? "bg-yellow-400/20 text-yellow-400"
                          : "bg-blue-400/20 text-blue-400"
                      }`}
                    >
                      {suggestion.priority.toUpperCase()}
                    </span>
                    <span className="font-bold">{suggestion.message}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    <span className="text-amber-400">Impact:</span>{" "}
                    {suggestion.impact}
                  </div>
                </div>
                <button className="px-3 py-1 border border-amber-400 text-amber-400 hover:border-amber-300 hover:text-amber-300 hover:bg-amber-400/10 rounded font-mono text-xs transition-all duration-200">
                  {suggestion.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          onClick={() => constructAllShips()}
          disabled={isPending || fleetStats.unconstructedShips === 0}
          className="px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "[CONSTRUCTING...]" : "[CONSTRUCT ALL SHIPS]"}
        </button>

        <button
          onClick={() => setShowShipPurchase(true)}
          className="px-6 py-3 rounded-lg border-2 border-blue-400 text-blue-400 hover:border-blue-300 hover:text-blue-300 hover:bg-blue-400/10 font-mono font-bold tracking-wider transition-all duration-200"
        >
          [BUY NEW SHIPS]
        </button>

        {selectedShips.size > 0 && (
          <button
            onClick={handleBulkRecycle}
            disabled={isPending}
            className="px-6 py-3 rounded-lg border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-200 disabled:cursor-not-allowed"
          >
            {isPending
              ? "[RECYCLING...]"
              : `[RECYCLE ${selectedShips.size} SHIPS]`}
          </button>
        )}
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
                  e.target.value as "all" | "constructed" | "unconstructed"
                )
              }
              className="bg-black/60 border border-cyan-400 text-cyan-300 px-3 py-1 rounded font-mono text-sm"
            >
              <option value="all">ALL SHIPS</option>
              <option value="constructed">CONSTRUCTED</option>
              <option value="unconstructed">UNCONSTRUCTED</option>
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
              <div
                key={ship.id.toString()}
                className={`border rounded-lg p-4 ${
                  ship.shipData.constructed
                    ? "border-green-400 bg-black/40"
                    : "border-amber-400 bg-black/60"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedShips.has(ship.id.toString())}
                      onChange={() => toggleShipSelection(ship.id.toString())}
                      className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
                    />
                    <h5 className="font-bold text-lg">
                      {ship.name || `Ship #${ship.id}`}
                    </h5>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      ship.shipData.constructed
                        ? "bg-green-400/20 text-green-400"
                        : "bg-amber-400/20 text-amber-400"
                    }`}
                  >
                    {ship.shipData.constructed
                      ? "CONSTRUCTED"
                      : "UNCONSTRUCTED"}
                  </span>
                </div>

                {ship.shipData.constructed ? (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-60">Accuracy:</span>
                        <span className="ml-2">{ship.traits.accuracy}</span>
                      </div>
                      <div>
                        <span className="opacity-60">Hull:</span>
                        <span className="ml-2">{ship.traits.hull}</span>
                      </div>
                      <div>
                        <span className="opacity-60">Speed:</span>
                        <span className="ml-2">{ship.traits.speed}</span>
                      </div>
                      <div>
                        <span className="opacity-60">Cost:</span>
                        <span className="ml-2">{ship.shipData.cost}</span>
                      </div>
                    </div>

                    {/* Ship Rarity Indicator */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="opacity-60 text-xs">Rarity:</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            ship.shipData.shiny
                              ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                              : "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                          }`}
                        >
                          {ship.shipData.shiny ? "SHINY ✨" : "COMMON"}
                        </span>
                      </div>
                      <div className="text-xs opacity-60">
                        SN: {ship.traits.serialNumber.toString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-60">Weapon:</span>
                        <span className="ml-2">
                          {ship.equipment.mainWeapon}
                        </span>
                      </div>
                      <div>
                        <span className="opacity-60">Armor:</span>
                        <span className="ml-2">{ship.equipment.armor}</span>
                      </div>
                      <div>
                        <span className="opacity-60">Shields:</span>
                        <span className="ml-2">{ship.equipment.shields}</span>
                      </div>
                      <div>
                        <span className="opacity-60">Special:</span>
                        <span className="ml-2">{ship.equipment.special}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-cyan-400/30">
                      <button
                        onClick={() => recycleShips([ship.id])}
                        disabled={isPending}
                        className="w-full px-3 py-2 border border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending ? "[RECYCLING...]" : "[RECYCLE FOR UC]"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm opacity-80 mb-3">
                      Ship not yet constructed
                    </p>
                    <button
                      onClick={() => constructShip(ship.id)}
                      disabled={isPending}
                      className="px-4 py-2 rounded border border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "[CONSTRUCTING...]" : "[CONSTRUCT]"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageNavy;
