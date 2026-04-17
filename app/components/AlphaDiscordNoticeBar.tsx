"use client";

import React, { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "void-tactics-alpha-discord-notice-dismissed";

const VOID_TACTICS_ALPHA_ACCESS_TWEET =
  "Hi @voidtacticsxyz, I'm interested in the Void Tactics Alpha at https://www.voidtactics.xyz!\n\nPlease add me to the Discord!";
const VOID_TACTICS_ALPHA_TWITTER_INTENT = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
  VOID_TACTICS_ALPHA_ACCESS_TWEET,
)}`;

function persistDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export default function AlphaDiscordNoticeBar({
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

  const handleLinkClick = useCallback(() => {
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
        backgroundColor: "var(--color-amber)",
        borderColor: "var(--color-near-black)",
      }}
      role="region"
      aria-label="Alpha announcement"
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
          className="line-clamp-1 w-full text-center text-xs font-semibold uppercase tracking-wider sm:text-sm"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-near-black)",
          }}
        >
          <span className="font-black">Alpha:</span>{" "}
          coordinate matches and get updates on Discord.{" "}
          <a
            href={VOID_TACTICS_ALPHA_TWITTER_INTENT}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-near-black)",
              textDecorationColor: "color-mix(in srgb, var(--color-near-black) 55%, transparent)",
            }}
          >
            Join the server
          </a>
          .
        </p>
      </div>
    </div>
  );
}
