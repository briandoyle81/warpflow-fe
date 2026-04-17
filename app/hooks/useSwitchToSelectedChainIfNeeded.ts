"use client";

import { useCallback } from "react";
import { useAccount, useConfig } from "wagmi";
import { isChainSelectableInUi } from "../config/networks";
import { useSelectedChainId } from "./useSelectedChainId";
import { switchWalletToAppChain } from "../utils/switchWalletChain";

/** Switches the connected wallet to the in-app network picker chain when needed. */
export function useSwitchToSelectedChainIfNeeded() {
  const config = useConfig();
  const { status, chainId: walletChainId, connector } = useAccount();
  const selectedChainId = useSelectedChainId();

  const switchToSelectedChainIfNeeded = useCallback(async () => {
    if (status !== "connected") return;
    if (!isChainSelectableInUi(selectedChainId)) return;
    if (walletChainId === selectedChainId) return;
    if (!connector) {
      throw new Error("No wallet connector available");
    }
    await switchWalletToAppChain(config, connector, selectedChainId);
  }, [config, connector, status, walletChainId, selectedChainId]);

  return switchToSelectedChainIfNeeded;
}
