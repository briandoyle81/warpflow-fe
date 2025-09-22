"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { useAccount } from "wagmi";
import type { Abi } from "viem";

interface FreeShipClaimButtonProps {
  isEligible: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FreeShipClaimButton({
  isEligible,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: FreeShipClaimButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (!isEligible) {
      return "You are not eligible for free ships or have already claimed them";
    }
    return true;
  }, [address, isEligible]);

  return (
    <TransactionButton
      transactionId={`claim-free-ships-${address}`}
      contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
      abi={CONTRACT_ABIS.SHIPS as Abi}
      functionName="claimFreeShips"
      className={className}
      disabled={disabled || !isEligible}
      loadingText="[CLAIMING...]"
      errorText="[ERROR CLAIMING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
