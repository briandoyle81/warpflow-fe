import posthog from "posthog-js";
import { getChainById, getSelectedChainId } from "./app/config/networks";

const posthogProjectToken =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

if (posthogProjectToken) {
  posthog.init(posthogProjectToken, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
} else {
  console.error(
    "PostHog disabled: set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN or NEXT_PUBLIC_POSTHOG_TOKEN."
  );
}

// Super properties on every capture: in-app network (picker) before React mounts.
if (typeof window !== "undefined") {
  const normalizeError = (value: unknown): { message: string; stack?: string } => {
    if (value instanceof Error) {
      return {
        message: value.message || "Unknown error",
        stack: value.stack,
      };
    }
    if (typeof value === "string") {
      return { message: value };
    }
    try {
      return { message: JSON.stringify(value) };
    } catch {
      return { message: String(value) };
    }
  };

  // Belt-and-suspenders capture for browsers/runtimes where automatic exception
  // capture may miss some global errors.
  window.addEventListener("error", (event) => {
    const normalized = normalizeError(event.error ?? event.message);
    posthog.captureException(new Error(normalized.message), {
      $exception_message: normalized.message,
      $exception_stack_trace: normalized.stack,
      error_filename: event.filename,
      error_lineno: event.lineno,
      error_colno: event.colno,
      error_type: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const normalized = normalizeError(event.reason);
    posthog.captureException(new Error(normalized.message), {
      $exception_message: normalized.message,
      $exception_stack_trace: normalized.stack,
      error_type: "unhandledrejection",
    });
  });

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
