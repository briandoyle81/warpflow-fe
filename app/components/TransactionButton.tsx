"use client";

import React from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";
import { toast } from "react-hot-toast";
import { useTransaction } from "../providers/TransactionContext";

interface TransactionButtonProps {
  // Transaction identification
  transactionId: string;

  // Contract call configuration
  contractAddress: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  value?: bigint;

  // Button appearance
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
  errorText?: string;

  // Callbacks
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onTransactionSent?: (hash: `0x${string}`) => void; // Called when transaction is sent (hash available)
  onReceipt?: (receipt: { gasUsed: bigint }) => void; // Called when transaction receipt is received

  // Validation
  validateBeforeTransaction?: () => boolean | string; // Return true or error message
}

export function TransactionButton({
  transactionId,
  contractAddress,
  abi,
  functionName,
  args = [],
  value,
  children,
  className = "",
  disabled = false,
  loadingText = "Loading...",
  errorText = "Error",
  onSuccess,
  onError,
  onTransactionSent,
  onReceipt,
  validateBeforeTransaction,
}: TransactionButtonProps) {
  const { writeContract, isPending, error, data: hash } = useWriteContract();
  const {
    transactionState,
    startTransaction,
    completeTransaction,
    clearError,
  } = useTransaction();

  // Hydration safety - prevent mismatch between server and client
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check if this button is the active transaction
  const isActiveTransaction =
    transactionState.activeTransactionId === transactionId;

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash && isHydrated && isActiveTransaction, // Only enable when we have a hash, are hydrated, and this is the active transaction
    },
  });

  // Fallback timeout for transaction completion
  const [fallbackTimeout, setFallbackTimeout] =
    React.useState<NodeJS.Timeout | null>(null);

  // Local state to track if we should consider the transaction as pending
  const [isLocallyPending, setIsLocallyPending] = React.useState(false);

  // Track if we've already called onTransactionSent for this hash
  const transactionSentHashRef = React.useRef<`0x${string}` | null>(null);

  React.useEffect(() => {
    if (
      isActiveTransaction &&
      hash &&
      !isConfirmed &&
      !isConfirming &&
      !error &&
      !receiptError
    ) {
      // Set a fallback timeout if transaction seems stuck
      const timeout = setTimeout(() => {
        completeTransaction(transactionId, true);
        onSuccess?.();
      }, 30000); // 30 second fallback

      setFallbackTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      setFallbackTimeout(null);
    }
  }, [
    isActiveTransaction,
    hash,
    isConfirmed,
    isConfirming,
    error,
    receiptError,
    transactionId,
    completeTransaction,
    onSuccess,
    fallbackTimeout,
  ]);
  const isTransactionPending =
    (transactionState.isPending && isActiveTransaction) ||
    (isHydrated && isConfirming && isActiveTransaction) ||
    isLocallyPending;
  const hasTransactionError = transactionState.error && isActiveTransaction;

  // Handle transaction execution
  const handleTransaction = async () => {
    try {
      // Validate before transaction if validator provided
      if (validateBeforeTransaction) {
        const validation = validateBeforeTransaction();
        if (validation !== true) {
          toast.error(validation as string);
          return;
        }
      }

      // Start transaction tracking
      startTransaction(transactionId);
      setIsLocallyPending(true); // Set local pending state

      // Execute the contract call
      await writeContract({
        address: contractAddress,
        abi,
        functionName,
        args,
        value,
      });

      // Note: The hash will be available in the hash variable from useWriteContract
      // We'll trigger onTransactionSent in a useEffect when hash becomes available
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setIsLocallyPending(false); // Reset local pending state on error
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  };

  // Handle transaction completion based on receipt confirmation
  React.useEffect(() => {
    if (isActiveTransaction && isHydrated && isConfirmed && receipt) {
      // Transaction confirmed on blockchain
      setIsLocallyPending(false); // Reset local pending state
      // Call onReceipt callback with gas information
      if (onReceipt && receipt.gasUsed) {
        onReceipt({ gasUsed: receipt.gasUsed });
      }
      completeTransaction(transactionId, true);
      onSuccess?.();
    } else if (isActiveTransaction && isHydrated && receiptError) {
      // Transaction failed during confirmation
      setIsLocallyPending(false); // Reset local pending state
      completeTransaction(transactionId, false, receiptError);
      onError?.(receiptError);
    } else if (isActiveTransaction && !isPending && error) {
      // Transaction failed during submission
      setIsLocallyPending(false); // Reset local pending state
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  }, [
    isActiveTransaction,
    isHydrated,
    isConfirmed,
    isPending,
    error,
    receiptError,
    receipt,
    transactionId,
    completeTransaction,
    onSuccess,
    onError,
    onReceipt,
  ]);

  // Clear error when component unmounts or transaction changes
  React.useEffect(() => {
    return () => {
      if (isActiveTransaction) {
        clearError(transactionId);
      }
    };
  }, [isActiveTransaction, transactionId, clearError]);

  // Reset transaction state when transaction ID changes
  React.useEffect(() => {
    // Clear any stale transaction state when the transaction ID changes
    if (transactionState.activeTransactionId !== transactionId) {
      clearError(transactionId);
      setIsLocallyPending(false); // Reset local pending state
    }
  }, [transactionId, transactionState.activeTransactionId, clearError]);

  // Reset local pending state when all transactions are cleared (activeTransactionId becomes null)
  // This ensures the button is re-enabled after clearAllTransactions() is called
  React.useEffect(() => {
    if (!transactionState.activeTransactionId && !transactionState.isPending) {
      setIsLocallyPending(false);
    }
  }, [transactionState.activeTransactionId, transactionState.isPending]);

  // Trigger onTransactionSent when hash becomes available (transaction sent, before receipt)
  React.useEffect(() => {
    if (
      hash &&
      isActiveTransaction &&
      onTransactionSent &&
      !isConfirmed &&
      !isConfirming &&
      transactionSentHashRef.current !== hash
    ) {
      // Hash is available - transaction was sent by wallet, but receipt not yet confirmed
      transactionSentHashRef.current = hash;
      onTransactionSent(hash);
    }
  }, [hash, isActiveTransaction, onTransactionSent, isConfirmed, isConfirming]);

  // Reset the ref when transaction changes
  React.useEffect(() => {
    if (!isActiveTransaction) {
      transactionSentHashRef.current = null;
    }
  }, [isActiveTransaction]);

  // Determine button state
  const isDisabled =
    disabled ||
    isTransactionPending ||
    (transactionState.isPending && !isActiveTransaction);

  let buttonContent = children;
  if (isTransactionPending) {
    buttonContent = loadingText;
  } else if (hasTransactionError) {
    buttonContent = errorText;
  }

  // Remove rounded classes from className to enforce square corners
  const cleanedClassName = className
    .replace(/\brounded(-\w+)?\b/g, "")
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return (
    <button
      onClick={handleTransaction}
      disabled={isDisabled}
      className={`${cleanedClassName} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{
        borderRadius: 0, // Force square corners for industrial theme
      }}
    >
      {buttonContent}
    </button>
  );
}
