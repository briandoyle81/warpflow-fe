"use client";

import React from "react";
import { TutorialAction } from "../types/onboarding";
import { ActionType } from "../types/types";

interface SimulatedTransactionDialogProps {
  isOpen: boolean;
  action: TutorialAction | null;
  onApprove: () => void;
  onReject: () => void;
}

export function SimulatedTransactionDialog({
  isOpen,
  action,
  onApprove,
  onReject,
}: SimulatedTransactionDialogProps) {
  if (!isOpen || !action) return null;

  const getActionDescription = () => {
    switch (action.type) {
      case "moveShip":
        return `Move ship ${action.shipId} to position (${action.position?.row}, ${action.position?.col})`;
      case "shoot":
        return `Shoot at enemy ship ${action.targetShipId} with ship ${action.shipId}`;
      case "useSpecial":
        return `Use special ability on ship ${action.targetShipId} with ship ${action.shipId}`;
      case "assist":
        return `Assist ship ${action.targetShipId} with ship ${action.shipId}`;
      default:
        return "Execute action";
    }
  };

  const getActionTypeName = () => {
    if (action.actionType !== undefined) {
      return ActionType[action.actionType] || "Action";
    }
    return action.type.charAt(0).toUpperCase() + action.type.slice(1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 border-2 border-cyan-400 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg shadow-cyan-400/20">
        <h3 className="text-xl font-bold text-cyan-300 mb-4 font-mono">
          [SIMULATED] Transaction Approval
        </h3>

        <div className="space-y-3 mb-6">
          <div className="bg-yellow-400/10 border border-yellow-400/50 rounded p-3">
            <p className="text-yellow-300 text-sm font-mono">
              ⚠️ This is a tutorial simulation. No real transaction will be sent.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Action Type:</span>
              <span className="text-cyan-300 ml-2 font-mono">{getActionTypeName()}</span>
            </div>
            <div>
              <span className="text-gray-400">Description:</span>
              <span className="text-white ml-2">{getActionDescription()}</span>
            </div>
            {action.shipId && (
              <div>
                <span className="text-gray-400">Ship ID:</span>
                <span className="text-white ml-2 font-mono">{action.shipId.toString()}</span>
              </div>
            )}
            {action.targetShipId && (
              <div>
                <span className="text-gray-400">Target Ship ID:</span>
                <span className="text-white ml-2 font-mono">{action.targetShipId.toString()}</span>
              </div>
            )}
            {action.position && (
              <div>
                <span className="text-gray-400">Position:</span>
                <span className="text-white ml-2 font-mono">
                  ({action.position.row}, {action.position.col})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded font-mono hover:bg-gray-600 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
