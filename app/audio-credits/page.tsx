import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audio Credits | Void Tactics",
  description: "Audio asset credits used in the Void Tactics alpha.",
};

export default function AudioCreditsPage() {
  return (
    <div
      className="min-h-screen px-4 py-10 sm:px-8"
      style={{
        backgroundColor: "var(--color-near-black)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-8">
          <Link
            href="/"
            className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-300"
          >
            Back to Void Tactics
          </Link>
        </p>

        <h1
          className="mb-2 text-2xl font-bold uppercase tracking-wider sm:text-3xl"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-cyan)",
          }}
        >
          Audio Credits
        </h1>

        <p
          className="mb-10 text-sm uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Last updated: April 15, 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed sm:text-base">
          <section className="space-y-3">
            <h2
              className="text-lg font-bold uppercase tracking-wide"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              UI Sound Effect
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }}>
              &ldquo;UI_6 Tonal beep.Aliens.Proximity
              alert(63osc,chrs,cmpr).wav&rdquo;
            </p>
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span className="opacity-80">Source:</span>{" "}
              <a
                href="https://freesound.org/s/563864/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-300"
              >
                freesound.org/s/563864/
              </a>
            </p>
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span className="opacity-80">License:</span> Attribution 4.0
            </p>
          </section>

          <section className="space-y-3">
            <h2
              className="text-lg font-bold uppercase tracking-wide"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              Background Music
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }}>
              &ldquo;synthwave-80s-robot-swarm-218092.mp3&rdquo;
            </p>
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span className="opacity-80">Source:</span> Pixabay
            </p>
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span className="opacity-80">Author credit:</span> Nick Panek{" "}
              <a
                href="https://heylink.me/nickpanek/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-300"
              >
                (check my other projects)
              </a>
            </p>
            <p style={{ color: "var(--color-text-secondary)" }}>
              <span className="opacity-80">License:</span>{" "}
              <a
                href="https://pixabay.com/service/license-summary/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-300"
              >
                Pixabay License Summary
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
