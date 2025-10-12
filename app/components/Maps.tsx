"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useGetAllPresetMaps, useMapCount } from "../hooks/useMapsContract";
import { MapEditor } from "./MapEditor";
import { PresetMap, GRID_DIMENSIONS } from "../types/types";

export default function Maps() {
  const { address } = useAccount();
  const { data: allMapsData } = useGetAllPresetMaps();
  const { data: mapCount } = useMapCount();
  const [showEditor, setShowEditor] = useState(false);
  const [editingMapId, setEditingMapId] = useState<number | undefined>(
    undefined
  );
  const [maps, setMaps] = useState<PresetMap[]>([]);

  // Temporary restriction - only allow specific address to create maps
  const ALLOWED_ADDRESS = "0x69a5B3aE8598fC5A5419eaa1f2A59Db2D052e346";
  const canCreateMaps =
    address?.toLowerCase() === ALLOWED_ADDRESS.toLowerCase();

  // Load all maps from the new getAllPresetMaps function
  useEffect(() => {
    if (!allMapsData || !Array.isArray(allMapsData) || allMapsData.length !== 3)
      return;

    const [mapIds, blockedPositionsArray, scoringPositionsArray] = allMapsData;

    const mapsList: PresetMap[] = mapIds.map((mapId: bigint, index: number) => {
      const blockedPositions = blockedPositionsArray[index] || [];
      const scoringPositions = scoringPositionsArray[index] || [];
      return {
        id: Number(mapId),
        blockedPositions,
        scoringPositions,
      };
    });

    setMaps(mapsList);
  }, [allMapsData]);

  const handleCreateMap = () => {
    setEditingMapId(undefined);
    setShowEditor(true);
  };

  const handleEditMap = (mapId: number) => {
    // Check if user is authorized to edit maps
    if (!canCreateMaps) {
      alert(
        "You are not authorized to edit maps. Only authorized addresses can edit maps."
      );
      return;
    }
    setEditingMapId(mapId);
    setShowEditor(true);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
    // Refresh maps list
    window.location.reload();
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingMapId(undefined);
  };

  if (showEditor) {
    return (
      <div className="space-y-4 -mx-1 -my-1 px-1 py-1">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEditorCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded font-mono hover:bg-gray-700"
          >
            ← Back to Maps
          </button>
          <h2 className="text-xl font-mono text-white">
            {editingMapId ? `Edit Map ${editingMapId}` : "Create New Map"}
          </h2>
        </div>
        <MapEditor
          mapId={editingMapId}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          canEdit={canCreateMaps}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono text-white">Maps</h1>
        {canCreateMaps ? (
          <button
            onClick={handleCreateMap}
            className="px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700"
          >
            Create New Map
          </button>
        ) : (
          <div className="px-4 py-2 bg-gray-600 text-gray-400 rounded font-mono cursor-not-allowed">
            Create New Map (Restricted)
          </div>
        )}
      </div>

      <div className="text-sm text-gray-400">
        Total maps: {mapCount ? Number(mapCount) : 0}
        {!canCreateMaps && (
          <div className="mt-2 text-yellow-400">
            ⚠️ Map creation is currently restricted to authorized addresses only
          </div>
        )}
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No maps found. Create your first map to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-mono text-white">Map #{map.id}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMap(map.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-mono hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 border border-gray-600"></div>
                  <span>Blocked tiles: {map.blockedPositions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 border border-gray-600"></div>
                  <span>Scoring tiles: {map.scoringPositions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 border border-gray-600"></div>
                  <span>
                    Once-only tiles:{" "}
                    {map.scoringPositions.filter((p) => p.onlyOnce).length}
                  </span>
                </div>
              </div>

              {/* Mini preview */}
              <div className="mt-3 p-2 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">
                  Preview ({GRID_DIMENSIONS.WIDTH}x{GRID_DIMENSIONS.HEIGHT}):
                </div>
                <div
                  className="grid gap-px w-full"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_DIMENSIONS.WIDTH}, 1fr)`,
                  }}
                >
                  {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) =>
                    Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
                      const isBlocked = map.blockedPositions.some(
                        (p) => p.row === row && p.col === col
                      );
                      const scoringPos = map.scoringPositions.find(
                        (p) => p.row === row && p.col === col
                      );
                      const isScoring = scoringPos !== undefined;
                      const isOnlyOnce = scoringPos?.onlyOnce || false;

                      let className = "aspect-square border border-gray-600";
                      if (isBlocked && isScoring) {
                        className += " bg-red-500";
                      } else if (isBlocked) {
                        className += " bg-purple-500";
                      } else if (isScoring) {
                        className += isOnlyOnce
                          ? " bg-yellow-500"
                          : " bg-green-500";
                      } else {
                        className += " bg-gray-900";
                      }

                      return (
                        <div key={`${row}-${col}`} className={className} />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
