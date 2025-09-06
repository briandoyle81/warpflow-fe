import { useAccount, useBalance, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, SHIP_PURCHASE_TIERS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { flowTestnet } from "viem/chains";
import { useEffect } from "react";

// Ships contract ABI for purchasing with FLOW
const shipsContractABI = [
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

export function useShipPurchasing() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();

  // Get user's FLOW balance
  const { data: flowBalance, isLoading: isLoadingFlowBalance } = useBalance({
    address,
    chainId: flowTestnet.id,
  });

  // Write contract for purchasing
  const { writeContract, isPending, error } = useWriteContract();

  // Handle write contract errors (including user rejection)
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

  // Use hard-coded tier information
  const { tiers, shipsPerTier, prices } = SHIP_PURCHASE_TIERS;

  // Purchase ships function - note: contract handles count internally
  const purchaseShips = async (tier: number) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (tier < 0 || tier >= tiers.length) {
      toast.error("Invalid tier selected");
      return;
    }

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
      "0x0000000000000000000000028134089B117d1663" as `0x${string}`;

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: shipsContractABI,
        functionName: "purchaseWithFlow",
        args: [address, BigInt(tier), referralAddress],
        value: tierPrice,
      });

      toast.success(`Purchase initiated for tier ${tier} ships!`);

      // Refetch ships data after successful purchase
      setTimeout(() => refetch(), 3000);
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
  const getPurchaseCosts = (tier: number, maxCount: number = 10) => {
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
  const canAfford = (tier: number, count: number) => {
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
    isPending,
    error,
  };
}
