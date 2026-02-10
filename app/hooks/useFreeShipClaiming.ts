import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";
import { useState, useEffect, useCallback } from "react";

// Cache expiration time (24 hours) - only for unclaimed addresses
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const DEFAULT_COOLDOWN_SECONDS = 28 * 24 * 60 * 60; // 28 days

type EligibilityCacheEntry = {
  eligible: boolean;
  timestamp: number;
  checked: boolean;
  lastClaimTimestamp?: string;
  claimCooldownPeriod?: string;
};

function formatTimeUntil(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "0m";
  const d = Math.floor(secondsRemaining / 86400);
  const h = Math.floor((secondsRemaining % 86400) / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export function useFreeShipClaiming() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();

  // Cache for eligibility status and countdown (lastClaim + cooldown for "next claim in")
  const [eligibilityCache, setEligibilityCache] = useState<{
    [key: string]: EligibilityCacheEntry;
  }>(() => {
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

  // Live countdown (updates every second when not eligible)
  const [secondsUntilNextClaim, setSecondsUntilNextClaim] = useState<number | null>(null);

  // Check if user can claim free ships (using lastClaimTimestamp)
  const {
    data: lastClaimTimestamp,
    isLoading: isLoadingClaimStatus,
    error: claimStatusError,
    refetch: refetchClaimStatus,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    functionName: "lastClaimTimestamp",
    args: address ? [address] : undefined,
  });

  // Cooldown period from contract (seconds)
  const { data: claimCooldownPeriod } = useReadContract({
    address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    functionName: "claimCooldownPeriod",
  });
  const cooldownSeconds =
    claimCooldownPeriod !== undefined && claimCooldownPeriod !== null
      ? Number(claimCooldownPeriod)
      : DEFAULT_COOLDOWN_SECONDS;

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
    if (address && lastClaimTimestamp !== undefined && !claimStatusError) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const canClaim =
        lastClaimTimestamp === 0n ||
        currentTimestamp - Number(lastClaimTimestamp) >= cooldownSeconds;

      setEligibilityCache((prevCache) => {
        const newCache = {
          ...prevCache,
          [address]: {
            eligible: canClaim,
            timestamp: Date.now(),
            checked: true,
            ...(lastClaimTimestamp != null &&
              lastClaimTimestamp !== 0n && {
                lastClaimTimestamp: lastClaimTimestamp.toString(),
                claimCooldownPeriod: String(cooldownSeconds),
              }),
          },
        };
        const cleanedCache = cleanupExpiredCache(newCache);
        saveCacheToStorage(cleanedCache);
        return cleanedCache;
      });
    }
  }, [
    address,
    lastClaimTimestamp,
    claimStatusError,
    cooldownSeconds,
    cleanupExpiredCache,
    saveCacheToStorage,
  ]);

  // Check if cache entry is still valid
  const isCacheValid = useCallback(
    (cacheEntry: { timestamp: number; eligible: boolean }) => {
      if (!cacheEntry.eligible) return true;
      return Date.now() - cacheEntry.timestamp < CACHE_EXPIRY_TIME;
    },
    []
  );

  // Check if user is eligible (from cache or contract)
  const isEligible = address
    ? (() => {
        const cacheEntry = eligibilityCache[address];
        if (cacheEntry && isCacheValid(cacheEntry)) {
          return cacheEntry.eligible;
        }
        if (claimStatusError) return true;
        if (lastClaimTimestamp === undefined || lastClaimTimestamp === null)
          return false;
        if (lastClaimTimestamp === 0n) return true;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return (
          currentTimestamp - Number(lastClaimTimestamp) >= cooldownSeconds
        );
      })()
    : false;

  // Compute seconds until next claim and update every second when not eligible
  useEffect(() => {
    if (!address || isEligible) {
      setSecondsUntilNextClaim(null);
      return;
    }
    const getSecondsRemaining = (): number | null => {
      const cacheEntry = eligibilityCache[address];
      const lastTs =
        lastClaimTimestamp !== undefined && lastClaimTimestamp !== 0n
          ? Number(lastClaimTimestamp)
          : cacheEntry?.lastClaimTimestamp
            ? Number(cacheEntry.lastClaimTimestamp)
            : null;
      const cooldown =
        cacheEntry?.claimCooldownPeriod != null
          ? Number(cacheEntry.claimCooldownPeriod)
          : cooldownSeconds;
      if (lastTs == null) return null;
      const nextAt = lastTs + cooldown;
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, nextAt - now);
    };
    const tick = () => setSecondsUntilNextClaim(getSecondsRemaining());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    address,
    isEligible,
    lastClaimTimestamp,
    cooldownSeconds,
    eligibilityCache,
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
      // Call the smart contract to claim free ships (with variant parameter)
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: CONTRACT_ABIS.SHIPS as Abi,
        functionName: "claimFreeShips",
        args: [1], // Default variant (uint16)
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

  const nextClaimInFormatted =
    secondsUntilNextClaim != null && secondsUntilNextClaim > 0
      ? formatTimeUntil(secondsUntilNextClaim)
      : null;

  return {
    // Data
    isEligible,
    hasCheckedEligibility,
    hasClaimed: !isEligible,

    // Next claim countdown (when has claimed)
    secondsUntilNextClaim,
    nextClaimInFormatted,

    // Loading states
    isLoadingClaimStatus,

    // Actions
    claimFreeShips,

    // Contract state
    isPending: isPending || isConfirming,
    isConfirmed,
    error: showError ? (error || receiptError) : null,
    claimStatusError,
  };
}
