"use client";

import React, { useEffect, useState } from "react";
import {
  useAccount,
  useBalance,
  useSwitchChain,
  useDisconnect,
  useReadContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { flowTestnet } from "viem/chains";
import { formatEther } from "viem";
import MusicPlayer from "./MusicPlayer";
import PayButton from "./PayButton";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import UTCPurchaseModal from "./UTCPurchaseModal";

const Header: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showUTCPurchaseModal, setShowUTCPurchaseModal] = useState(false);

  const account = useAccount();
  const { data: balance } = useBalance({
    address: account.address,
    query: { enabled: isHydrated && !!account.address },
  });

  // Read UTC balance
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: account.address ? [account.address] : undefined,
    query: { enabled: isHydrated && !!account.address },
  });

  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  // Hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check if wallet is connecting
  const isConnecting =
    account.status === "connecting" || account.status === "reconnecting";

  useEffect(() => {
    if (account.status === "connected" && account.chainId !== flowTestnet.id) {
      switchChain({ chainId: flowTestnet.id });
    }
  }, [account, switchChain]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    try {
      disconnect();
      toast.success("Successfully disconnected!");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect. Please try again.");
    }
  };

  const isConnected = account.isConnected;

  return (
    <header
      className="border-b-2 border-solid"
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between py-2 gap-4">
          {/* Left side - Logo and Title */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <h1
                  className="text-3xl sm:text-4xl font-black uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-text-primary)",
                  }}
                >
                  WARPFLOW
                </h1>
                <div
                  className="absolute -bottom-1 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "var(--color-cyan)" }}
                ></div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div
                  className="px-3 py-1 border border-solid"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--color-amber)",
                    borderColor: "var(--color-amber)",
                    backgroundColor: "var(--color-near-black)",
                  }}
                >
                  [TESTNET ALPHA]
                </div>
              </div>
            </div>
            <div className="ml-0">
              <span
                className="text-sm px-2 py-1 border border-solid"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-warning-red)",
                  borderColor: "var(--color-warning-red)",
                  backgroundColor: "var(--color-near-black)",
                }}
              >
                In active development, ships and games will be lost
              </span>
            </div>
          </div>
          {/* Center section - Player Controls */}
          <div className="flex-1 flex justify-center items-center">
            <div
              className="border border-solid p-2"
              style={{
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
                backgroundColor: "var(--color-near-black)",
              }}
            >
              <MusicPlayer />
            </div>
          </div>

          {/* Right side - Wallet connection and info */}
          {isHydrated && (
            <>
              {isConnecting && (
                <div className="flex items-center">
                  <div className="text-cyan-400/60 font-mono text-sm">
                    Connecting...
                  </div>
                </div>
              )}

              {!isConnected && !isConnecting && (
                <div className="flex items-center">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openChainModal,
                      openConnectModal,
                      authenticationStatus,
                      mounted,
                    }) => {
                      const ready =
                        mounted && authenticationStatus !== "loading";
                      const connected =
                        ready &&
                        account &&
                        chain &&
                        (!authenticationStatus ||
                          authenticationStatus === "authenticated");

                      return (
                        <div
                          {...(!ready && {
                            "aria-hidden": true,
                            style: {
                              opacity: 0,
                              pointerEvents: "none",
                              userSelect: "none",
                            },
                          })}
                        >
                          {(() => {
                            if (!connected) {
                              return (
                                <button
                                  onClick={openConnectModal}
                                  type="button"
                                  className="px-6 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                                  style={{
                                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                                    borderColor: "var(--color-cyan)",
                                    color: "var(--color-cyan)",
                                    backgroundColor: "var(--color-steel)",
                                  }}
                                >
                                  [LOG IN]
                                </button>
                              );
                            }

                            if (chain.unsupported) {
                              return (
                                <button
                                  onClick={openChainModal}
                                  type="button"
                                  className="px-6 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                                  style={{
                                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                                    borderColor: "var(--color-warning-red)",
                                    color: "var(--color-warning-red)",
                                    backgroundColor: "var(--color-steel)",
                                  }}
                                >
                                  [WRONG NETWORK]
                                </button>
                              );
                            }

                            return null; // This case is handled in the connected section below
                          })()}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              )}

              {isConnected && (
                <div className="flex flex-col sm:flex-row items-end gap-4 ml-auto">
                  <div className="flex flex-col items-end gap-2">
                    {/* Flow Balance and Buy Flow button */}
                    <div className="flex items-center gap-2">
                      {/* Flow Balance */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 h-8 w-40 justify-center border border-solid"
                        style={{
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "var(--color-phosphor-green)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                      >
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-phosphor-green)",
                          }}
                        >
                          {balance?.value
                            ? `${parseFloat(balance.formatted).toFixed(2)} FLOW`
                            : "0.00 FLOW"}
                        </span>
                      </div>
                      {/* Buy Flow button (match network width) */}
                      <PayButton className="w-32 h-8" />
                    </div>

                    {/* UTC Balance and Network */}
                    <div className="flex items-center gap-2">
                      {/* UTC Balance - Clickable */}
                      <button
                        onClick={() => setShowUTCPurchaseModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 h-8 w-40 justify-center border border-solid transition-colors duration-150 cursor-pointer"
                        style={{
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "var(--color-amber)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-amber)";
                          e.currentTarget.style.backgroundColor = "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-amber)";
                          e.currentTarget.style.backgroundColor = "var(--color-near-black)";
                        }}
                      >
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-amber)",
                          }}
                        >
                          {utcBalance
                            ? `${formatEther(utcBalance as bigint)} UTC`
                            : "0.00 UTC"}
                        </span>
                      </button>
                      {/* Network (moved here) */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 h-8 w-32 justify-center border border-solid"
                        style={{
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "var(--color-cyan)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                      >
                        <div
                          className="w-2 h-2"
                          style={{
                            backgroundColor: "var(--color-cyan)",
                            animation: "pulse-functional 1.5s ease-in-out infinite",
                          }}
                        ></div>
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-cyan)",
                          }}
                        >
                          {account.chain?.name?.toUpperCase() || "FLOW TESTNET"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150 w-48 flex items-center justify-center text-xs h-8"
                      style={{
                        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                        borderColor: "var(--color-warning-red)",
                        color: "var(--color-warning-red)",
                        backgroundColor: "var(--color-steel)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-slate)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-steel)";
                      }}
                    >
                      [LOG OUT]
                    </button>
                    {/* Address (moved here) */}
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 h-8 w-48 justify-center border border-solid"
                      style={{
                        backgroundColor: "var(--color-near-black)",
                        borderColor: "var(--color-gunmetal)",
                        borderTopColor: "var(--color-steel)",
                        borderLeftColor: "var(--color-steel)",
                      }}
                    >
                      <span
                        className="text-xs font-bold tracking-wider uppercase"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {formatAddress(account.address || "")}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(account.address || "");
                          toast.success("Address copied to clipboard!");
                        }}
                        className="p-1 transition-colors duration-150"
                        style={{
                          color: "var(--color-text-secondary)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--color-cyan)";
                          e.currentTarget.style.backgroundColor = "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--color-text-secondary)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        title="Copy address to clipboard"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* UTC Purchase Modal */}
      {showUTCPurchaseModal && (
        <UTCPurchaseModal onClose={() => setShowUTCPurchaseModal(false)} />
      )}
    </header>
  );
};

export default Header;
