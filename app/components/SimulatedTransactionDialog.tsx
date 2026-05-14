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
    // For moveShip tutorial steps, show a clear "Move" label in the
    // simulated transaction dialog to mirror the main game UX, even
    // though the underlying contract action type may be Pass.
    if (action.type === "moveShip") {
      return "Move";
    }

    if (action.actionType !== undefined) {
      return ActionType[action.actionType] || "Action";
    }

    return action.type.charAt(0).toUpperCase() + action.type.slice(1);
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulated-tx-title"
    >
      {/* Blocks all interaction with the game and tutorial chrome until approve/reject */}
      <div className="absolute inset-0 bg-black/55" aria-hidden />
      <div className="relative z-10 flex flex-1 justify-end p-4 pt-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
          <div className="bg-near-black border-2 p-6 w-full" style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}>
            <h3
              id="simulated-tx-title"
              className="text-xl font-bold text-cyan mb-4 font-mono tracking-widest"
            >
              [SIM] ACTION CONFIRMATION
            </h3>

            <div className="space-y-3 mb-6">
              <div className="bg-amber/10 border border-amber/50 p-3">
                <p className="text-amber text-sm font-mono">
                  // TRAINING EXERCISE — No transaction will be executed.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-muted">Action Type:</span>
                  <span className="text-cyan ml-2 font-mono">
                    {getActionTypeName()}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Description:</span>
                  <span className="text-white ml-2">{getActionDescription()}</span>
                </div>
                {action.shipId && (
                  <div>
                    <span className="text-text-muted">Ship ID:</span>
                    <span className="text-white ml-2 font-mono">
                      {action.shipId.toString()}
                    </span>
                  </div>
                )}
                {action.targetShipId && (
                  <div>
                    <span className="text-text-muted">Target Ship ID:</span>
                    <span className="text-white ml-2 font-mono">
                      {action.targetShipId.toString()}
                    </span>
                  </div>
                )}
                {action.position && (
                  <div>
                    <span className="text-text-muted">Position:</span>
                    <span className="text-white ml-2 font-mono">
                      ({action.position.row}, {action.position.col})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onReject}
                className="flex-1 px-4 py-2 bg-steel text-white rounded-none font-mono hover:bg-gunmetal transition-colors tracking-wider"
              >
                DENY
              </button>
              <button
                type="button"
                onClick={onApprove}
                className="flex-1 px-4 py-2 bg-phosphor-green/20 text-phosphor-green border border-phosphor-green rounded-none font-mono hover:bg-phosphor-green/30 transition-colors tracking-wider font-bold"
              >
                AUTHORIZE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
