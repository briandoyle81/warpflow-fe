import posthog from "posthog-js";
import { getChainById, getSelectedChainId } from "./app/config/networks";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});

// Super properties on every capture: in-app network (picker) before React mounts.
if (typeof window !== "undefined") {
  try {
    const chainId = getSelectedChainId();
    const chain = getChainById(chainId);
    posthog.register({
      app_chain_id: chainId,
      app_chain_name: chain.name,
    });
  } catch {
    /* ignore storage / edge cases */
  }
}
