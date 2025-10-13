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

  // State for editing
  const [editingCosts, setEditingCosts] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [newCosts, setNewCosts] = useState<Partial<Costs>>({});
  const [newAttributesVersion, setNewAttributesVersion] = useState<{
    baseHull?: number;
    baseSpeed?: number;
  }>({});

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
              </div>

              {/* Gun Data */}
              <div className="bg-gray-800 rounded p-3">
                <h4 className="text-white font-mono mb-2">Gun Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { gun: gun0, name: "Laser" },
                    { gun: gun1, name: "Railgun" },
                    { gun: gun2, name: "Missile Launcher" },
                    { gun: gun3, name: "Plasma Cannon" },
                  ].map(({ gun, name }, index) => {
                    const gunData = gun.data as GunData | undefined;

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {gunData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Range:</span>
                              <span className="text-white">
                                {gunData.range}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Damage:</span>
                              <span className="text-white">
                                {gunData.damage}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              <span className="text-white">
                                {gunData.movement}
                              </span>
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
                    { armor: armor0, name: "None" },
                    { armor: armor1, name: "Light" },
                    { armor: armor2, name: "Medium" },
                    { armor: armor3, name: "Heavy" },
                  ].map(({ armor, name }, index) => {
                    const armorData = armor.data as ArmorData | undefined;

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {armorData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">DR:</span>
                              <span className="text-white">
                                {armorData.damageReduction}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              <span className="text-white">
                                {armorData.movement}
                              </span>
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
                    { shield: shield0, name: "None" },
                    { shield: shield1, name: "Light" },
                    { shield: shield2, name: "Medium" },
                    { shield: shield3, name: "Heavy" },
                  ].map(({ shield, name }, index) => {
                    const shieldData = shield.data as ShieldData | undefined;

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {shieldData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">DR:</span>
                              <span className="text-white">
                                {shieldData.damageReduction}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              <span className="text-white">
                                {shieldData.movement}
                              </span>
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
                    { special: special0, name: "None" },
                    { special: special1, name: "EMP" },
                    { special: special2, name: "Repair Drones" },
                    { special: special3, name: "Flak Array" },
                  ].map(({ special, name }, index) => {
                    const specialData = special.data as SpecialData | undefined;

                    return (
                      <div key={index} className="bg-gray-700 rounded p-2">
                        <h5 className="text-white font-mono text-sm mb-2">
                          {name}
                        </h5>
                        {specialData && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Range:</span>
                              <span className="text-white">
                                {specialData.range}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Strength:</span>
                              <span className="text-white">
                                {specialData.strength}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Movement:</span>
                              <span className="text-white">
                                {specialData.movement}
                              </span>
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
                    }}
                    onError={(error) => {
                      console.error("Failed to update base attributes:", error);
                      toast.error("Failed to update base attributes");
                    }}
                  >
                    Update Base Attributes
                  </TransactionButton>
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
