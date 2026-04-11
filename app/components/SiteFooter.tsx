"use client";

import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      className="flex shrink-0 flex-wrap items-center justify-center gap-[24px] text-sm uppercase tracking-wider"
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        color: "var(--color-text-muted)",
      }}
    >
      <span>VOID TACTICS ALPHA</span>
      <span aria-hidden="true" style={{ color: "var(--color-steel)" }}>
        |
      </span>
      <Link
        href="/privacy"
        className="underline decoration-current/40 underline-offset-4 transition-colors hover:text-cyan-400"
        style={{ color: "var(--color-text-muted)" }}
      >
        Privacy Policy
      </Link>
      <Link
        href="/terms"
        className="underline decoration-current/40 underline-offset-4 transition-colors hover:text-cyan-400"
        style={{ color: "var(--color-text-muted)" }}
      >
        Terms of Service
      </Link>
    </footer>
  );
}
