"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useAccount, useReadContract } from "wagmi";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";

const ShipConstructor: React.FC = () => {
  const { address } = useAccount();
  const { ships, isLoading: isLoadingShips } = useOwnedShips();
  const [mode, setMode] = useState<"create" | "customize">("customize");
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  // Store the original ship snapshot when it's first loaded
  const [originalShipSnapshot, setOriginalShipSnapshot] = useState<Ship | null>(null);
  const isEditingExisting = mode === "customize";
  const controlsDisabled = isEditingExisting && !selectedShipId;

  // Equipment state
  const [mainWeapon, setMainWeapon] = useState<number>(0);
  const [armor, setArmor] = useState<number>(0);
  const [shields, setShields] = useState<number>(0);
  const [special, setSpecial] = useState<number>(0);

  // Traits state
  const [accuracy, setAccuracy] = useState<number>(0);
  const [hull, setHull] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [variant, setVariant] = useState<number>(0);
  const [shipName, setShipName] = useState<string>("Constructor Preview");

  // Colors state
  const [h1, setH1] = useState<number>(220);
  const [s1, setS1] = useState<number>(50);
  const [l1, setL1] = useState<number>(50);
  const [h2, setH2] = useState<number>(220);
  const [s2, setS2] = useState<number>(50);
  const [l2, setL2] = useState<number>(50);

  // ShipData state
  const [shiny, setShiny] = useState<boolean>(false);
  const [constructed, setConstructed] = useState<boolean>(true);

  // Load ship data when a ship is selected
  useEffect(() => {
    if (mode === "customize" && selectedShipId && ships) {
      // Only allow constructed ships to be customized
      const ship = ships.find(
        (s) => s.id === selectedShipId && s.shipData.constructed
      );
      if (ship) {
        // Store a snapshot of the original ship for comparison
        setOriginalShipSnapshot({ ...ship });
        setShipName(ship.name);
        setMainWeapon(ship.equipment.mainWeapon);
        setArmor(ship.equipment.armor);
        setShields(ship.equipment.shields);
        setSpecial(ship.equipment.special);
        setAccuracy(ship.traits.accuracy);
        setHull(ship.traits.hull);
        setSpeed(ship.traits.speed);
        setVariant(ship.traits.variant);
        setH1(ship.traits.colors.h1);
        setS1(ship.traits.colors.s1);
        setL1(ship.traits.colors.l1);
        setH2(ship.traits.colors.h2);
        setS2(ship.traits.colors.s2);
        setL2(ship.traits.colors.l2);
        setShiny(ship.shipData.shiny);
        setConstructed(ship.shipData.constructed);
      }
    } else if (mode === "create") {
      // Reset to defaults when switching to create mode
      setShipName("Constructor Preview");
      setMainWeapon(0);
      setArmor(0);
      setShields(0);
      setSpecial(0);
      setAccuracy(0);
      setHull(0);
      setSpeed(0);
      setVariant(0);
      setH1(220);
      setS1(50);
      setL1(50);
      setH2(220);
      setS2(50);
      setL2(50);
      setShiny(false);
      setConstructed(true);
      setSelectedShipId(null);
      setOriginalShipSnapshot(null);
    }
  }, [mode, selectedShipId, ships]);

  // Create a mock ship object for rendering
  const mockShip: Ship = useMemo(
    () => ({
      name: shipName,
      id: selectedShipId || BigInt(0),
      equipment: {
        mainWeapon,
        armor,
        shields,
        special,
      },
      traits: {
        serialNumber: selectedShipId || BigInt(0),
        colors: {
          h1,
          s1,
          l1,
          h2,
          s2,
          l2,
        },
        variant,
        accuracy,
        hull,
        speed,
      },
      shipData: {
        shipsDestroyed: 0,
        costsVersion: 0,
        cost: 0,
        shiny,
        constructed,
        inFleet: false,
        timestampDestroyed: BigInt(0),
      },
      owner: address || ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    }),
    [
      shipName,
      selectedShipId,
      mainWeapon,
      armor,
      shields,
      special,
      accuracy,
      hull,
      speed,
      variant,
      h1,
      s1,
      l1,
      h2,
      s2,
      l2,
      shiny,
      constructed,
      address,
    ]
  );

  // Render the ship using local renderer
  const shipImageDataUrl = useMemo(() => {
    try {
      return renderShip(mockShip);
    } catch (error) {
      console.error("Error rendering ship:", error);
      return null;
    }
  }, [mockShip]);

  // Use the snapshot for comparison instead of looking it up each time
  // This ensures we're comparing against the original values when the ship was first loaded
  const originalShip = originalShipSnapshot;

  // Build the Ship struct in the format expected by DroneYard
  const buildDroneYardShipStruct = useMemo(() => {
    if (!selectedShipId || !originalShip) return null;

    // Colors and extra fields may not be present in the TypeScript type,
    // but they exist on-chain and in the ABI, so we read them defensively.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorsAny = originalShip.traits.colors as any;
    const h3 = typeof colorsAny?.h3 === "number" ? colorsAny.h3 : 0;
    const s3 = typeof colorsAny?.s3 === "number" ? colorsAny.s3 : 0;
    const l3 = typeof colorsAny?.l3 === "number" ? colorsAny.l3 : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shipDataAny = originalShip.shipData as any;
    const isFreeShip =
      typeof shipDataAny?.isFreeShip === "boolean" ? shipDataAny.isFreeShip : false;

    return [
      shipName, // name
      selectedShipId, // id
      [
        mainWeapon, // equipment.mainWeapon
        armor, // equipment.armor
        shields, // equipment.shields
        special, // equipment.special
      ],
      [
        BigInt(originalShip.traits.serialNumber), // traits.serialNumber (preserve original)
        [
          h1, // colors.h1
          s1, // colors.s1
          l1, // colors.l1
          h2, // colors.h2
          s2, // colors.s2
          l2, // colors.l2
          h3, // colors.h3 (preserve or default)
          s3, // colors.s3
          l3, // colors.l3
        ],
        variant, // traits.variant
        accuracy, // traits.accuracy
        hull, // traits.hull
        speed, // traits.speed
      ],
      [
        originalShip.shipData.shipsDestroyed, // shipData.shipsDestroyed
        originalShip.shipData.costsVersion, // shipData.costsVersion
        originalShip.shipData.cost, // shipData.cost
        typeof shipDataAny?.modified === "number" ? shipDataAny.modified : 0, // shipData.modified
        shiny, // shipData.shiny
        constructed, // shipData.constructed
        originalShip.shipData.inFleet, // shipData.inFleet
        isFreeShip, // shipData.isFreeShip
        BigInt(originalShip.shipData.timestampDestroyed), // shipData.timestampDestroyed
      ],
      address || "0x0000000000000000000000000000000000000000", // owner
    ];
  }, [
    address,
    accuracy,
    armor,
    constructed,
    h1,
    h2,
    l1,
    l2,
    mainWeapon,
    originalShip,
    s1,
    s2,
    selectedShipId,
    shiny,
    shields,
    shipName,
    special,
    hull,
    speed,
    variant,
  ]);

  // Read the on-chain UTC cost to modify this ship via DroneYard
  const { data: modificationCost, refetch: refetchModificationCost } = useReadContract({
    address: CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: CONTRACT_ABIS.DRONE_YARD as any,
    functionName: "calculateCostToModify",
    args:
      mode === "customize" && selectedShipId && buildDroneYardShipStruct
        ? [selectedShipId, buildDroneYardShipStruct]
        : undefined,
    query: {
      enabled: mode === "customize" && !!selectedShipId && !!buildDroneYardShipStruct,
    },
  });

  // Read UTC allowance and balance for DroneYard
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as any,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: mode === "customize" && !!address },
  });

  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as any,
    functionName: "allowance",
    args:
      address && CONTRACT_ADDRESSES.DRONE_YARD
        ? [address, CONTRACT_ADDRESSES.DRONE_YARD]
        : undefined,
    query: { enabled: mode === "customize" && !!address },
  });

  const needsApproval =
    mode === "customize" &&
    modificationCost !== undefined &&
    modificationCost !== null &&
    utcAllowance !== undefined &&
    (utcAllowance as bigint) < (modificationCost as bigint);

  // Calculate a human-readable list of changes (purely UI; cost is from contract)
  const changes = useMemo(() => {
    if (mode !== "customize" || !originalShip) return [];

    const list: string[] = [];

    // Equipment changes
    if (originalShip.equipment.mainWeapon !== mainWeapon) {
      list.push(`Main Weapon: ${originalShip.equipment.mainWeapon} → ${mainWeapon}`);
    }
    if (originalShip.equipment.armor !== armor) {
      list.push(`Armor: ${originalShip.equipment.armor} → ${armor}`);
    }
    if (originalShip.equipment.shields !== shields) {
      list.push(`Shields: ${originalShip.equipment.shields} → ${shields}`);
    }
    if (originalShip.equipment.special !== special) {
      list.push(`Special: ${originalShip.equipment.special} → ${special}`);
    }

    // Traits changes
    if (originalShip.traits.accuracy !== accuracy) {
      list.push(`Accuracy: ${originalShip.traits.accuracy} → ${accuracy}`);
    }
    if (originalShip.traits.hull !== hull) {
      list.push(`Hull: ${originalShip.traits.hull} → ${hull}`);
    }
    if (originalShip.traits.speed !== speed) {
      list.push(`Speed: ${originalShip.traits.speed} → ${speed}`);
    }
    if (originalShip.traits.variant !== variant) {
      list.push(`Variant: ${originalShip.traits.variant} → ${variant}`);
    }

    // Color changes
    if (
      originalShip.traits.colors.h1 !== h1 ||
      originalShip.traits.colors.s1 !== s1 ||
      originalShip.traits.colors.l1 !== l1 ||
      originalShip.traits.colors.h2 !== h2 ||
      originalShip.traits.colors.s2 !== s2 ||
      originalShip.traits.colors.l2 !== l2
    ) {
      list.push("Colors: Modified");
    }

    // Ship data changes
    if (originalShip.name !== shipName) {
      list.push(`Name: "${originalShip.name}" → "${shipName}"`);
    }
    if (originalShip.shipData.shiny !== shiny) {
      list.push(
        `Shiny: ${originalShip.shipData.shiny ? "Yes" : "No"} → ${shiny ? "Yes" : "No"}`
      );
    }
    if (originalShip.shipData.constructed !== constructed) {
      list.push(
        `Constructed: ${
          originalShip.shipData.constructed ? "Yes" : "No"
        } → ${constructed ? "Yes" : "No"}`
      );
    }

    return list;
  }, [
    mode,
    originalShip,
    mainWeapon,
    armor,
    shields,
    special,
    accuracy,
    hull,
    speed,
    variant,
    h1,
    s1,
    l1,
    h2,
    s2,
    l2,
    shipName,
    shiny,
    constructed,
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-gray-900 rounded-lg p-6 border border-cyan-400/30">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("customize")}
                className={`px-4 py-2 rounded-lg border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
                  mode === "customize"
                    ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                    : "border-gray-600 text-gray-600 hover:border-gray-500 hover:text-gray-500"
                }`}
              >
                CUSTOMIZE
              </button>
              <button
                onClick={() => setMode("create")}
                className={`px-4 py-2 rounded-lg border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
                  mode === "create"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-400/10"
                    : "border-gray-600 text-gray-600 hover:border-gray-500 hover:text-gray-500"
                }`}
              >
                EXPLORE
              </button>
            </div>
          </div>
        </div>

        {mode === "customize" && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-sm font-bold text-cyan-300 mb-2 font-mono">
              SELECT SHIP TO CUSTOMIZE:
            </label>
            <select
              value={selectedShipId?.toString() || ""}
              onChange={(e) => {
                const shipId = e.target.value ? BigInt(e.target.value) : null;
                setSelectedShipId(shipId);
              }}
              disabled={isLoadingShips}
              className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
            >
              <option value="">-- Select a ship --</option>
              {ships
                ?.filter((ship) => ship.shipData.constructed)
                .map((ship) => (
                  <option key={ship.id.toString()} value={ship.id.toString()}>
                    {ship.name} (ID: {ship.id.toString()})
                  </option>
                ))}
            </select>
          </div>
        )}

        {controlsDisabled && (
          <div className="mb-3 text-sm text-yellow-300 font-mono">
            Select a constructed ship to enable controls.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div
            className={`space-y-6 ${
              controlsDisabled ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {/* Equipment Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                EQUIPMENT
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Main Weapon
                  </label>
                  <select
                    value={mainWeapon}
                    onChange={(e) => setMainWeapon(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value={0}>Laser</option>
                    <option value={1}>Railgun</option>
                    <option value={2}>Missile</option>
                    <option value={3}>Plasma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Defense Type
                  </label>
                  <div className="mb-3 flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={armor === 0 && shields === 0}
                        onChange={() => {
                          setArmor(0);
                          setShields(0);
                        }}
                        className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 focus:ring-cyan-400 focus:ring-2"
                      />
                      <span>None</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={armor > 0 && shields === 0}
                        onChange={() => {
                          if (armor === 0) setArmor(1);
                          setShields(0);
                        }}
                        className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 focus:ring-cyan-400 focus:ring-2"
                      />
                      <span>Armor</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={shields > 0 && armor === 0}
                        onChange={() => {
                          if (shields === 0) setShields(1);
                          setArmor(0);
                        }}
                        className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 focus:ring-cyan-400 focus:ring-2"
                      />
                      <span>Shields</span>
                    </label>
                  </div>
                  {armor > 0 && (
                    <div>
                      <label className="block text-xs text-cyan-300 mb-1">
                        Armor Level
                      </label>
                      <select
                        value={armor}
                        onChange={(e) => {
                          const newArmor = Number(e.target.value);
                          setArmor(newArmor);
                          if (newArmor > 0) setShields(0);
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <option value={1}>Light</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Heavy</option>
                      </select>
                    </div>
                  )}
                  {shields > 0 && (
                    <div>
                      <label className="block text-xs text-cyan-300 mb-1">
                        Shield Level
                      </label>
                      <select
                        value={shields}
                        onChange={(e) => {
                          const newShields = Number(e.target.value);
                          setShields(newShields);
                          if (newShields > 0) setArmor(0);
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <option value={1}>Basic</option>
                        <option value={2}>Enhanced</option>
                        <option value={3}>Advanced</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Special
                  </label>
                  <select
                    value={special}
                    onChange={(e) => setSpecial(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value={0}>None</option>
                    <option value={1}>EMP</option>
                    <option value={2}>Repair</option>
                    <option value={3}>Flak</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Traits Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                TRAITS
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Accuracy: {accuracy}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={accuracy}
                    onChange={(e) => setAccuracy(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Hull: {hull}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={hull}
                    onChange={(e) => setHull(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Speed: {speed}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Variant: {variant}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant}
                    onChange={(e) => setVariant(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isEditingExisting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                COLORS (Primary)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Hue 1: {h1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={h1}
                    onChange={(e) => setH1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Saturation 1: {s1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={s1}
                    onChange={(e) => setS1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Lightness 1: {l1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={l1}
                    onChange={(e) => setL1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* Secondary colors currently unused; hide this section for now */}

            {/* ShipData Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                SHIP DATA
              </h3>
              <div className="space-y-3">
                {mode === "customize" && (
                  <div>
                    <label className="block text-sm text-cyan-300 mb-2">
                      Ship Name
                    </label>
                    <input
                      type="text"
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      disabled={isEditingExisting}
                      className={`w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono ${
                        isEditingExisting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      placeholder="Enter ship name"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shiny}
                    onChange={(e) => setShiny(e.target.checked)}
                    className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                  <span>Shiny</span>
                </label>
              </div>
            </div>

            {/* Approval and Customize Buttons (only in customize mode with selected ship) */}
            {mode === "customize" && selectedShipId && buildDroneYardShipStruct && (
              <div className="bg-gray-800 rounded-lg p-4 border border-yellow-400/50">
                {needsApproval ? (
                  <TransactionButton
                    transactionId={`approve-drone-yard-${selectedShipId}-${address}`}
                    contractAddress={CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi={CONTRACT_ABIS.UNIVERSAL_CREDITS as any}
                    functionName="approve"
                    args={[
                      CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`,
                      modificationCost ?? 0n,
                    ]}
                    className="w-full px-6 py-3 mb-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    loadingText="[APPROVING UTC...]"
                    errorText="[ERROR APPROVING]"
                    onSuccess={() => {
                      toast.success("UTC approved for DroneYard");
                      refetchAllowance?.();
                    }}
                    validateBeforeTransaction={() => {
                      if (!address) return "Please connect your wallet";
                      if (!modificationCost) return "Cost not available";
                      if (!utcBalance || (utcBalance as bigint) < (modificationCost as bigint)) {
                        return "Insufficient UTC balance";
                      }
                      return true;
                    }}
                  >
                    {modificationCost
                      ? `[APPROVE ${formatEther(modificationCost as bigint)} UTC]`
                      : "[APPROVE UTC]"}
                  </TransactionButton>
                ) : null}

                <TransactionButton
                  transactionId={`customize-ship-${selectedShipId}-${address}`}
                  contractAddress={CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  abi={CONTRACT_ABIS.DRONE_YARD as any}
                  functionName="modifyShip"
                  args={[selectedShipId, buildDroneYardShipStruct]}
                  className="w-full px-6 py-3 rounded-lg border-2 border-yellow-400 text-yellow-400 hover:border-yellow-300 hover:text-yellow-300 hover:bg-yellow-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  loadingText="[CUSTOMIZING SHIP...]"
                  errorText="[ERROR CUSTOMIZING]"
                  disabled={
                    !modificationCost ||
                    !utcBalance ||
                    (utcBalance as bigint) < (modificationCost as bigint) ||
                    (utcAllowance !== undefined &&
                      (utcAllowance as bigint) < (modificationCost as bigint))
                  }
                  onSuccess={() => {
                    toast.success("Ship customized successfully!");
                    // After customization, refresh cost and allowance so
                    // the approve button and amount stay in sync with contracts.
                    refetchModificationCost?.();
                    refetchAllowance?.();
                  }}
                  validateBeforeTransaction={() => {
                    if (!address) {
                      return "Please connect your wallet";
                    }
                    if (!selectedShipId) {
                      return "Please select a ship to customize";
                    }
                    if (!modificationCost) {
                      return "Cost not available";
                    }
                    if (!utcBalance || (utcBalance as bigint) < (modificationCost as bigint)) {
                      return "Insufficient UTC balance";
                    }
                    if (
                      utcAllowance !== undefined &&
                      (utcAllowance as bigint) < (modificationCost as bigint)
                    ) {
                      return "Please approve UTC first";
                    }
                    return true;
                  }}
                >
                  [CUSTOMIZE SHIP]
                </TransactionButton>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
              PREVIEW
            </h3>
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg p-4">
              {shipImageDataUrl ? (
                <img
                  src={shipImageDataUrl}
                  alt="Ship Preview"
                  className="max-w-full max-h-[500px] object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="text-red-400">Error rendering ship</div>
              )}
            </div>
            {!constructed && (
              <div className="mt-2 text-xs text-yellow-400 text-center">
                Note: Unconstructed ships show a placeholder image
              </div>
            )}
            <div className="mt-4 text-xs text-gray-400 font-mono space-y-1">
              <div>
                Equipment: Weapon={mainWeapon}, Armor={armor}, Shields={shields}
                , Special={special}
              </div>
              <div>
                Traits: Accuracy={accuracy}, Hull={hull}, Speed={speed},
                Variant={variant}
              </div>
              <div>
                Colors: H1={h1}, S1={s1}, L1={l1} | H2={h2}, S2={s2}, L2={l2}
              </div>
              <div>
                Shiny: {shiny ? "Yes" : "No"} | Constructed:{" "}
                {constructed ? "Yes" : "No"}
              </div>
            </div>

            {/* Changes and Cost (only in customize mode) */}
            {mode === "customize" && originalShip && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-bold text-yellow-400 mb-3 font-mono">
                  CUSTOMIZATION SUMMARY
                </h4>
                {changes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-cyan-300 mb-2 font-mono">
                      CHANGES:
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {changes.map((change, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-300 font-mono pl-2 border-l-2 border-cyan-400/30"
                        >
                          • {change}
                        </div>
                      ))}
                    </div>
                    {modificationCost !== undefined && modificationCost !== null && (
                      <div className="mt-4 pt-3 border-t border-gray-700">
                        <div className="text-sm font-bold text-yellow-300 font-mono">
                          COST TO MODIFY (ON-CHAIN):{" "}
                          {formatEther(modificationCost as bigint)} UTC
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 font-mono">
                    No changes detected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipConstructor;
