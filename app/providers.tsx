"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { http } from "wagmi";
import { MusicPlayerProvider } from "./providers/MusicPlayerContext";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState, useMemo } from "react";
import { xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: "WarpFlow",
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
        chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
        transports: {
          [flowTestnet.id]: http(),
          [saigon.id]: http(),
          [baseSepolia.id]: http(),
          [xaiTestnet.id]: http(),
        },
      }),
    []
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TransactionProvider>
            <MusicPlayerProvider>
              {children}
              <MobileAlphaNoticeModal />
            </MusicPlayerProvider>
          </TransactionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
