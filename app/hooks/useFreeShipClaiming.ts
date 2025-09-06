import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { useState, useEffect, useCallback } from "react";

// Cache expiration time (24 hours) - only for unclaimed addresses
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function useFreeShipClaiming() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();

  // Cache for eligibility status to avoid repeated checks
  const [eligibilityCache, setEligibilityCache] = useState<{
    [key: string]: { eligible: boolean; timestamp: number; checked: boolean };
  }>(() => {
    // Load from localStorage on initialization
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("warpflow-eligibility-cache");
        return stored ? JSON.parse(stored) : {};
      } catch (error) {
        console.error(
          "Error loading eligibility cache from localStorage:",
          error
        );
        return {};
      }
    }
    return {};
  });

  // Check if user can claim free ships
  const {
    data: hasClaimedFreeShips,
    isLoading: isLoadingClaimStatus,
    error: claimStatusError,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS,
    functionName: "hasClaimedFreeShips",
    args: address ? [address] : undefined,
  });

  // Debug logging
  console.log("Free Ship Claiming Debug:", {
    address,
    hasClaimedFreeShips,
    isLoadingClaimStatus,
    claimStatusError,
    contractAddress: CONTRACT_ADDRESSES.SHIPS,
  });

  // Write contract for claiming
  const { writeContract, isPending, error } = useWriteContract();

  // Save cache to localStorage whenever it changes
  const saveCacheToStorage = useCallback((cache: typeof eligibilityCache) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "warpflow-eligibility-cache",
          JSON.stringify(cache)
        );
      } catch (error) {
        console.error("Error saving eligibility cache to localStorage:", error);
      }
    }
  }, []);

  // Clean up expired cache entries (but keep claimed addresses permanently)
  const cleanupExpiredCache = useCallback((cache: typeof eligibilityCache) => {
    const now = Date.now();
    const cleanedCache: typeof cache = {};

    Object.entries(cache).forEach(([key, value]) => {
      // Keep claimed addresses (not eligible) permanently
      if (!value.eligible) {
        cleanedCache[key] = value;
      }
      // Keep eligible addresses only if they haven't expired
      else if (now - value.timestamp < CACHE_EXPIRY_TIME) {
        cleanedCache[key] = value;
      }
    });

    return cleanedCache;
  }, []);

  // Update cache when eligibility status changes
  useEffect(() => {
    if (address && hasClaimedFreeShips !== undefined) {
      const newCache = {
        ...eligibilityCache,
        [address]: {
          eligible: !hasClaimedFreeShips,
          timestamp: Date.now(),
          checked: true,
        },
      };
      const cleanedCache = cleanupExpiredCache(newCache);
      setEligibilityCache(cleanedCache);
      saveCacheToStorage(cleanedCache);
    }
  }, [
    address,
    hasClaimedFreeShips,
    eligibilityCache,
    cleanupExpiredCache,
    saveCacheToStorage,
  ]);

  // Update cache after successful claiming
  useEffect(() => {
    if (address && !isPending && eligibilityCache[address]?.eligible) {
      // If we were previously eligible and the transaction is no longer pending,
      // update the cache to mark them as permanently ineligible
      const timer = setTimeout(() => {
        setEligibilityCache((prev) => {
          const newCache = {
            ...prev,
            [address]: {
              eligible: false, // Now permanently ineligible
              timestamp: Date.now(),
              checked: true,
            },
          };
          saveCacheToStorage(newCache);
          return newCache;
        });
        // Also refetch the ships data to show the newly claimed ships
        refetch();
      }, 3000); // Wait 3 seconds for the transaction to be mined

      return () => clearTimeout(timer);
    }
  }, [address, isPending, eligibilityCache, refetch, saveCacheToStorage]);

  // Check if cache entry is still valid
  const isCacheValid = (cacheEntry: {
    timestamp: number;
    eligible: boolean;
  }) => {
    // If they've claimed (not eligible), cache is permanent
    if (!cacheEntry.eligible) {
      return true;
    }
    // If they're eligible, cache expires after 24 hours
    return Date.now() - cacheEntry.timestamp < CACHE_EXPIRY_TIME;
  };

  // Check if user is eligible (from cache or contract)
  const isEligible = address
    ? (() => {
        const cacheEntry = eligibilityCache[address];
        if (cacheEntry && isCacheValid(cacheEntry)) {
          return cacheEntry.eligible;
        }
        // If cache is invalid or doesn't exist, fall back to contract data
        return hasClaimedFreeShips !== undefined ? !hasClaimedFreeShips : false;
      })()
    : false;

  // Check if we've already determined eligibility for this user
  const hasCheckedEligibility = address
    ? (() => {
        const cacheEntry = eligibilityCache[address];
        return cacheEntry && isCacheValid(cacheEntry)
          ? cacheEntry.checked
          : false;
      })()
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
    error: error || claimStatusError,
  };
}
