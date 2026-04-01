"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  useSwitchChain,
  useDisconnect,
  useReadContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import MusicPlayer from "./MusicPlayer";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import UTCPurchaseModal from "./UTCPurchaseModal";
import {
  DEFAULT_CHAIN_ID,
  getSelectedChainId,
  getNativeTokenSymbol,
  getVariantForChainId,
  isSupportedChainId,
  setSelectedChainId,
  SUPPORTED_CHAINS,
} from "../config/networks";

const Header: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showUTCPurchaseModal, setShowUTCPurchaseModal] = useState(false);
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);

  const account = useAccount();

  const [selectedChainId, setSelectedChainIdState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
    return getSelectedChainId();
  });
  const pendingSwitchChainIdRef = useRef<number | null>(null);
  const lastSwitchRequestRef = useRef<{ chainId: number; at: number } | null>(
    null,
  );
  const lastVariantWarningKeyRef = useRef<string | null>(null);
  const networkMenuRef = useRef<HTMLDivElement | null>(null);

  const nativeTokenSymbol = getNativeTokenSymbol(selectedChainId);
  const selectedChainVariant = getVariantForChainId(selectedChainId);
  const { data: balance } = useBalance({
    address: account.address,
    chainId: selectedChainId,
    query: { enabled: isHydrated && !!account.address },
  });

  const maxVariantConfig = useMemo(
    () => ({
      address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
      abi: CONTRACT_ABIS.SHIPS as Abi,
      functionName: "maxVariant" as const,
      chainId: selectedChainId,
      query: {
        enabled: isHydrated && isSupportedChainId(selectedChainId),
      },
    }),
    [isHydrated, selectedChainId],
  );

  const { data: maxVariant } = useReadContract(maxVariantConfig);

  // Read UTC balance
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: account.address ? [account.address] : undefined,
    chainId: selectedChainId,
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

  // Keep selected chain in sync with wallet chain after a successful switch/connect.
  useEffect(() => {
    if (!isHydrated) return;
    if (account.status !== "connected") return;
    if (!isSupportedChainId(account.chainId)) return;
    if (
      pendingSwitchChainIdRef.current &&
      account.chainId !== pendingSwitchChainIdRef.current
    ) {
      return;
    }

    pendingSwitchChainIdRef.current = null;
    if (selectedChainId !== account.chainId) {
      setSelectedChainId(account.chainId);
      setSelectedChainIdState(account.chainId);
    }
  }, [isHydrated, account.status, account.chainId, selectedChainId]);

  // Warn if chain variant mapping is incompatible with deployed contract config.
  useEffect(() => {
    if (!isHydrated) return;
    if (maxVariant == null) return;
    const maxVariantNumber = Number(maxVariant);
    if (!Number.isFinite(maxVariantNumber)) return;
    if (selectedChainVariant <= maxVariantNumber) return;

    const warningKey = `${selectedChainId}:${selectedChainVariant}:${maxVariantNumber}`;
    if (lastVariantWarningKeyRef.current === warningKey) return;
    lastVariantWarningKeyRef.current = warningKey;

    toast.error(
      `Network variant mismatch: selected variant ${selectedChainVariant} exceeds contract maxVariant ${maxVariantNumber}. Claims and purchases may fail until mapping is updated.`,
      { duration: 8000 },
    );
  }, [isHydrated, maxVariant, selectedChainId, selectedChainVariant]);

  // When connected, ensure wallet is on the selected chain.
  useEffect(() => {
    if (!isHydrated) return;
    if (account.status !== "connected") return;
    if (!isSupportedChainId(selectedChainId)) return;
    if (account.chainId === selectedChainId) {
      pendingSwitchChainIdRef.current = null;
      return;
    }

    // Track that we're attempting a switch (prevents "sync from wallet" effect fighting us)
    pendingSwitchChainIdRef.current = selectedChainId;

    // Avoid spamming switch requests while a wallet prompt is pending
    const now = Date.now();
    const last = lastSwitchRequestRef.current;
    if (last && last.chainId === selectedChainId && now - last.at < 2000) {
      return;
    }
    lastSwitchRequestRef.current = { chainId: selectedChainId, at: now };
    switchChain({ chainId: selectedChainId });
  }, [
    account.status,
    account.chainId,
    isHydrated,
    selectedChainId,
    switchChain,
  ]);

  const handleNetworkChange = (nextId: number) => {
    setSelectedChainId(nextId);
    setSelectedChainIdState(nextId);
    pendingSwitchChainIdRef.current = nextId;
    setIsNetworkMenuOpen(false);
  };

  useEffect(() => {
    if (!isNetworkMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (networkMenuRef.current && !networkMenuRef.current.contains(target)) {
        setIsNetworkMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNetworkMenuOpen]);

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
      className="relative z-[300] border-b-2 border-solid overflow-visible"
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
        <div className="flex flex-wrap items-center justify-between py-2 gap-4 overflow-visible">
          {/* Left side - Logo and Title */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <h1
                  className="text-3xl sm:text-4xl font-black uppercase tracking-wider"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-text-primary)",
                  }}
                >
                  VOID TACTICS
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
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                  fontFamily:
                    "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                                    fontFamily:
                                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                                    borderColor: "var(--color-cyan)",
                                    color: "var(--color-cyan)",
                                    backgroundColor: "var(--color-steel)",
                                    borderRadius: 0, // Square corners for industrial theme
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
                                    fontFamily:
                                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                                    borderColor: "var(--color-warning-red)",
                                    color: "var(--color-warning-red)",
                                    backgroundColor: "var(--color-steel)",
                                    borderRadius: 0, // Square corners for industrial theme
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
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-phosphor-green)",
                          }}
                        >
                          {balance?.value
                            ? `${parseFloat(balance.formatted).toFixed(2)} ${nativeTokenSymbol}`
                            : `0.00 ${nativeTokenSymbol}`}
                        </span>
                      </div>
                      {/* Buy Tokens button (disabled placeholder) */}
                      <button
                        type="button"
                        disabled
                        className="w-32 h-8 border border-solid text-xs font-bold tracking-wider uppercase cursor-not-allowed opacity-70"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: "var(--color-text-muted)",
                          backgroundColor: "var(--color-steel)",
                          borderColor: "var(--color-gunmetal)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                      >
                        [BUY TOKENS]
                      </button>
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
                          e.currentTarget.style.borderColor =
                            "var(--color-amber)";
                          e.currentTarget.style.backgroundColor =
                            "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-amber)";
                          e.currentTarget.style.backgroundColor =
                            "var(--color-near-black)";
                        }}
                      >
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                        ref={networkMenuRef}
                        className="relative z-[120] h-8 w-32"
                      >
                        <button
                          type="button"
                          onClick={() => setIsNetworkMenuOpen((prev) => !prev)}
                          disabled={!isHydrated || isConnecting}
                          className="flex h-full w-full items-center justify-center border border-solid px-3 pr-7 text-center text-[11px] font-bold uppercase tracking-wider transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-cyan)",
                            backgroundColor: "var(--color-near-black)",
                            borderColor: "var(--color-cyan)",
                            borderTopColor: "var(--color-steel)",
                            borderLeftColor: "var(--color-steel)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isHydrated || isConnecting) return;
                            e.currentTarget.style.backgroundColor =
                              "var(--color-slate)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "var(--color-near-black)";
                          }}
                        >
                          {(
                            SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)
                              ?.name ?? "NETWORK"
                          ).toUpperCase()}
                        </button>
                        <span
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] leading-none"
                          style={{ color: "var(--color-cyan)" }}
                        >
                          {isNetworkMenuOpen ? "▲" : "▼"}
                        </span>

                        {isNetworkMenuOpen && (
                          <div
                            className="absolute left-0 top-[calc(100%+4px)] z-[130] w-32 border border-solid shadow-lg"
                            style={{
                              backgroundColor: "var(--color-near-black)",
                              borderColor: "var(--color-cyan)",
                              borderTopColor: "var(--color-steel)",
                              borderLeftColor: "var(--color-steel)",
                            }}
                          >
                            {SUPPORTED_CHAINS.map((c) => {
                              const isActive = c.id === selectedChainId;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleNetworkChange(c.id)}
                                  className="flex h-8 w-full items-center px-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors duration-150"
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                    color: isActive
                                      ? "var(--color-near-black)"
                                      : "var(--color-cyan)",
                                    backgroundColor: isActive
                                      ? "var(--color-cyan)"
                                      : "transparent",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (isActive) return;
                                    e.currentTarget.style.backgroundColor =
                                      "var(--color-slate)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (isActive) return;
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                >
                                  {c.name.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150 w-48 flex items-center justify-center text-xs h-8"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        borderColor: "var(--color-warning-red)",
                        color: "var(--color-warning-red)",
                        backgroundColor: "var(--color-steel)",
                        borderRadius: 0, // Square corners for industrial theme
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-slate)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-steel)";
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
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
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
                          e.currentTarget.style.backgroundColor =
                            "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            "var(--color-text-secondary)";
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
