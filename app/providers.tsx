"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { flowTestnet } from "viem/chains";
import { http } from "wagmi";
import { MusicPlayerProvider } from "./providers/MusicPlayerContext";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState } from "react";

const config = getDefaultConfig({
  appName: "WarpFlow",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [flowTestnet],
  transports: {
    [flowTestnet.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TransactionProvider>
            <MusicPlayerProvider>{children}</MusicPlayerProvider>
          </TransactionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
