import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { useState, useEffect } from "react";

export function useFreeShipClaiming() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();

  // Cache for eligibility status to avoid repeated checks
  const [eligibilityCache, setEligibilityCache] = useState<{
    [key: string]: { eligible: boolean; timestamp: number; checked: boolean };
  }>({});

  // Check if user can claim free ships
  const { data: hasClaimedFreeShips, isLoading: isLoadingClaimStatus } =
    useReadContract({
      address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
      abi: CONTRACT_ABIS.SHIPS,
      functionName: "hasClaimedFreeShips",
      args: address ? [address] : undefined,
    });

  // Write contract for claiming
  const { writeContract, isPending, error } = useWriteContract();

  // Update cache when eligibility status changes
  useEffect(() => {
    if (address && hasClaimedFreeShips !== undefined) {
      setEligibilityCache((prev) => ({
        ...prev,
        [address]: {
          eligible: !hasClaimedFreeShips,
          timestamp: Date.now(),
          checked: true,
        },
      }));
    }
  }, [address, hasClaimedFreeShips]);

  // Refetch eligibility status after transaction completion
  useEffect(() => {
    if (address && !isPending && eligibilityCache[address]?.eligible) {
      // If we were previously eligible and the transaction is no longer pending,
      // clear the cache to force a refetch of eligibility status
      const timer = setTimeout(() => {
        setEligibilityCache((prev) => {
          const newCache = { ...prev };
          delete newCache[address];
          return newCache;
        });
        // Also refetch the ships data to show the newly claimed ships
        refetch();
      }, 3000); // Wait 3 seconds for the transaction to be mined

      return () => clearTimeout(timer);
    }
  }, [address, isPending, eligibilityCache, refetch]);

  // Check if user is eligible (from cache or contract)
  const isEligible = address
    ? eligibilityCache[address]?.eligible ?? !hasClaimedFreeShips
    : false;

  // Check if we've already determined eligibility for this user
  const hasCheckedEligibility = address
    ? eligibilityCache[address]?.checked ?? false
    : false;

  // Claim free ships function
  const claimFreeShips = async () => {
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
      // Call the smart contract to claim free ships
      writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: CONTRACT_ABIS.SHIPS,
        functionName: "claimFreeShips",
      });

      toast.success("Transaction submitted! Waiting for confirmation...");
    } catch (err) {
      console.error("Error claiming free ships:", err);
      toast.error("Failed to claim free ships");
    }
  };

  return {
    // Data
    isEligible,
    hasCheckedEligibility,
    hasClaimed: !isEligible,

    // Loading states
    isLoadingClaimStatus,

    // Actions
    claimFreeShips,

    // Contract state
    isPending,
    error,
  };
}
