import React from "react";
import { useOwnedShips, useShipDetails, useShipActions } from "../hooks";
import { useAccount } from "wagmi";
import { Ship } from "../types/types";

const ManageFleet: React.FC = () => {
  const { address } = useAccount();
  const { ships, isLoading, error, hasShips, shipCount } = useOwnedShips();
  const { fleetStats } = useShipDetails();
  const { constructShip, constructAllShips, recycleShips, isPending } =
    useShipActions();

  if (!address) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE FLEET]
        </h3>
        <p className="text-lg opacity-80">
          Please connect your wallet to view your fleet
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE FLEET]
        </h3>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-3">Loading fleet data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-cyan-300 font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE FLEET]
        </h3>
        <p className="text-red-400 text-lg">
          Error loading fleet: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [MANAGE FLEET]
      </h3>

      {/* Fleet Statistics */}
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          onClick={() => constructAllShips()}
          disabled={isPending || fleetStats.unconstructedShips === 0}
          className="px-6 py-3 rounded-lg border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "[CONSTRUCTING...]" : "[CONSTRUCT ALL SHIPS]"}
        </button>
      </div>

      {/* Ships Display */}
      {!hasShips ? (
        <div className="text-center">
          <p className="text-lg opacity-80 mb-4">
            No ships found in your fleet
          </p>
          <p className="text-sm opacity-60">Purchase ships to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-xl font-bold mb-4 text-center">
            [YOUR SHIPS] - {shipCount} Total
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ships.map((ship: Ship) => (
              <div
                key={ship.id.toString()}
                className={`border rounded-lg p-4 ${
                  ship.shipData.constructed
                    ? "border-green-400 bg-black/40"
                    : "border-amber-400 bg-black/60"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-bold text-lg">
                    {ship.name || `Ship #${ship.id}`}
                  </h5>
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

export default ManageFleet;
