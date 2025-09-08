"use client";

import React from "react";
import { useWriteContract } from "wagmi";
import { toast } from "react-hot-toast";
import { useTransaction } from "../providers/TransactionContext";

interface TransactionButtonProps {
  // Transaction identification
  transactionId: string;

  // Contract call configuration
  contractAddress: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
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
  const { writeContract, isPending, error } = useWriteContract();
  const {
    transactionState,
    startTransaction,
    completeTransaction,
    clearError,
  } = useTransaction();

  // Check if this button is the active transaction
  const isActiveTransaction =
    transactionState.activeTransactionId === transactionId;
  const isTransactionPending =
    transactionState.isPending && isActiveTransaction;
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

  // Handle transaction completion
  React.useEffect(() => {
    if (isActiveTransaction && !isPending && !error) {
      // Transaction completed successfully
      completeTransaction(transactionId, true);
      onSuccess?.();
    } else if (isActiveTransaction && !isPending && error) {
      // Transaction failed
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  }, [
    isActiveTransaction,
    isPending,
    error,
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
