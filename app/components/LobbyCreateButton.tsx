"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { useAccount } from "wagmi";

interface LobbyCreateButtonProps {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
  value: bigint;
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
    ],
    name: "createLobby",
    outputs: [],
    stateMutability: "payable",
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
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyCreateButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    return true;
  }, [address]);

  const transactionId = React.useMemo(
    () =>
      `create-lobby-${address}-${costLimit}-${turnTime}-${selectedMapId}-${maxScore}`,
    [address, costLimit, turnTime, selectedMapId, maxScore]
  );

  return (
    <TransactionButton
      transactionId={transactionId}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_CREATE_ABI}
      functionName="createLobby"
      args={[costLimit, turnTime, creatorGoesFirst, selectedMapId, maxScore]}
      value={value}
      className={className}
      disabled={disabled}
      loadingText="[CREATING...]"
      errorText="[ERROR CREATING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
