"use client";

import React, { useState, useLayoutEffect } from "react";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { TUTORIAL_STEP_STORAGE_KEY } from "../types/onboarding";
import { useAccount } from "wagmi";
import posthog from "posthog-js";
import { HeroShipShowcase } from "./HeroShipShowcase";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { FreeShipClaimButton } from "./FreeShipClaimButton";

const Info: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { refetch } = useOwnedShips();
  const {
    isEligible,
    isLoadingClaimStatus,
    claimStatusError,
    nextClaimInFormatted,
    error: freeShipError,
  } = useFreeShipClaiming();
  // Check if there's a saved tutorial step on mount
  const [showTutorial, setShowTutorial] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY);
      // Auto-show tutorial if there's a saved step (user was in progress)
      return saved !== null;
    }
    return false;
  });

  // Notify the top-level layout when tutorial is active so it can mirror
  // the full-width game view layout (no extra padding/max-width).
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("void-tactics-info-tutorial-active", {
        detail: { active: showTutorial },
      }),
    );
  }, [showTutorial]);

  if (showTutorial) {
    return (
      <OnboardingTutorial
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />
    );
  }

  const handlePlayNow = () => {
    posthog.capture("info_play_now_clicked", {
      wallet_connected: isConnected,
      ...(address ? { wallet_address: address } : {}),
    });
    setShowTutorial(true);
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-8"
      aria-label="Void Tactics info"
    >
      <p className="sr-only">
        Void Tactics is a fully onchain turn-based PvP fleet strategy game on
        Flow. Build ships, manage your navy, join lobbies, and play tactical
        grid battles where range, movement, and target priority decide each
        match.
      </p>
      {/* Hero Section - full width so its inner grid aligns with key features below */}
      <section
        className="md:col-span-12 border-2 border-cyan-400 bg-black/60 py-8 relative overflow-hidden"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
        aria-labelledby="info-hero-heading"
      >
        {/* Background pattern/grid effect */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--color-cyan) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center px-6 md:px-0">
          {/* Left side - Text + primary CTA */}
          <div className="text-center md:text-left md:col-span-5 pl-6 md:pl-8">
            <h1
              id="info-hero-heading"
              className="text-5xl md:text-6xl font-bold mb-4 tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
                textShadow: "0 0 20px rgba(86, 214, 255, 0.5)",
              }}
            >
              VOID TACTICS
            </h1>
            <p
              className="text-xl md:text-2xl mb-3 opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              STRATEGIC PvP FLEET COMMAND
            </p>
            <p
              className="text-lg mb-4 opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Admiral, your fleet is dropping out of warp under fire.
            </p>
            <p
              className="text-base mb-6 opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Deploy your ships. Outmaneuver real opponents with positioning,
              range control, and ruthless target priority in tactical,
              turn-based battles.
            </p>
            <div className="flex flex-col gap-3 items-center md:items-start">
              <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <button
                  onClick={handlePlayNow}
                  className="px-10 py-4 border-2 border-solid uppercase font-black tracking-wider transition-colors duration-150 w-full md:w-auto"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "rgba(34, 48, 65, 0.85)",
                    borderRadius: 0,
                    boxShadow: "0 0 22px rgba(86, 214, 255, 0.18)",
                  }}
                >
                  [PLAY NOW]
                </button>
                {!isConnected && (
                  <button
                    disabled
                    className="px-8 py-4 border-2 border-green-400 text-green-400 font-mono font-bold tracking-wider transition-all duration-200 opacity-50 cursor-not-allowed w-full md:w-auto rounded-none"
                    style={{ borderRadius: 0 }}
                  >
                    [LOG IN TO CLAIM FREE SHIPS]
                  </button>
                )}
                {isConnected &&
                  !isLoadingClaimStatus &&
                  !freeShipError &&
                  !claimStatusError &&
                  isEligible && (
                    <FreeShipClaimButton
                      isEligible={isEligible}
                      analyticsSurface="info"
                      className="px-8 py-4 border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                      onSuccess={() => refetch()}
                    >
                      [CLAIM FREE SHIPS]
                    </FreeShipClaimButton>
                  )}
                {isConnected &&
                  !isLoadingClaimStatus &&
                  !freeShipError &&
                  !claimStatusError &&
                  !isEligible && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent(
                              "void-tactics-navigate-to-manage-navy",
                            ),
                          )
                        }
                        className="px-8 py-4 border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 font-mono font-bold tracking-wider transition-all duration-200 w-full md:w-auto rounded-none"
                        style={{ borderRadius: 0 }}
                      >
                        [VIEW FLEET]
                      </button>
                      {nextClaimInFormatted != null && (
                        <div
                          className="px-8 py-4 border-2 border-amber-400/80 text-amber-400 font-mono font-bold tracking-wider bg-amber-400/5 rounded-none"
                          title="Time until you can claim free ships again"
                        >
                          NEXT CLAIM IN: {nextClaimInFormatted}
                        </div>
                      )}
                    </>
                  )}
              </div>
            </div>
          </div>

          {/* Right side - Gameplay clip (above the fold) */}
          <div className="md:col-span-7 flex justify-center md:justify-end pr-6 md:pr-8">
            <div
              className="w-full max-w-2xl border-2 border-cyan-400 bg-black/40 p-2"
              style={{
                borderRadius: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/missile-clip.gif"
                alt="Missiles firing at target ships with damage numbers and health bars"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ship demo display (kept, moved below hero) */}
      <section
        className="md:col-span-12 border-2 border-phosphor-green bg-black/40 p-6"
        style={{
          borderRadius: 0,
        }}
        aria-labelledby="info-intel-heading"
      >
        <h2
          id="info-intel-heading"
          className="text-xl font-bold mb-3 tracking-wider text-center md:text-left"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-phosphor-green)",
          }}
        >
          [INTEL]
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/0 p-1" style={{ borderRadius: 0 }}>
            <HeroShipShowcase seedOffset={0} align="start" side="allied" />
          </div>
          <div className="bg-black/0 p-1" style={{ borderRadius: 0 }}>
            <HeroShipShowcase
              seedOffset={3}
              align="start"
              side="enemy"
              flipLayout={true}
            />
          </div>
        </div>
      </section>

      {/* Key Features - same 12-col grid so left edges align with hero */}
      {/* Feature 1: Build your Navy */}
      <article
        className="md:col-span-6 border-2 border-cyan-400 bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h3
          className="text-xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-cyan)",
          }}
        >
          [BUILD YOUR NAVY]
        </h3>
        <p
          className="text-base mb-4 opacity-100"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-primary)",
          }}
        >
          Acquire ships through buying, selling, and trading on a global open
          market. Customize loadouts and traits, or recycle ships you no longer
          need. Think TCG economy with real ownership.
        </p>
        <ul
          className="text-sm space-y-1 opacity-100"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-primary)",
          }}
        >
          <li>• Global open market: buy, sell, trade</li>
          <li>• Customizable ships (equipment, traits)</li>
          <li>• Recycling mechanics</li>
        </ul>
      </article>

      {/* Feature 2: Assemble a Fleet */}
      <article
        className="md:col-span-6 border-2 border-phosphor-green bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h3
          className="text-xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-phosphor-green)",
          }}
        >
          [ASSEMBLE A FLEET]
        </h3>
        <p
          className="text-base mb-4 opacity-100"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-primary)",
          }}
        >
          Assemble your fleet around mission objectives and the strategy you
          want to run. Choose the composition that fits your plan.
        </p>
        <ul
          className="text-sm space-y-1 opacity-100"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-primary)",
          }}
        >
          <li>• Small fleet of well-armored tanks</li>
          <li>• Large fleet of cheap, expendable ships</li>
          <li>• Fast, hard-hitting strike force</li>
          <li>• Long-range sniper backline</li>
        </ul>
      </article>

      {/* Feature 3: Tactical Combat */}
      <article
        className="md:col-span-6 border-2 border-amber-400 bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h3
          className="text-xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-amber)",
          }}
        >
          [ENGAGE THE ENEMY]
        </h3>
        <p
          className="text-base mb-4 opacity-100"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-primary)",
          }}
        >
          Fight in turn-based strategic battles where positioning, range, and
          weapon selection determine the outcome. Plan your moves carefully.
        </p>
        <ul
          className="text-sm space-y-1 opacity-100"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-primary)",
          }}
        >
          <li>• Turn-based PvP battles</li>
          <li>• Strategic positioning system</li>
          <li>• Multiple weapon and defense types</li>
        </ul>
      </article>

      {/* Feature 4: Collect the Rewards */}
      <article
        className="md:col-span-6 border-2 border-warning-red bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h3
          className="text-xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-warning-red)",
          }}
        >
          [COLLECT THE REWARDS]
        </h3>
        <p
          className="text-base mb-4 opacity-100"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-primary)",
          }}
        >
          Level up your ships by destroying enemy ships in battle. For every
          enemy you kill, collect part of the salvage reward and make your fleet
          stronger over time.
        </p>
        <ul
          className="text-sm space-y-1 opacity-100"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-primary)",
          }}
        >
          <li>• Ships level up from destroying enemies</li>
          <li>• Salvage reward for each kill</li>
          <li>• Grow your fleet&apos;s power over time</li>
        </ul>
      </article>

      {/* Getting Started Section */}
      <section
        className="md:col-span-12 border-2 border-cyan-400 bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
        aria-labelledby="info-getting-started-heading"
      >
        <h2
          id="info-getting-started-heading"
          className="text-2xl font-bold mb-4 text-center"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-cyan)",
          }}
        >
          [GETTING STARTED]
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-2"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-cyan)",
              }}
            >
              01
            </div>
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              CONNECT WALLET
            </h3>
            <p
              className="text-base opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Connect your Flow wallet to access the game
            </p>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-2"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-amber)",
              }}
            >
              02
            </div>
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              CLAIM FREE SHIPS
            </h3>
            <p
              className="text-base opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Purchase or claim ships and customize a fleet to your strategy
            </p>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold mb-2"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-phosphor-green)",
              }}
            >
              03
            </div>
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              BATTLE
            </h3>
            <p
              className="text-base opacity-100"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              Join a lobby and engage in tactical combat against other players
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Info;
