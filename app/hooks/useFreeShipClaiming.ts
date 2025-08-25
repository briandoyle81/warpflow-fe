import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";

// Free ship claiming ABI - this would need to be added to the contract
const freeShipClaimingABI = [
  {
    inputs: [],
    name: "claimFreeShips",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "hasClaimedFreeShips",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFreeShipCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Alternative: Use the ShipPurchaser with 0 cost for free ships
const shipPurchaserABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_count", type: "uint256" },
      { internalType: "uint256", name: "_seed", type: "uint256" },
    ],
    name: "purchaseShips",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getFreeShipCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "canClaimFreeShips",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useFreeShipClaiming() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();

  // Check if user can claim free ships
  const { data: canClaimFreeShips, isLoading: isLoadingClaimStatus } =
    useReadContract({
      address: CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`,
      abi: shipPurchaserABI,
      functionName: "canClaimFreeShips",
      args: address ? [address] : undefined,
    });

  // Get number of free ships available
  const { data: freeShipCount, isLoading: isLoadingFreeShipCount } =
    useReadContract({
      address: CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`,
      abi: shipPurchaserABI,
      functionName: "getFreeShipCount",
    });

  // Write contract for claiming
  const { writeContract, isPending, error } = useWriteContract();

  // Claim free ships function
  const claimFreeShips = async (seed?: number) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!canClaimFreeShips) {
      toast.error("You have already claimed your free ships");
      return;
    }

    if (!freeShipCount || freeShipCount === BigInt(0)) {
      toast.error("No free ships available");
      return;
    }

    try {
      // Call the smart contract to generate and mint free ships on-chain
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`,
        abi: shipPurchaserABI,
        functionName: "purchaseShips",
        args: [freeShipCount, BigInt(seed || Date.now())],
        value: BigInt(0), // 0 cost for free ships
      });

      toast.success(`Claimed ${freeShipCount.toString()} free ships!`);

      // Refetch ships data after successful on-chain generation
      setTimeout(() => refetch(), 3000);
    } catch (err) {
      console.error("Error claiming free ships:", err);
      toast.error("Failed to claim free ships");
    }
  };

  // Check if user has already claimed their free ships
  const hasClaimed = !canClaimFreeShips;

  return {
    // Data
    canClaimFreeShips: canClaimFreeShips || false,
    freeShipCount: freeShipCount || BigInt(0),
    hasClaimed,

    // Loading states
    isLoadingClaimStatus,
    isLoadingFreeShipCount,

    // Actions
    claimFreeShips,

    // Contract state
    isPending,
    error,
  };
}
