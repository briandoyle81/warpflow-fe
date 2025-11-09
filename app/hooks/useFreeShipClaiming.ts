import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { useState, useEffect, useCallback, useRef } from "react";

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
    refetch: refetchClaimStatus,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    functionName: "hasClaimedFreeShips",
    args: address ? [address] : undefined,
  });

  // Write contract for claiming
  const { writeContract, isPending, error, data: hash } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Track if we should show the error (clear it after some time or on new attempts)
  const [showError, setShowError] = useState(false);

  // Handle write contract errors (including user rejection)
  useEffect(() => {
    if (error) {
      console.error("Write contract error:", error);
      setShowError(true);

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

      // Clear error after 3 seconds
      const timer = setTimeout(() => {
        setShowError(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);


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

  // Update cache when eligibility status changes (only on successful reads)
  useEffect(() => {
    if (address && hasClaimedFreeShips !== undefined && !claimStatusError) {
      setEligibilityCache((prevCache) => {
        const newCache = {
          ...prevCache,
          [address]: {
            eligible: !hasClaimedFreeShips,
            timestamp: Date.now(),
            checked: true,
          },
        };
        const cleanedCache = cleanupExpiredCache(newCache);
        saveCacheToStorage(cleanedCache);
        return cleanedCache;
      });
    }
  }, [
    address,
    hasClaimedFreeShips,
    claimStatusError,
    cleanupExpiredCache,
    saveCacheToStorage,
  ]);

  // Show toast and update cache when receipt is received
  useEffect(() => {
    if (isConfirmed && hash) {
      // Transaction receipt received - show success toast
      toast.success("Free ships claimed successfully!");

      // Check if this address was previously eligible
      const wasEligible = eligibilityCache[address || ""]?.eligible;

      if (wasEligible) {
        // Transaction was successful, update cache and refetch data
        setEligibilityCache((prev) => {
          const newCache = {
            ...prev,
            [address || ""]: {
              eligible: false, // Now permanently ineligible
              timestamp: Date.now(),
              checked: true,
            },
          };
          saveCacheToStorage(newCache);
          return newCache;
        });

        // Refetch data after a short delay
        const timer = setTimeout(() => {
          // Refetch the ships data to show the newly claimed ships
          refetch();
          // Refetch the claim status to update the contract data
          refetchClaimStatus();
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [isConfirmed, hash, address, refetch, refetchClaimStatus, saveCacheToStorage, eligibilityCache]);

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
        // But only if there's no read error
        if (claimStatusError) {
          // If there's a read error, assume eligible (let them try)
          return true;
        }
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

    // Clear any previous error when attempting a new claim
    setShowError(false);

    try {
      // Call the smart contract to claim free ships
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: CONTRACT_ABIS.SHIPS as Abi,
        functionName: "claimFreeShips",
      });

      // Toast will be shown when receipt is received (in useEffect below)
    } catch (err: unknown) {
      console.error("Error claiming free ships:", err);

      // Check if the error is due to user rejection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to claim free ships");
      }
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
    isPending: isPending || isConfirming, // Include confirmation state
    error: showError ? (error || receiptError) : null, // Only show error when showError is true
    claimStatusError, // Expose read contract error separately if needed
  };
}
