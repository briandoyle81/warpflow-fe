import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESSES, SHIP_PURCHASE_TIERS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { useEffect } from "react";
import { getSelectedChainId } from "../config/networks";

// Ships contract ABI for purchasing with FLOW
const shipsContractABI = [
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

export function useShipPurchasing() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();
  const activeChainId = getSelectedChainId();

  // Get user's FLOW balance
  const { data: flowBalance, isLoading: isLoadingFlowBalance } = useBalance({
    address,
    chainId: activeChainId,
  });

  // Write contract for purchasing
  const { writeContract, isPending, error, data: hash } = useWriteContract();

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle write contract errors (including user rejection) - only for immediate errors
  useEffect(() => {
    if (error) {
      console.error("Write contract error:", error);

      // Check if the error is due to user rejection
      const errorMessage = error.message || "";
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Transaction failed: " + errorMessage);
      }
    }
  }, [error]);

  // Show toast when receipt is received
  useEffect(() => {
    if (isConfirmed && hash) {
      toast.success("Ships purchased successfully!");
      // Refetch ships data after successful purchase
      setTimeout(() => refetch(), 2000);
    }
  }, [isConfirmed, hash, refetch]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      const errorMessage = receiptError.message || "Transaction failed";
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Transaction failed: ${errorMessage}`);
      }
    }
  }, [receiptError]);

  // Use hard-coded tier information
  const { tiers, shipsPerTier, prices } = SHIP_PURCHASE_TIERS;

  // Purchase ships function - note: contract handles count internally
  // Tiers are now 0-based (0-4) instead of 1-based (1-5)
  const purchaseShips = async (tier: number) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate 0-based tier (0-4)
    if (tier < 0 || tier >= tiers.length) {
      toast.error("Invalid tier selected");
      return;
    }

    // Tier is already 0-based, use directly as index
    const tierPrice = prices[tier] || BigInt(0);
    if (tierPrice === BigInt(0)) {
      toast.error("Invalid tier price");
      return;
    }

    if (flowBalance && flowBalance.value < tierPrice) {
      toast.error("Insufficient FLOW balance");
      return;
    }

    // Fixed referral address
    const referralAddress =
      "0xac5b774D7a700AcDb528048B6052bc1549cd73B9" as `0x${string}`;

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: shipsContractABI,
        functionName: "purchaseWithFlow",
        args: [address, tier as number, referralAddress, 1], // tier is 0-based uint8, variant defaults to 1
        value: tierPrice,
      });

      // Toast will be shown when receipt is received (in useEffect above)
    } catch (err: unknown) {
      console.error("Error purchasing ships:", err);

      // Check if the error is due to user rejection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to purchase ships");
      }
    }
  };

  // Quick purchase functions
  const purchaseSingleShip = (tier: number) => purchaseShips(tier);
  const purchaseMultipleShips = (tier: number) => purchaseShips(tier);

  // Calculate costs for different quantities in a tier
  // Tiers are now 0-based (0-4)
  const getPurchaseCosts = (tier: number, maxCount: number = 10) => {
    // Tier is already 0-based, use directly as index
    if (!prices[tier]) return [];

    const tierPrice = prices[tier];
    const shipsInTier = Number(shipsPerTier[tier] || 1);
    const costs = [];

    for (let i = 1; i <= Math.min(maxCount, shipsInTier); i++) {
      costs.push({
        count: i,
        cost: tierPrice * BigInt(i),
        costFormatted: `${(Number(tierPrice * BigInt(i)) / 1e18).toFixed(
          2
        )} FLOW`,
      });
    }
    return costs;
  };

  // Check if user can afford a certain quantity in a tier
  // Tiers are now 0-based (0-4)
  const canAfford = (tier: number, count: number) => {
    // Tier is already 0-based, use directly as index
    if (!prices[tier] || !flowBalance) return false;
    const tierPrice = prices[tier];
    const totalCost = tierPrice * BigInt(count);
    return flowBalance.value >= totalCost;
  };

  return {
    // Data
    tiers,
    prices,
    maxPerTier: shipsPerTier,
    flowBalance,

    // Loading states
    isLoadingFlowBalance,

    // Actions
    purchaseShips,
    purchaseSingleShip,
    purchaseMultipleShips,

    // Utilities
    getPurchaseCosts,
    canAfford,

    // Contract state
    isPending: isPending || isConfirming, // Include confirmation state
    error: error || receiptError,
  };
}
