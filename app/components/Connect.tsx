import React, { useEffect, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import posthog from "posthog-js";

const Connect: React.FC = () => {
  const { address, status } = useAccount();
  const hasIdentified = useRef(false);

  useEffect(() => {
    if (status === "connected" && address && !hasIdentified.current) {
      hasIdentified.current = true;
      posthog.identify(address, { wallet_address: address });
      posthog.capture("wallet_connected", { wallet_address: address });
    }
    if (status === "disconnected") {
      hasIdentified.current = false;
    }
  }, [status, address]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

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
                    className="border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
                    style={{ borderRadius: 0 }}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="border-2 border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
                    style={{ borderRadius: 0 }}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    style={{ display: "flex", alignItems: "center", borderRadius: 0 }}
                    type="button"
                    className="border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
                    style={{ borderRadius: 0 }}
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ""}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default Connect;
