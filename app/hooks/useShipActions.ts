import { useAccount } from "wagmi";
import { useShipsWrite } from "./useShipsContract";
import { useOwnedShips } from "./useOwnedShips";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useEffect } from "react";

export function useShipActions() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();
  const { writeContract, isPending, error } = useShipsWrite();

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

  // Construct a single ship
  const constructShip = async (shipId: bigint) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
            name: "constructShip",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "constructShip",
        args: [shipId],
      });

      toast.success("Ship construction started!");
      // Refetch ships data after successful transaction
      setTimeout(() => refetch(), 2000);
    } catch (err: unknown) {
      console.error("Error constructing ship:", err);

      // Check if the error is due to user rejection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to construct ship");
      }
    }
  };

  // Construct all owned ships
  const constructAllShips = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: "constructAllMyShips",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "constructAllMyShips",
        args: [],
      });

      toast.success("Bulk ship construction started!");
      setTimeout(() => refetch(), 2000);
    } catch (err: unknown) {
      console.error("Error constructing all ships:", err);

      // Check if the error is due to user rejection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to construct ships");
      }
    }
  };

  // Recycle ships for UC tokens
  const recycleShips = async (shipIds: bigint[]) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (shipIds.length === 0) {
      toast.error("No ships selected for recycling");
      return;
    }

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
        abi: [
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_shipIds",
                type: "uint256[]",
              },
            ],
            name: "shipBreaker",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "shipBreaker",
        args: [shipIds],
      });

      toast.success(`Recycling ${shipIds.length} ships for UC tokens!`);
      setTimeout(() => refetch(), 2000);
    } catch (err: unknown) {
      console.error("Error recycling ships:", err);

      // Check if the error is due to user rejection
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to recycle ships");
      }
    }
  };

  return {
    constructShip,
    constructAllShips,
    recycleShips,
    isPending,
    error,
  };
}
