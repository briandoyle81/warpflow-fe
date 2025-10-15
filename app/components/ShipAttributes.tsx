"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import {
  useShipAttributesOwner,
  useCurrentAttributesVersion,
  useCurrentCostsVersion,
  useCosts,
  useAttributesVersionBase,
  useGunData,
  useArmorData,
  useShieldData,
  useSpecialData,
  GunData,
  ArmorData,
  ShieldData,
  SpecialData,
  Costs,
} from "../hooks/useShipAttributesContract";
import { TransactionButton } from "./TransactionButton";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";

const ShipAttributes: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { owner, isOwner } = useShipAttributesOwner();

  // Current versions
  const { data: currentAttributesVersion } = useCurrentAttributesVersion();
  const { data: currentCostsVersion } = useCurrentCostsVersion();

  // Costs data
  const { data: costsData } = useCosts();
  const costs =
    Array.isArray(costsData) && costsData.length > 1
      ? (costsData[1] as Costs)
      : undefined;

  // Attributes version base data
  const { data: attributesBaseData } = useAttributesVersionBase(
    Number(currentAttributesVersion) || 1
  );

  // Equipment data - individual hooks for each equipment type
  const gun0 = useGunData(0); // Laser
  const gun1 = useGunData(1); // Railgun
  const gun2 = useGunData(2); // Missile Launcher
  const gun3 = useGunData(3); // Plasma Cannon

  const armor0 = useArmorData(0); // None
  const armor1 = useArmorData(1); // Light
  const armor2 = useArmorData(2); // Medium
  const armor3 = useArmorData(3); // Heavy

  const shield0 = useShieldData(0); // None
  const shield1 = useShieldData(1); // Light
  const shield2 = useShieldData(2); // Medium
  const shield3 = useShieldData(3); // Heavy

  const special0 = useSpecialData(0); // None
  const special1 = useSpecialData(1); // EMP
  const special2 = useSpecialData(2); // Repair Drones
  const special3 = useSpecialData(3); // Flak Array

  // Debug: Log special data loading status
  React.useEffect(() => {
    console.log("Special data loading status:", {
      special0: special0.data,
      special1: special1.data,
      special2: special2.data,
      special3: special3.data,
      special0Loading: special0.isLoading,
      special1Loading: special1.isLoading,
      special2Loading: special2.isLoading,
      special3Loading: special3.isLoading,
    });
  }, [
    special0.data,
    special1.data,
    special2.data,
    special3.data,
    special0.isLoading,
    special1.isLoading,
    special2.isLoading,
    special3.isLoading,
  ]);

  // State for editing
  const [editingCosts, setEditingCosts] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [newCosts, setNewCosts] = useState<Partial<Costs>>({});
  const [newAttributesVersion, setNewAttributesVersion] = useState<{
    baseHull?: number;
    baseSpeed?: number;
  }>({});
  const [newGunData, setNewGunData] = useState<Partial<GunData>[]>([]);
  const [newArmorData, setNewArmorData] = useState<Partial<ArmorData>[]>([]);
  const [newShieldData, setNewShieldData] = useState<Partial<ShieldData>[]>([]);
  const [newSpecialData, setNewSpecialData] = useState<Partial<SpecialData>[]>(
    []
  );
  // Editable arrays for attributes
  const [newForeAccuracy, setNewForeAccuracy] = useState<number[] | null>(null);
  const [newHullBonuses, setNewHullBonuses] = useState<number[] | null>(null);
  const [newEngineSpeeds, setNewEngineSpeeds] = useState<number[] | null>(null);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">
          Please connect your wallet to view ship attributes.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">
          Access denied. Only the contract owner can edit ship attributes.
        </p>
        <p className="text-gray-400 text-sm mt-2">Owner: {owner}</p>
        <p className="text-gray-400 text-sm">Your address: {address}</p>
      </div>
    );
  }

  // Check if any critical data is still loading
  const isDataLoading =
    gun0.isLoading ||
    gun1.isLoading ||
    gun2.isLoading ||
    gun3.isLoading ||
    armor0.isLoading ||
    armor1.isLoading ||
    armor2.isLoading ||
    armor3.isLoading ||
    shield0.isLoading ||
    shield1.isLoading ||
    shield2.isLoading ||
    shield3.isLoading ||
    special0.isLoading ||
    special1.isLoading ||
    special2.isLoading ||
    special3.isLoading;

  if (isDataLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Loading ship attributes data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-mono text-white mb-4">
          Ship Attributes Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-white font-mono mb-2">Current Versions</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Attributes Version:</span>
                <span className="text-white">
                  {currentAttributesVersion?.toString() || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Costs Version:</span>
                <span className="text-white">
                  {currentCostsVersion?.toString() || "Loading..."}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-white font-mono mb-2">Contract Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Owner:</span>
                <span className="text-white font-mono text-xs">{owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Address:</span>
                <span className="text-white font-mono text-xs">{address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Costs Management */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-mono text-white">Costs Management</h3>
          <button
            onClick={() => setEditingCosts(!editingCosts)}
            className="px-4 py-2 bg-blue-600 text-white rounded font-mono hover:bg-blue-700 transition-colors"
          >
            {editingCosts ? "Cancel" : "Edit Costs"}
          </button>
        </div>

        {costs && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Base Cost</h4>
                {editingCosts ? (
                  <input
                    type="number"
                    value={newCosts.baseCost ?? costs.baseCost}
                    onChange={(e) =>
                      setNewCosts({
                        ...newCosts,
                        baseCost: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono"
                  />
                ) : (
                  <span className="text-white">{costs.baseCost}</span>
                )}
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Accuracy Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.accuracy.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Level {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Hull Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.hull.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Level {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Speed Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.speed.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Level {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Main Weapon Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.mainWeapon.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Weapon {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Armor Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.armor.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Armor {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Shield Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.shields.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Shield {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Special Costs</h4>
                <div className="space-y-1 text-sm">
                  {costs.special.map((cost, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-400">Special {index}:</span>
                      <span className="text-white">{cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {editingCosts && (
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingCosts(false);
                    setNewCosts({});
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <TransactionButton
                  transactionId="update-costs"
                  contractAddress={
                    CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`
                  }
                  abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                  functionName="setCosts"
                  args={[
                    {
                      ...costs,
                      ...newCosts,
                      version: costs.version + 1,
                    },
                  ]}
                  className="px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
                  onSuccess={() => {
                    toast.success("Costs updated successfully!");
                    setEditingCosts(false);
                    setNewCosts({});
                  }}
                  onError={(error) => {
                    console.error("Failed to update costs:", error);
                    toast.error("Failed to update costs");
                  }}
                >
                  Update Costs
                </TransactionButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attributes Management */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-mono text-white">
            Attributes Management
          </h3>
          <button
            onClick={() => setEditingAttributes(!editingAttributes)}
            className="px-4 py-2 bg-blue-600 text-white rounded font-mono hover:bg-blue-700 transition-colors"
          >
            {editingAttributes ? "Cancel" : "Edit Attributes"}
          </button>
        </div>

        {(() => {
          if (
            !attributesBaseData ||
            !Array.isArray(attributesBaseData) ||
            attributesBaseData.length < 3
          ) {
            return null;
          }
          const baseData = attributesBaseData as [number, number, number];
          return (
            <div className="space-y-4">
              {/* Base Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded p-3">
                  <h4 className="text-white font-mono mb-2">Base Attributes</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-gray-400 text-sm">
                        Base Hull:
                      </label>
                      {editingAttributes ? (
                        <input
                          type="number"
                          value={newAttributesVersion.baseHull ?? baseData[1]}
                          onChange={(e) =>
                            setNewAttributesVersion({
                              ...newAttributesVersion,
                              baseHull: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono mt-1"
                        />
                      ) : (
                        <div className="text-white">{baseData[1]}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">
                        Base Speed:
                      </label>
                      {editingAttributes ? (
                        <input
                          type="number"
                          value={newAttributesVersion.baseSpeed ?? baseData[2]}
                          onChange={(e) =>
                            setNewAttributesVersion({
                              ...newAttributesVersion,
                              baseSpeed: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono mt-1"
                        />
                      ) : (
                        <div className="text-white">{baseData[2]}</div>
                      )}
                    </div>
                  </div>
                </div>
                {editingAttributes && (
                  <div className="bg-gray-800 rounded p-3">
                    <h4 className="text-white font-mono mb-2">Global Arrays</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-gray-400">
                          Fore Accuracy (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={(newForeAccuracy ?? [0, 25, 50]).join(",")}
                          onChange={(e) => {
                            const parts = e.target.value
                              .split(",")
                              .map((p) => p.trim())
                              .filter((p) => p.length > 0)
                              .map((p) => Number(p));
                            setNewForeAccuracy(parts);
                          }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400">
                          Hull Bonuses (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={(newHullBonuses ?? [0, 10, 20]).join(",")}
                          onChange={(e) => {
                            const parts = e.target.value
                              .split(",")
                              .map((p) => p.trim())
                              .filter((p) => p.length > 0)
                              .map((p) => Number(p));
                            setNewHullBonuses(parts);
                          }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400">
                          Engine Speeds (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={(newEngineSpeeds ?? [0, 1, 2]).join(",")}
                          onChange={(e) => {
                            const parts = e.target.value
                              .split(",")
                              .map((p) => p.trim())
                              .filter((p) => p.length > 0)
                              .map((p) => Number(p));
                            setNewEngineSpeeds(parts);
                          }}
                          className="w-full px-2 py-1 bg-gray-700 text-white rounded font-mono mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gun Data */}
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Gun Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { gun: gun0, name: "Laser", index: 0 },
                    { gun: gun1, name: "Railgun", index: 1 },
                    { gun: gun2, name: "Missile Launcher", index: 2 },
                    { gun: gun3, name: "Plasma Cannon", index: 3 },
                  ].map(({ gun, name, index }) => {
                    const gunData = gun.data as GunData | undefined;
                    const currentGunData = newGunData[index] || {};

                    if (!gunData) {
                      return (
                        <div key={index} className="bg-gray-700 rounded p-2">
                          <h5 className="text-white font-mono text-sm mb-2">
                            {name} (Loading...)
                          </h5>
                          <div className="text-gray-400 text-xs">
                            Loading data...
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {gunData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Range:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={currentGunData.range ?? gunData.range}
                                  onChange={(e) => {
                                    const updated = [...newGunData];
                                    updated[index] = {
                                      ...updated[index],
                                      range: Number(e.target.value),
                                    };
                                    setNewGunData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {gunData.range}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Damage:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentGunData.damage ?? gunData.damage
                                  }
                                  onChange={(e) => {
                                    const updated = [...newGunData];
                                    updated[index] = {
                                      ...updated[index],
                                      damage: Number(e.target.value),
                                    };
                                    setNewGunData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {gunData.damage}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentGunData.movement ?? gunData.movement
                                  }
                                  onChange={(e) => {
                                    const updated = [...newGunData];
                                    updated[index] = {
                                      ...updated[index],
                                      movement: Number(e.target.value),
                                    };
                                    setNewGunData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {gunData.movement}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Armor Data */}
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Armor Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { armor: armor0, name: "None", index: 0 },
                    { armor: armor1, name: "Light", index: 1 },
                    { armor: armor2, name: "Medium", index: 2 },
                    { armor: armor3, name: "Heavy", index: 3 },
                  ].map(({ armor, name, index }) => {
                    const armorData = armor.data as ArmorData | undefined;
                    const currentArmorData = newArmorData[index] || {};

                    if (!armorData) {
                      return (
                        <div key={index} className="bg-gray-700 rounded p-2">
                          <h5 className="text-white font-mono text-sm mb-2">
                            {name} (Loading...)
                          </h5>
                          <div className="text-gray-400 text-xs">
                            Loading data...
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {armorData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">DR:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentArmorData.damageReduction ??
                                    armorData.damageReduction
                                  }
                                  onChange={(e) => {
                                    const updated = [...newArmorData];
                                    updated[index] = {
                                      ...updated[index],
                                      damageReduction: Number(e.target.value),
                                    };
                                    setNewArmorData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {armorData.damageReduction}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentArmorData.movement ??
                                    armorData.movement
                                  }
                                  onChange={(e) => {
                                    const updated = [...newArmorData];
                                    updated[index] = {
                                      ...updated[index],
                                      movement: Number(e.target.value),
                                    };
                                    setNewArmorData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {armorData.movement}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shield Data */}
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Shield Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { shield: shield0, name: "None", index: 0 },
                    { shield: shield1, name: "Light", index: 1 },
                    { shield: shield2, name: "Medium", index: 2 },
                    { shield: shield3, name: "Heavy", index: 3 },
                  ].map(({ shield, name, index }) => {
                    const shieldData = shield.data as ShieldData | undefined;
                    const currentShieldData = newShieldData[index] || {};

                    if (!shieldData) {
                      return (
                        <div key={index} className="bg-gray-700 rounded p-2">
                          <h5 className="text-white font-mono text-sm mb-2">
                            {name} (Loading...)
                          </h5>
                          <div className="text-gray-400 text-xs">
                            Loading data...
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {shieldData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">DR:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentShieldData.damageReduction ??
                                    shieldData.damageReduction
                                  }
                                  onChange={(e) => {
                                    const updated = [...newShieldData];
                                    updated[index] = {
                                      ...updated[index],
                                      damageReduction: Number(e.target.value),
                                    };
                                    setNewShieldData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {shieldData.damageReduction}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  value={
                                    currentShieldData.movement ??
                                    shieldData.movement
                                  }
                                  onChange={(e) => {
                                    const updated = [...newShieldData];
                                    updated[index] = {
                                      ...updated[index],
                                      movement: Number(e.target.value),
                                    };
                                    setNewShieldData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {shieldData.movement}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Data */}
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Special Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { special: special0, name: "None", index: 0 },
                    { special: special1, name: "EMP", index: 1 },
                    { special: special2, name: "Repair Drones", index: 2 },
                    { special: special3, name: "Flak Array", index: 3 },
                  ].map(({ special, name, index }) => {
                    const specialData = special.data as SpecialData | undefined;
                    const currentSpecialData = newSpecialData[index] || {};

                    if (!specialData) {
                      return (
                        <div key={index} className="bg-gray-700 rounded p-2">
                          <h5 className="text-white font-mono text-sm mb-2">
                            {name} (Loading...)
                          </h5>
                          <div className="text-gray-400 text-xs">
                            Loading data...
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {specialData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Range:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="255"
                                  value={
                                    currentSpecialData.range ??
                                    specialData.range
                                  }
                                  onChange={(e) => {
                                    const value = Math.max(
                                      0,
                                      Math.min(255, Number(e.target.value))
                                    );
                                    const updated = [...newSpecialData];
                                    updated[index] = {
                                      ...updated[index],
                                      range: value,
                                    };
                                    setNewSpecialData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {specialData.range}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Strength:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="255"
                                  value={
                                    currentSpecialData.strength ??
                                    specialData.strength
                                  }
                                  onChange={(e) => {
                                    const value = Math.max(
                                      0,
                                      Math.min(255, Number(e.target.value))
                                    );
                                    const updated = [...newSpecialData];
                                    updated[index] = {
                                      ...updated[index],
                                      strength: value,
                                    };
                                    setNewSpecialData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {specialData.strength}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              {editingAttributes ? (
                                <input
                                  type="number"
                                  min="-128"
                                  max="127"
                                  value={
                                    currentSpecialData.movement ??
                                    specialData.movement
                                  }
                                  onChange={(e) => {
                                    const value = Math.max(
                                      -128,
                                      Math.min(127, Number(e.target.value))
                                    );
                                    const updated = [...newSpecialData];
                                    updated[index] = {
                                      ...updated[index],
                                      movement: value,
                                    };
                                    setNewSpecialData(updated);
                                  }}
                                  className="w-16 px-1 py-0.5 bg-gray-600 text-white rounded text-xs"
                                />
                              ) : (
                                <span className="text-white">
                                  {specialData.movement}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingAttributes && (
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingAttributes(false);
                      setNewAttributesVersion({});
                      setNewGunData([]);
                      setNewArmorData([]);
                      setNewShieldData([]);
                      setNewSpecialData([]);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <TransactionButton
                    transactionId="update-attributes-base"
                    contractAddress={
                      CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`
                    }
                    abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                    functionName="setAttributesVersionBase"
                    args={[
                      Number(currentAttributesVersion) || 1,
                      newAttributesVersion.baseHull ?? baseData[1],
                      newAttributesVersion.baseSpeed ?? baseData[2],
                    ]}
                    className="px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
                    onSuccess={() => {
                      toast.success("Base attributes updated successfully!");
                      setEditingAttributes(false);
                      setNewAttributesVersion({});
                      setNewGunData([]);
                      setNewArmorData([]);
                      setNewShieldData([]);
                      setNewSpecialData([]);
                    }}
                    onError={(error) => {
                      console.error("Failed to update base attributes:", error);
                      toast.error("Failed to update base attributes");
                    }}
                  >
                    Update Base Attributes
                  </TransactionButton>

                  {/* Update All Attributes */}
                  {(newGunData.some(
                    (gun) => gun && Object.keys(gun).length > 0
                  ) ||
                    newArmorData.some(
                      (armor) => armor && Object.keys(armor).length > 0
                    ) ||
                    newShieldData.some(
                      (shield) => shield && Object.keys(shield).length > 0
                    ) ||
                    newSpecialData.some(
                      (special) => special && Object.keys(special).length > 0
                    ) ||
                    Object.keys(newAttributesVersion).length > 0 ||
                    (newForeAccuracy && newForeAccuracy.length > 0) ||
                    (newHullBonuses && newHullBonuses.length > 0) ||
                    (newEngineSpeeds && newEngineSpeeds.length > 0)) && (
                    <TransactionButton
                      transactionId="update-all-attributes"
                      contractAddress={
                        CONTRACT_ADDRESSES.SHIP_ATTRIBUTES as `0x${string}`
                      }
                      abi={CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi}
                      functionName="setAllAttributes"
                      args={[
                        // Base attributes
                        newAttributesVersion.baseHull ??
                          (
                            attributesBaseData as [number, number, number]
                          )?.[1] ??
                          100,
                        newAttributesVersion.baseSpeed ??
                          (
                            attributesBaseData as [number, number, number]
                          )?.[2] ??
                          3,

                        // Gun data array
                        [
                          {
                            range:
                              newGunData[0]?.range ??
                              (gun0.data as GunData)?.range ??
                              6,
                            damage:
                              newGunData[0]?.damage ??
                              (gun0.data as GunData)?.damage ??
                              25,
                            movement:
                              newGunData[0]?.movement ??
                              (gun0.data as GunData)?.movement ??
                              0,
                          },
                          {
                            range:
                              newGunData[1]?.range ??
                              (gun1.data as GunData)?.range ??
                              10,
                            damage:
                              newGunData[1]?.damage ??
                              (gun1.data as GunData)?.damage ??
                              20,
                            movement:
                              newGunData[1]?.movement ??
                              (gun1.data as GunData)?.movement ??
                              0,
                          },
                          {
                            range:
                              newGunData[2]?.range ??
                              (gun2.data as GunData)?.range ??
                              8,
                            damage:
                              newGunData[2]?.damage ??
                              (gun2.data as GunData)?.damage ??
                              30,
                            movement:
                              newGunData[2]?.movement ??
                              (gun2.data as GunData)?.movement ??
                              -1,
                          },
                          {
                            range:
                              newGunData[3]?.range ??
                              (gun3.data as GunData)?.range ??
                              3,
                            damage:
                              newGunData[3]?.damage ??
                              (gun3.data as GunData)?.damage ??
                              40,
                            movement:
                              newGunData[3]?.movement ??
                              (gun3.data as GunData)?.movement ??
                              0,
                          },
                        ],

                        // Armor data array
                        [
                          {
                            damageReduction:
                              newArmorData[0]?.damageReduction ??
                              (armor0.data as ArmorData)?.damageReduction ??
                              0,
                            movement:
                              newArmorData[0]?.movement ??
                              (armor0.data as ArmorData)?.movement ??
                              1,
                          },
                          {
                            damageReduction:
                              newArmorData[1]?.damageReduction ??
                              (armor1.data as ArmorData)?.damageReduction ??
                              15,
                            movement:
                              newArmorData[1]?.movement ??
                              (armor1.data as ArmorData)?.movement ??
                              0,
                          },
                          {
                            damageReduction:
                              newArmorData[2]?.damageReduction ??
                              (armor2.data as ArmorData)?.damageReduction ??
                              30,
                            movement:
                              newArmorData[2]?.movement ??
                              (armor2.data as ArmorData)?.movement ??
                              -1,
                          },
                          {
                            damageReduction:
                              newArmorData[3]?.damageReduction ??
                              (armor3.data as ArmorData)?.damageReduction ??
                              45,
                            movement:
                              newArmorData[3]?.movement ??
                              (armor3.data as ArmorData)?.movement ??
                              -2,
                          },
                        ],

                        // Shield data array
                        [
                          {
                            damageReduction:
                              newShieldData[0]?.damageReduction ??
                              (shield0.data as ShieldData)?.damageReduction ??
                              0,
                            movement:
                              newShieldData[0]?.movement ??
                              (shield0.data as ShieldData)?.movement ??
                              1,
                          },
                          {
                            damageReduction:
                              newShieldData[1]?.damageReduction ??
                              (shield1.data as ShieldData)?.damageReduction ??
                              15,
                            movement:
                              newShieldData[1]?.movement ??
                              (shield1.data as ShieldData)?.movement ??
                              1,
                          },
                          {
                            damageReduction:
                              newShieldData[2]?.damageReduction ??
                              (shield2.data as ShieldData)?.damageReduction ??
                              30,
                            movement:
                              newShieldData[2]?.movement ??
                              (shield2.data as ShieldData)?.movement ??
                              0,
                          },
                          {
                            damageReduction:
                              newShieldData[3]?.damageReduction ??
                              (shield3.data as ShieldData)?.damageReduction ??
                              45,
                            movement:
                              newShieldData[3]?.movement ??
                              (shield3.data as ShieldData)?.movement ??
                              -1,
                          },
                        ],

                        // Special data array
                        [
                          {
                            range:
                              newSpecialData[0]?.range ??
                              (special0.data as SpecialData)?.range ??
                              0,
                            strength:
                              newSpecialData[0]?.strength ??
                              (special0.data as SpecialData)?.strength ??
                              0,
                            movement:
                              newSpecialData[0]?.movement ??
                              (special0.data as SpecialData)?.movement ??
                              0,
                          },
                          {
                            range:
                              newSpecialData[1]?.range ??
                              (special1.data as SpecialData)?.range ??
                              1,
                            strength:
                              newSpecialData[1]?.strength ??
                              (special1.data as SpecialData)?.strength ??
                              1,
                            movement:
                              newSpecialData[1]?.movement ??
                              (special1.data as SpecialData)?.movement ??
                              0,
                          },
                          {
                            range:
                              newSpecialData[2]?.range ??
                              (special2.data as SpecialData)?.range ??
                              6,
                            strength:
                              newSpecialData[2]?.strength ??
                              (special2.data as SpecialData)?.strength ??
                              20,
                            movement:
                              newSpecialData[2]?.movement ??
                              (special2.data as SpecialData)?.movement ??
                              0,
                          },
                          {
                            range:
                              newSpecialData[3]?.range ??
                              (special3.data as SpecialData)?.range ??
                              4,
                            strength:
                              newSpecialData[3]?.strength ??
                              (special3.data as SpecialData)?.strength ??
                              15,
                            movement:
                              newSpecialData[3]?.movement ??
                              (special3.data as SpecialData)?.movement ??
                              0,
                          },
                        ],

                        // Fore accuracy array (editable or default)
                        newForeAccuracy && newForeAccuracy.length > 0
                          ? newForeAccuracy
                          : [0, 25, 50],
                        // Hull bonuses array (editable or default)
                        newHullBonuses && newHullBonuses.length > 0
                          ? newHullBonuses
                          : [0, 10, 20],
                        // Engine speeds array (editable or default)
                        newEngineSpeeds && newEngineSpeeds.length > 0
                          ? newEngineSpeeds
                          : [0, 1, 2],
                      ]}
                      className="px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
                      onSuccess={() => {
                        toast.success("All attributes updated successfully!");
                        setNewGunData([]);
                        setNewArmorData([]);
                        setNewShieldData([]);
                        setNewSpecialData([]);
                        setNewAttributesVersion({});
                      }}
                      onError={(error) => {
                        console.error(
                          "Failed to update all attributes:",
                          error
                        );
                        toast.error("Failed to update all attributes");
                      }}
                    >
                      Update All Attributes
                    </TransactionButton>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ShipAttributes;
