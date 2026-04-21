"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { getChainById } from "../config/networks";
import { useSelectedChainId } from "../hooks/useSelectedChainId";

/** Registers PostHog super properties so every event includes the app network picker chain. */
export function PosthogAppChainSync() {
  const chainId = useSelectedChainId();

  useEffect(() => {
    const chain = getChainById(chainId);
    posthog.register({
      app_chain_id: chainId,
      app_chain_name: chain.name,
    });
  }, [chainId]);

  return null;
}
