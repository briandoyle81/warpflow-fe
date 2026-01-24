"use client";

import React, { useState, useCallback } from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Abi, Address } from "viem";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { useMapExists } from "../hooks/useMapsContract";

interface LobbyCreateButtonProps {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
  value: bigint;
  reservedJoiner?: Address; // Optional: address to reserve for (undefined or zero address for open lobby)
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const LOBBY_CREATE_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_costLimit", type: "uint256" },
      { internalType: "uint256", name: "_turnTime", type: "uint256" },
      { internalType: "bool", name: "_creatorGoesFirst", type: "bool" },
      { internalType: "uint256", name: "_selectedMapId", type: "uint256" },
      { internalType: "uint256", name: "_maxScore", type: "uint256" },
      { internalType: "address", name: "_reservedJoiner", type: "address" },
    ],
    name: "createLobby",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const UTC_APPROVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyCreateButton({
  costLimit,
  turnTime,
  creatorGoesFirst,
  selectedMapId,
  maxScore,
  value,
  reservedJoiner,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyCreateButtonProps) {
  const { address } = useAccount();
  const [isApprovingUTC, setIsApprovingUTC] = useState(false);
  const [utcApproved, setUtcApproved] = useState(false);

  // Check if this is a reserved lobby
  const isReserved =
    reservedJoiner &&
    reservedJoiner !== "0x0000000000000000000000000000000000000000";
  const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

  // Read UTC balance
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read UTC allowance
  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "allowance",
    args:
      address && CONTRACT_ADDRESSES.LOBBIES
        ? [address, CONTRACT_ADDRESSES.LOBBIES]
        : undefined,
  });

  // Check if map exists
  const { data: mapExists } = useMapExists(Number(selectedMapId));

  // Check if contract is paused
  const { data: paused } = useReadContract({
    address: CONTRACT_ADDRESSES.LOBBIES as `0x${string}`,
    abi: CONTRACT_ABIS.LOBBIES as Abi,
    functionName: "paused",
  });

  const { writeContract: writeUTC, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Calculate total UTC required: reservation fee (1 UTC) + additional lobby fee (if value > 0, it's in UTC)
  const totalUtcRequired = React.useMemo(() => {
    let total = 0n;
    if (isReserved) {
      total += parseEther("1"); // Reservation fee
    }
    if (value > 0n) {
      total += value; // Additional lobby fee (in UTC, not FLOW)
    }
    return total;
  }, [isReserved, value]);

  // Type-safe UTC balance
  const utcBalanceBigInt = React.useMemo(() => utcBalance as bigint | undefined, [utcBalance]);

  // Check if UTC is approved
  React.useEffect(() => {
    if (totalUtcRequired > 0n && utcAllowance !== undefined) {
      setUtcApproved((utcAllowance as bigint) >= totalUtcRequired);
    } else if (totalUtcRequired === 0n) {
      setUtcApproved(true); // No approval needed if no UTC required
    }
  }, [totalUtcRequired, utcAllowance]);

  // Handle approval success
  React.useEffect(() => {
    if (approveSuccess) {
      setIsApprovingUTC(false);
      refetchAllowance();
      toast.success("UTC approved successfully!");
    }
  }, [approveSuccess, refetchAllowance]);

  const handleApproveUTC = useCallback(async () => {
    if (!address || totalUtcRequired === 0n) return;

    // Check balance
    if (!utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired) {
      toast.error(
        `Insufficient UTC balance. Need ${formatEther(totalUtcRequired)} UTC.`
      );
      return;
    }

    setIsApprovingUTC(true);
    try {
      await writeUTC({
        address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
        abi: UTC_APPROVE_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.LOBBIES as `0x${string}`, totalUtcRequired],
      });
    } catch (err) {
      setIsApprovingUTC(false);
      console.error("Failed to approve UTC:", err);
      toast.error("Failed to approve UTC transfer");
    }
  }, [address, totalUtcRequired, utcBalanceBigInt, writeUTC]);

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (paused === true) {
      return "Lobby creation is currently paused";
    }
    if (mapExists === false) {
      return `Map ID ${selectedMapId} does not exist. Please select a valid map.`;
    }
    if (turnTime === 0n) {
      return "Turn time must be greater than 0";
    }
    // Prevent reserving lobby for yourself
    if (isReserved && reservedJoiner && address) {
      if (reservedJoiner.toLowerCase() === address.toLowerCase()) {
        return "Cannot reserve a lobby for yourself. Please enter a different player's address or leave empty for an open lobby.";
      }
    }
    // Check UTC requirements (for reserved lobbies and/or additional lobby fees)
    if (totalUtcRequired > 0n) {
      const balance = utcBalance as bigint | undefined;
      if (!balance || balance < totalUtcRequired) {
        return `Insufficient UTC balance. Need ${formatEther(
          totalUtcRequired
        )} UTC.`;
      }
      if (!utcApproved) {
        return `Please approve ${formatEther(
          totalUtcRequired
        )} UTC transfer first`;
      }
    }
    return true;
  }, [
    address,
    paused,
    mapExists,
    selectedMapId,
    turnTime,
    isReserved,
    reservedJoiner,
    totalUtcRequired,
    utcBalanceBigInt,
    utcApproved,
  ]);

  const transactionId = React.useMemo(
    () =>
      `create-lobby-${address}-${costLimit}-${turnTime}-${selectedMapId}-${maxScore}-${
        reservedJoiner || "open"
      }`,
    [address, costLimit, turnTime, selectedMapId, maxScore, reservedJoiner]
  );

  // If UTC is required (reserved lobby and/or additional fee) and not approved, show approve button
  if (
    totalUtcRequired > 0n &&
    !utcApproved &&
    !isApprovingUTC &&
    !isApproving
  ) {
    const feeBreakdown = [];
    if (isReserved) {
      feeBreakdown.push("1 UTC (reservation)");
    }
    if (value > 0n) {
      feeBreakdown.push(`${formatEther(value)} UTC (additional lobby fee)`);
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-yellow-400 font-mono">
          {feeBreakdown.length > 0 && (
            <div>
              Required: {feeBreakdown.join(" + ")} ={" "}
              {formatEther(totalUtcRequired)} UTC
            </div>
          )}
        </div>
        <button
          onClick={handleApproveUTC}
          disabled={!utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired}
          className={`${className} ${
            !utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {`[APPROVE ${formatEther(totalUtcRequired)} UTC]`}
        </button>
      </div>
    );
  }

  return (
    <TransactionButton
      transactionId={transactionId}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_CREATE_ABI}
      functionName="createLobby"
      args={[
        costLimit,
        turnTime,
        creatorGoesFirst,
        selectedMapId,
        maxScore,
        reservedJoiner || zeroAddress,
      ]}
      value={totalUtcRequired > 0n ? 0n : value}
      className={className}
      disabled={disabled || isApprovingUTC || isApproving}
      loadingText={
        isApprovingUTC || isApproving ? "[APPROVING UTC...]" : "[CREATING...]"
      }
      errorText="[ERROR CREATING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
