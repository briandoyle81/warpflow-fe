"use client";

import React, { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "void-tactics-flow-wallet-notice-dismissed";

const FLOW_WALLET_STATUS_URL =
  "https://x.com/voidtacticsxyz/status/2045178935927804177";

function persistDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export default function FlowWalletNoticeBar({
  suppressed = false,
}: {
  /** When true, do not render (e.g. fullscreen tutorial or games detail). */
  suppressed?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
    setMounted(true);
  }, []);

  const dismiss = useCallback(() => {
    persistDismissed();
    setVisible(false);
  }, []);

  if (suppressed || !mounted || !visible) {
    return null;
  }

  return (
    <div
      className="relative w-full border-b-2 border-solid py-2 pl-3 pr-11 sm:pl-6 sm:pr-12"
      style={{
        backgroundColor: "var(--color-cyan)",
        borderColor: "var(--color-near-black)",
      }}
      role="region"
      aria-label="Flow wallet status"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border-0 bg-transparent leading-none transition-opacity hover:opacity-70"
        style={{
          color: "var(--color-near-black)",
        }}
        aria-label="Dismiss announcement"
      >
        <span className="text-2xl font-light" aria-hidden>
          ×
        </span>
      </button>
      <div className="mx-auto flex max-w-7xl items-center justify-center">
        <p
          className="line-clamp-2 w-full text-center text-xs font-semibold uppercase tracking-wider sm:text-sm sm:line-clamp-1"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-near-black)",
          }}
        >
          Investigating problems with the Flow wallet.{" "}
          <a
            href={FLOW_WALLET_STATUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-near-black)",
              textDecorationColor:
                "color-mix(in srgb, var(--color-near-black) 55%, transparent)",
            }}
          >
            Details here
          </a>
        </p>
      </div>
    </div>
  );
}
