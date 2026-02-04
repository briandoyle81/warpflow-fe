"use client";

import React from "react";
import { ActionType, LastMove } from "../types/types";

interface LastMoveDisplayProps {
  lastMove: LastMove | undefined;
  shipMap: Map<bigint, { name: string; owner?: string }>;
  address?: string;
}

/** Format last move text. Uses only cached shipMap (no blockchain fetch) for names. */
function formatLastMoveDescription(
  lastMove: LastMove,
  shipMap: Map<bigint, { name: string; owner?: string }>,
  address?: string
): string {
  const ship = shipMap.get(lastMove.shipId);
  const shipName = ship?.name ?? `Ship #${lastMove.shipId}`;
  const moved =
    lastMove.oldRow !== lastMove.newRow || lastMove.oldCol !== lastMove.newCol;

  let description = "";

  // Retreat is never a move: only "retreated from" position
  if (lastMove.actionType === ActionType.Retreat) {
    description = `${shipName} retreated from Row ${lastMove.oldRow}, Col ${lastMove.oldCol}`;
    return description;
  }

  if (moved) {
    description = `${shipName} moved to Row: ${lastMove.newRow}, Col: ${lastMove.newCol}`;
  }

  if (lastMove.actionType === ActionType.Shoot) {
    if (lastMove.targetShipId === 0n) {
      description += moved ? " and fired AOE" : `${shipName} fired AOE`;
    } else {
      const targetShip = shipMap.get(lastMove.targetShipId);
      const targetName = targetShip?.name ?? `Ship #${lastMove.targetShipId}`;
      description += moved
        ? ` and fired on ${targetName}`
        : `${shipName} fired on ${targetName}`;
    }
  } else if (lastMove.actionType === ActionType.Special) {
    if (lastMove.targetShipId === 0n) {
      description += moved
        ? " and used special ability (AOE)"
        : `${shipName} used special ability (AOE)`;
    } else {
      const targetShip = shipMap.get(lastMove.targetShipId);
      const targetName = targetShip?.name ?? `Ship #${lastMove.targetShipId}`;
      description += moved
        ? ` and used special ability on ${targetName}`
        : `${shipName} used special ability on ${targetName}`;
    }
  } else if (lastMove.actionType === ActionType.Pass) {
    description = moved ? `${description} and passed` : `${shipName} passed`;
  } else if (lastMove.actionType === ActionType.Assist) {
    description += moved ? " and assisted" : `${shipName} assisted`;
  } else if (lastMove.actionType === ActionType.ClaimPoints) {
    description += moved
      ? " and claimed points"
      : `${shipName} claimed points`;
  }

  return description || `${shipName} (no action)`;
}

export function GameEvents({
  lastMove,
  shipMap,
  address,
}: LastMoveDisplayProps) {
  if (!lastMove || lastMove.shipId === 0n) {
    return (
      <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
        <h3 className="text-lg font-bold text-purple-400 mb-2">
          Last Move
        </h3>
        <p className="text-gray-400 text-sm">No move yet.</p>
      </div>
    );
  }

  const description = formatLastMoveDescription(lastMove, shipMap, address);
  const ship = shipMap.get(lastMove.shipId);
  const isMyShip = address && ship?.owner === address;

  return (
    <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
      <h3 className="text-lg font-bold text-purple-400 mb-2">
        Last Move
      </h3>
      <div
        className={`p-2 rounded text-sm ${
          isMyShip
            ? "border-l-2 border-l-green-400 bg-gray-800/30"
            : "border-l-2 border-l-red-400 bg-gray-800/30"
        }`}
      >
        <span className="text-gray-200">{description}</span>
      </div>
    </div>
  );
}
