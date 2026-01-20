"use client";

import React, { useState, useCallback } from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi, Address } from "viem";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";

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
  const isReserved = reservedJoiner && reservedJoiner !== "0x0000000000000000000000000000000000000000";
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
    args: address && CONTRACT_ADDRESSES.LOBBIES ? [address, CONTRACT_ADDRESSES.LOBBIES] : undefined,
  });

  const { writeContract: writeUTC, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Check if UTC is approved
  React.useEffect(() => {
    if (isReserved && utcAllowance) {
      const requiredAmount = parseEther("1");
      setUtcApproved(utcAllowance >= requiredAmount);
    } else if (!isReserved) {
      setUtcApproved(true); // No approval needed for open lobbies
    }
  }, [isReserved, utcAllowance]);

  // Handle approval success
  React.useEffect(() => {
    if (approveSuccess) {
      setIsApprovingUTC(false);
      refetchAllowance();
      toast.success("UTC approved successfully!");
    }
  }, [approveSuccess, refetchAllowance]);

  const handleApproveUTC = useCallback(async () => {
    if (!address || !isReserved) return;

    // Check balance
    if (!utcBalance || utcBalance < parseEther("1")) {
      toast.error("Insufficient UTC balance. Need 1 UTC to reserve game.");
      return;
    }

    setIsApprovingUTC(true);
    try {
      await writeUTC({
        address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
        abi: UTC_APPROVE_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.LOBBIES as `0x${string}`, parseEther("1")],
      });
    } catch (err) {
      setIsApprovingUTC(false);
      console.error("Failed to approve UTC:", err);
      toast.error("Failed to approve UTC transfer");
    }
  }, [address, isReserved, utcBalance, writeUTC]);

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (isReserved) {
      if (!utcBalance || utcBalance < parseEther("1")) {
        return "Insufficient UTC balance. Need 1 UTC to reserve game.";
      }
      if (!utcApproved) {
        return "Please approve UTC transfer first";
      }
    }
    return true;
  }, [address, isReserved, utcBalance, utcApproved]);

  const transactionId = React.useMemo(
    () =>
      `create-lobby-${address}-${costLimit}-${turnTime}-${selectedMapId}-${maxScore}-${reservedJoiner || "open"}`,
    [address, costLimit, turnTime, selectedMapId, maxScore, reservedJoiner]
  );

  // If reserved and not approved, show approve button
  if (isReserved && !utcApproved && !isApprovingUTC && !isApproving) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-yellow-400 font-mono">
          Reserve game for friend: {formatEther(parseEther("1"))} UTC required
        </div>
        <button
          onClick={handleApproveUTC}
          disabled={!utcBalance || utcBalance < parseEther("1")}
          className={`${className} ${(!utcBalance || utcBalance < parseEther("1")) ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          [APPROVE UTC]
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
      value={value}
      className={className}
      disabled={disabled || isApprovingUTC || isApproving}
      loadingText={isApprovingUTC || isApproving ? "[APPROVING UTC...]" : "[CREATING...]"}
      errorText="[ERROR CREATING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
