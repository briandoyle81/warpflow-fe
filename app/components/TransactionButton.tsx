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

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receiptData,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash && isHydrated, // Only enable when we have a hash and are hydrated
    },
  });

  // Check if this button is the active transaction
  const isActiveTransaction =
    transactionState.activeTransactionId === transactionId;

  // Fallback timeout for transaction completion
  const [fallbackTimeout, setFallbackTimeout] =
    React.useState<NodeJS.Timeout | null>(null);

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
        console.log(
          `Transaction ${transactionId} fallback timeout - assuming success`
        );
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
    (isHydrated && isConfirming);
  const hasTransactionError = transactionState.error && isActiveTransaction;

  // Debug logging
  React.useEffect(() => {
    if (isActiveTransaction) {
      console.log(`Transaction ${transactionId} state:`, {
        isPending,
        isConfirming,
        isConfirmed,
        error,
        receiptError,
        receiptData,
        transactionStatePending: transactionState.isPending,
        isActiveTransaction,
        isTransactionPending,
        hasTransactionError,
        hash,
      });
    }
  }, [
    isPending,
    isConfirming,
    isConfirmed,
    error,
    receiptError,
    receiptData,
    transactionState.isPending,
    isActiveTransaction,
    isTransactionPending,
    hasTransactionError,
    transactionId,
    hash,
  ]);

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

      // Execute the contract call
      await writeContract({
        address: contractAddress,
        abi,
        functionName,
        args,
        value,
      });

      // Transaction was submitted successfully
      // Note: We'll handle completion in a useEffect when isPending changes
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  };

  // Handle transaction completion based on receipt confirmation
  React.useEffect(() => {
    if (isActiveTransaction && isHydrated && isConfirmed) {
      // Transaction confirmed on blockchain
      console.log(`Transaction ${transactionId} confirmed on blockchain`);
      completeTransaction(transactionId, true);
      onSuccess?.();
    } else if (isActiveTransaction && isHydrated && receiptError) {
      // Transaction failed during confirmation
      console.log(
        `Transaction ${transactionId} failed during confirmation:`,
        receiptError
      );
      completeTransaction(transactionId, false, receiptError);
      onError?.(receiptError);
    } else if (isActiveTransaction && !isPending && error) {
      // Transaction failed during submission
      console.log(
        `Transaction ${transactionId} failed during submission:`,
        error
      );
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
    transactionId,
    completeTransaction,
    onSuccess,
    onError,
  ]);

  // Clear error when component unmounts or transaction changes
  React.useEffect(() => {
    return () => {
      if (isActiveTransaction) {
        clearError(transactionId);
      }
    };
  }, [isActiveTransaction, transactionId, clearError]);

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

  return (
    <button
      onClick={handleTransaction}
      disabled={isDisabled}
      className={`${className} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {buttonContent}
    </button>
  );
}
