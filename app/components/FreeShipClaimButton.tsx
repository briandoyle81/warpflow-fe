"use client";

import React from "react";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";

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
  const { claimFreeShips, isPending } = useFreeShipClaiming();

  const handleClick = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!isEligible) {
      toast.error(
        "You are not eligible for free ships or have already claimed them"
      );
      return;
    }

    try {
      await claimFreeShips();
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    }
  };

  const isDisabled = disabled || !isEligible || isPending;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isPending ? "[CLAIMING...]" : children}
    </button>
  );
}
