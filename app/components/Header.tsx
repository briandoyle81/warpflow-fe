import React, { useEffect } from "react";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { flowTestnet } from "viem/chains";
import MusicPlayer from "./MusicPlayer";
import PayButton from "./PayButton";
import { toast } from "react-hot-toast";

const Header: React.FC = () => {
  const {
    primaryWallet,
    user,
    handleUnlinkWallet,
    handleLogOut,
    setShowAuthFlow,
  } = useDynamicContext();
  const account = useAccount();
  const { data: balance } = useBalance({ address: account.address });
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (account.status === "connected" && account.chainId !== flowTestnet.id) {
      switchChain({ chainId: flowTestnet.id });
    }
  }, [account, switchChain]);

  const renderBalance = () => {
    if (!balance?.value) return null;

    if (balance.value === BigInt(0)) {
      return (
        <div className="flex items-center gap-1 text-amber-400">
          <span className="font-mono font-bold text-xs tracking-wider">
            ⚠️ NEED FLOW ON {account.chain?.name?.toUpperCase()} ⚠️
          </span>
        </div>
      );
    }

    const formattedBalance = balance.formatted
      .split(".")
      .map((part, i) => (i === 1 ? part.slice(0, 5) : part))
      .join(".");

    return (
      <div className="flex items-center gap-1">
        <span className="text-cyan-400 text-xs font-mono font-bold tracking-wider">
          ⚡ {formattedBalance} FLOW ⚡
        </span>
      </div>
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    try {
      // Try the primary disconnect method first
      if (handleLogOut) {
        await handleLogOut();
        toast.success("Successfully disconnected!");
      } else if (handleUnlinkWallet && primaryWallet?.key) {
        // Fallback to unlink wallet if handleLogOut is not available
        await handleUnlinkWallet(primaryWallet.key);
        toast.success("Successfully disconnected!");
      } else {
        // If neither method is available, show error
        toast.error("Disconnect method not available");
        console.error("No disconnect method available");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect. Please try again.");
    }
  };

  const isConnected = primaryWallet && user;

  return (
    <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b-2 border-cyan-400 shadow-lg shadow-cyan-400/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between py-2 gap-4">
          {/* Left side - Logo and Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-wider">
                  WARPFLOW
                </h1>
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"></div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <span className="text-lg sm:text-xl font-mono font-bold text-amber-400 tracking-wider px-3 py-1 border border-amber-400 bg-black/30">
                    [TESTNET ALPHA]
                  </span>
                  <div className="absolute inset-0 bg-amber-400/10 animate-pulse"></div>
                </div>
                <div className="border border-purple-400 bg-black/40 rounded-lg p-2">
                  <MusicPlayer />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Wallet connection and info */}
          {!isConnected && (
            <div className="flex items-center">
              <button
                onClick={() => setShowAuthFlow(true)}
                className="border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 px-6 py-2 rounded-lg font-mono font-bold tracking-wider transition-all duration-200 shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 bg-black/40"
              >
                [LOG IN]
              </button>
            </div>
          )}

          {isConnected && (
            <div className="flex flex-col sm:flex-row items-end gap-4 ml-auto">
              <div className="flex flex-col items-end gap-2">
                {/* Flow Balance and Chain indicator */}
                <div className="flex items-center gap-2">
                  {/* Flow Balance */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-green-400 shadow-lg shadow-green-400/30 h-8 w-32 justify-center">
                    <span className="text-green-400 text-xs font-mono font-bold tracking-wider">
                      {balance?.value
                        ? `${parseFloat(balance.formatted).toFixed(2)} FLOW`
                        : "0.00 FLOW"}
                    </span>
                  </div>

                  {/* Chain indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-cyan-400 shadow-lg shadow-cyan-400/30 h-8 w-48 justify-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                    <span className="text-cyan-400 text-xs font-mono font-bold tracking-wider">
                      {account.chain?.name?.toUpperCase() || "FLOW TESTNET"}
                    </span>
                  </div>
                </div>

                {/* UTC Balance and Address */}
                <div className="flex items-center gap-2">
                  {/* UTC Balance */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-yellow-400 shadow-lg shadow-yellow-400/30 h-8 w-32 justify-center">
                    <span className="text-yellow-400 text-xs font-mono font-bold tracking-wider">
                      0.00 UTC
                    </span>
                  </div>

                  {/* Address and balance */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-purple-400 shadow-lg shadow-purple-400/30 h-8 w-48 justify-center">
                    <span className="text-purple-400 text-xs font-mono font-bold tracking-wider">
                      {formatAddress(primaryWallet.address)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(primaryWallet.address);
                        toast.success("Address copied to clipboard!");
                      }}
                      className="text-purple-400 hover:text-purple-300 transition-all duration-200 p-1 hover:bg-purple-400/10 rounded"
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
                    {renderBalance()}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-col">
                <button
                  onClick={handleDisconnect}
                  className="border-2 border-red-400 text-red-400 hover:border-red-300 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg font-mono font-bold tracking-wider transition-all duration-200 shadow-lg shadow-red-400/20 hover:shadow-red-400/40 w-32 flex items-center justify-center text-xs h-8"
                >
                  [LOG OUT]
                </button>
                <PayButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
