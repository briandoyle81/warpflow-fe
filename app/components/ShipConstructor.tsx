"use client";

import React, { useState, useMemo } from "react";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";

const ShipConstructor: React.FC = () => {
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

  // Create a mock ship object for rendering
  const mockShip: Ship = useMemo(
    () => ({
      name: "Constructor Preview",
      id: BigInt(0),
      equipment: {
        mainWeapon,
        armor,
        shields,
        special,
      },
      traits: {
        serialNumber: BigInt(0),
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
      owner: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    }),
    [
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

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-gray-900 rounded-lg p-6 border border-cyan-400/30">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6 font-mono">
          [SHIP EXPLORER]
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div className="space-y-6">
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
                    className="w-full px-3 py-2 bg-gray-900 border border-cyan-400 rounded text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                    className="w-full"
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
                    className="w-full"
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
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                COLORS (Secondary)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Hue 2: {h2}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={h2}
                    onChange={(e) => setH2(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Saturation 2: {s2}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={s2}
                    onChange={(e) => setS2(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan-300 mb-2">
                    Lightness 2: {l2}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={l2}
                    onChange={(e) => setL2(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* ShipData Section */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-cyan-300 mb-4 font-mono">
                SHIP DATA
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shiny}
                    onChange={(e) => setShiny(e.target.checked)}
                    className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                  <span>Shiny</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constructed}
                    onChange={(e) => setConstructed(e.target.checked)}
                    className="w-4 h-4 text-cyan-400 bg-black/60 border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                  <span>Constructed</span>
                </label>
              </div>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipConstructor;
