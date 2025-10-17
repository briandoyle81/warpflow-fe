"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "react-hot-toast";

interface TransactionState {
  isPending: boolean;
  error: Error | null;
  activeTransactionId: string | null;
}

interface TransactionContextType {
  transactionState: TransactionState;
  startTransaction: (transactionId: string) => void;
  completeTransaction: (
    transactionId: string,
    success: boolean,
    error?: Error
  ) => void;
  clearError: (transactionId: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export function TransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isPending: false,
    error: null,
    activeTransactionId: null,
  });

  const startTransaction = useCallback((transactionId: string) => {
    setTransactionState({
      isPending: true,
      error: null,
      activeTransactionId: transactionId,
    });
  }, []);

  const completeTransaction = useCallback(
    (transactionId: string, success: boolean, error?: Error) => {
      setTransactionState((prev) => {
        // Only update if this is the active transaction
        if (prev.activeTransactionId !== transactionId) {
          return prev;
        }

        if (success) {
          return {
            isPending: false,
            error: null,
            activeTransactionId: null,
          };
        } else {
          const errorMessage = error?.message || "Transaction failed";

          // Check if the error is due to user rejection
          if (
            errorMessage.includes("User rejected") ||
            errorMessage.includes("User denied") ||
            errorMessage.includes("rejected")
          ) {
            toast.error("Transaction declined by user");
          } else {
            toast.error(`Transaction failed: ${errorMessage}`);
          }

          return {
            isPending: false,
            error: error || null,
            activeTransactionId: null,
          };
        }
      });
    },
    []
  );

  const clearError = useCallback((transactionId: string) => {
    setTransactionState((prev) => {
      if (prev.activeTransactionId === transactionId) {
        return {
          ...prev,
          error: null,
        };
      }
      return prev;
    });
  }, []);

  const clearAllTransactions = useCallback(() => {
    setTransactionState({
      isPending: false,
      error: null,
      activeTransactionId: null,
    });
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactionState,
        startTransaction,
        completeTransaction,
        clearError,
        clearAllTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransaction must be used within a TransactionProvider");
  }
  return context;
}
