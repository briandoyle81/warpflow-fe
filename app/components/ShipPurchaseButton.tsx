"use client";

import React, { useState, useEffect } from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { useAccount, useBalance, useReadContract, usePublicClient } from "wagmi";
import { flowTestnet } from "viem/chains";
import type { Abi } from "viem";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";

interface ShipPurchaseButtonProps {
  tier: number;
  price: bigint;
  paymentMethod: "FLOW" | "UTC";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  refetch?: () => void;
}

const SHIP_PURCHASE_FLOW_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
      { internalType: "address", name: "_referral", type: "address" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
    ],
    name: "purchaseWithFlow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const SHIP_PURCHASE_UTC_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
      { internalType: "address", name: "_referral", type: "address" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
    ],
    name: "purchaseWithUC",
    outputs: [],
    stateMutability: "nonpayable",
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

export function ShipPurchaseButton({
  tier,
  price,
  paymentMethod,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  refetch,
}: ShipPurchaseButtonProps) {
  const { address } = useAccount();
  const { data: flowBalance } = useBalance({
    address,
    chainId: flowTestnet.id,
  });

  // Read UTC balance for UTC purchases
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: paymentMethod === "UTC" },
  });

  // Read UTC allowance for ShipPurchaser contract
  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "allowance",
    args: address && CONTRACT_ADDRESSES.SHIP_PURCHASER ? [address, CONTRACT_ADDRESSES.SHIP_PURCHASER] : undefined,
    query: { enabled: paymentMethod === "UTC" },
  });

  const [utcApproved, setUtcApproved] = useState(false);
  const referralAddress = "0xac5b774D7a700AcDb528048B6052bc1549cd73B9" as `0x${string}`;

  // Check if UTC is approved
  useEffect(() => {
    if (paymentMethod === "UTC") {
      if (utcAllowance !== undefined && price) {
        setUtcApproved((utcAllowance as bigint) >= price);
      } else {
        // If allowance is not yet loaded, assume not approved
        setUtcApproved(false);
      }
    } else {
      // No approval needed for FLOW
      setUtcApproved(true);
    }
  }, [paymentMethod, utcAllowance, price]);

  const publicClient = usePublicClient({ chainId: flowTestnet.id });

  // Estimate gas for tier 4 purchases before transaction
  useEffect(() => {
    if (tier === 4 && address && publicClient) {
      const estimateGas = async () => {
        try {
          let estimatedGas: bigint | undefined;
          if (paymentMethod === "FLOW") {
            estimatedGas = await publicClient.estimateContractGas({
              address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              abi: SHIP_PURCHASE_FLOW_ABI as any,
              functionName: "purchaseWithFlow",
              args: [address, tier, referralAddress, 1],
              value: price,
              account: address,
            });
          } else if (utcApproved) {
            estimatedGas = await publicClient.estimateContractGas({
              address: CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              abi: SHIP_PURCHASE_UTC_ABI as any,
              functionName: "purchaseWithUC",
              args: [address, tier, referralAddress, 1],
              account: address,
            });
          }

          if (estimatedGas && estimatedGas > 15_000_000n) {
            toast.error(
              `High gas usage detected: ${estimatedGas.toLocaleString()} gas estimated for tier 4 purchase. This may indicate a contract issue.`,
              { duration: 10000 }
            );
          }
        } catch (error) {
          // If gas estimation fails, log but don't block
          console.warn("Failed to estimate gas for tier 4 purchase:", error);
        }
      };

      estimateGas();
    }
  }, [tier, address, paymentMethod, utcApproved, publicClient, referralAddress, price]);

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (paymentMethod === "FLOW") {
      if (!flowBalance || flowBalance.value < price) {
        return "Insufficient FLOW balance";
      }
    } else {
      if (!utcBalance || (utcBalance as bigint) < price) {
        return "Insufficient UTC balance";
      }
      if (!utcApproved) {
        return "Please approve UTC transfer first";
      }
    }
    return true;
  }, [address, flowBalance, utcBalance, utcApproved, price, paymentMethod]);

  const handleSuccess = React.useCallback(() => {
    // Call the provided onSuccess callback
    onSuccess?.();
    // Trigger refetch to update the UI state
    refetch?.();
  }, [onSuccess, refetch]);

  // If UTC payment and not approved, show approve button
  if (paymentMethod === "UTC" && !utcApproved) {
    const utcAmount = formatEther(price);
    return (
      <TransactionButton
        transactionId={`approve-utc-ship-purchaser-tier-${tier}-${address}`}
        contractAddress={CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi={UTC_APPROVE_ABI as any}
        functionName="approve"
        args={[CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`, price]}
        className={`${className} whitespace-nowrap`}
        disabled={disabled || !utcBalance || (utcBalance as bigint) < price}
        loadingText={`[APPROVING ${utcAmount} UTC...]`}
        errorText="[ERROR APPROVING]"
        onSuccess={() => {
          refetchAllowance();
          toast.success("UTC approved successfully!");
        }}
        onError={(error) => {
          console.error("Failed to approve UTC:", error);
          toast.error("Failed to approve UTC transfer");
        }}
        validateBeforeTransaction={() => {
          if (!address) {
            return "Please connect your wallet";
          }
          if (!utcBalance || (utcBalance as bigint) < price) {
            return "Insufficient UTC balance";
          }
          return true;
        }}
      >
        {`[APPROVE ${utcAmount} UTC]`}
      </TransactionButton>
    );
  }

  if (paymentMethod === "UTC") {
    return (
      <TransactionButton
        transactionId={`purchase-ships-utc-tier-${tier}-${address}`}
        contractAddress={CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi={SHIP_PURCHASE_UTC_ABI as any}
        functionName="purchaseWithUC"
        args={[
          address,
          tier as number, // Tier is already 0-based (0-4) for contract (uint8)
          referralAddress,
          1, // Default variant (uint16)
        ]}
        className={className}
        disabled={disabled}
        loadingText="[PURCHASING...]"
        errorText="[ERROR PURCHASING]"
        onSuccess={handleSuccess}
        onError={onError}
        validateBeforeTransaction={validateBeforeTransaction}
      >
        {children}
      </TransactionButton>
    );
  }

  return (
    <TransactionButton
      transactionId={`purchase-ships-flow-tier-${tier}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi={SHIP_PURCHASE_FLOW_ABI as any}
      functionName="purchaseWithFlow"
      args={[
        address,
        tier as number, // Tier is already 0-based (0-4) for contract (uint8)
        referralAddress,
        1, // Default variant (uint16)
      ]}
      value={price}
      className={className}
      disabled={disabled}
      loadingText="[PURCHASING...]"
      errorText="[ERROR PURCHASING]"
      onSuccess={handleSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
