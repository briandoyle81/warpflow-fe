"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import type { Abi } from "viem";

interface ShipActionButtonProps {
  action: "construct" | "constructAll" | "constructShips" | "recycle";
  shipId?: bigint;
  shipIds?: bigint[];
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const SHIP_ACTION_CONFIG = {
  construct: {
    functionName: "constructShip",
    abi: [
      {
        inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
        name: "constructShip",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  constructAll: {
    functionName: "constructAllMyShips",
    abi: [
      {
        inputs: [],
        name: "constructAllMyShips",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  constructShips: {
    functionName: "constructShips",
    abi: [
      {
        inputs: [
          {
            internalType: "uint256[]",
            name: "_ids",
            type: "uint256[]",
          },
        ],
        name: "constructShips",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  recycle: {
    functionName: "shipBreaker",
    abi: [
      {
        inputs: [
          {
            internalType: "uint256[]",
            name: "_shipIds",
            type: "uint256[]",
          },
        ],
        name: "shipBreaker",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
};

export function ShipActionButton({
  action,
  shipId,
  shipIds,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: ShipActionButtonProps) {
  const config = SHIP_ACTION_CONFIG[action];

  // Generate transaction ID based on action and parameters
  const transactionId = React.useMemo(() => {
    switch (action) {
      case "construct":
        return `construct-ship-${shipId}`;
      case "constructAll":
        return "construct-all-ships";
      case "constructShips":
        return `construct-ships-${shipIds?.length || 0}`;
      case "recycle":
        return `recycle-ships-${shipIds?.join("-")}`;
      default:
        return `ship-action-${action}`;
    }
  }, [action, shipId, shipIds]);

  // Prepare arguments based on action
  const args = React.useMemo(() => {
    switch (action) {
      case "construct":
        return shipId ? [shipId] : [];
      case "constructAll":
        return [];
      case "constructShips":
        return shipIds ? [shipIds] : [];
      case "recycle":
        return shipIds ? [shipIds] : [];
      default:
        return [];
    }
  }, [action, shipId, shipIds]);

  // Validation function
  const validateBeforeTransaction = React.useCallback(() => {
    switch (action) {
      case "construct":
        if (!shipId) {
          return "No ship ID provided";
        }
        return true;
      case "constructAll":
        return true;
      case "constructShips":
        if (!shipIds || shipIds.length === 0) {
          return "No ships selected for construction";
        }
        return true;
      case "recycle":
        if (!shipIds || shipIds.length === 0) {
          return "No ships selected for recycling";
        }
        return true;
      default:
        return true;
    }
  }, [action, shipId, shipIds]);

  return (
    <TransactionButton
      transactionId={transactionId}
      contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
      abi={config.abi}
      functionName={config.functionName}
      args={args}
      className={className}
      disabled={disabled}
      loadingText={`[${action.toUpperCase()}...]`}
      errorText={`[ERROR ${action.toUpperCase()}]`}
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
