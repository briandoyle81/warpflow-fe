"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount, useBalance } from "wagmi";
import { flowTestnet } from "viem/chains";

interface ShipPurchaseButtonProps {
  tier: number;
  price: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const SHIP_PURCHASE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_tier", type: "uint256" },
      { internalType: "address", name: "_referral", type: "address" },
    ],
    name: "purchaseWithFlow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export function ShipPurchaseButton({
  tier,
  price,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: ShipPurchaseButtonProps) {
  const { address } = useAccount();
  const { data: flowBalance } = useBalance({
    address,
    chainId: flowTestnet.id,
  });

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (!flowBalance || flowBalance.value < price) {
      return "Insufficient FLOW balance";
    }
    return true;
  }, [address, flowBalance, price]);

  return (
    <TransactionButton
      transactionId={`purchase-ships-tier-${tier}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
      abi={SHIP_PURCHASE_ABI as any}
      functionName="purchaseWithFlow"
      args={[
        address,
        BigInt(tier - 1), // Convert to 0-based indexing for contract
        "0xac5b774D7a700AcDb528048B6052bc1549cd73B9",
      ]} // Referral address
      value={price}
      className={className}
      disabled={disabled}
      loadingText="[PURCHASING...]"
      errorText="[ERROR PURCHASING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
