"use client";

import React, { useState } from "react";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { useAccount } from "wagmi";
import { HeroShipShowcase } from "./HeroShipShowcase";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { FreeShipClaimButton } from "./FreeShipClaimButton";

const TUTORIAL_STEP_STORAGE_KEY = "warpflow-tutorial-step-index";

const Info: React.FC = () => {
  const { isConnected } = useAccount();
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

  if (showTutorial) {
    return (
      <OnboardingTutorial
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />
    );
  }

  const handlePlayNow = () => {
    setShowTutorial(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-8">
      {/* Hero Section - full width so its inner grid aligns with key features below */}
      <div
        className="md:col-span-12 border-2 border-cyan-400 bg-black/60 py-8 relative overflow-hidden"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
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
              className="text-5xl md:text-6xl font-bold mb-4 tracking-wider"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-cyan)",
                textShadow: "0 0 20px rgba(86, 214, 255, 0.5)",
              }}
            >
              WARPFLOW
            </h1>
            <p
              className="text-xl md:text-2xl mb-3 opacity-90"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-text-primary)",
              }}
            >
              STRATEGIC PvP STARSHIP COMMAND
            </p>
            <p
              className="text-lg mb-4 opacity-80"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-secondary)",
              }}
            >
              Admiral, your fleet is dropping out of warp under fire.
            </p>
            <p
              className="text-base mb-6 opacity-80"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-secondary)",
              }}
            >
              Deploy your ships. Outmaneuver real opponents with positioning,
              range control, and ruthless target priority.
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
                            new CustomEvent("warpflow-navigate-to-manage-navy"),
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
              <img
                src="/img/missile-clip.gif"
                alt="Missiles firing at target ships with damage numbers and health bars"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ship demo display (kept, moved below hero) */}
      <div
        className="md:col-span-12 border-2 border-phosphor-green bg-black/40 p-6"
        style={{
          borderRadius: 0,
        }}
      >
        <h3
          className="text-xl font-bold mb-3 tracking-wider text-center md:text-left"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-phosphor-green)",
          }}
        >
          [SHIPINTEL]
        </h3>
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
      </div>

      {/* Key Features - same 12-col grid so left edges align with hero */}
      {/* Feature 1: Build your Navy */}
      <div
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
          className="text-base mb-4 opacity-80"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-secondary)",
          }}
        >
          Acquire ships through buying, selling, and trading on a global open
          market. Customize loadouts and traits, or recycle ships you no longer
          need. Think TCG economy with real ownership.
        </p>
        <ul
          className="text-sm space-y-1 opacity-90"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-secondary)",
          }}
        >
          <li>• Global open market: buy, sell, trade</li>
          <li>• Customizable ships (equipment, traits)</li>
          <li>• Recycling mechanics</li>
        </ul>
      </div>

      {/* Feature 2: Assemble a Fleet */}
      <div
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
          className="text-base mb-4 opacity-80"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-secondary)",
          }}
        >
          Assemble your fleet around mission objectives and the strategy you
          want to run. Choose the composition that fits your plan.
        </p>
        <ul
          className="text-sm space-y-1 opacity-90"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-secondary)",
          }}
        >
          <li>• Small fleet of well-armored tanks</li>
          <li>• Large fleet of cheap, expendable ships</li>
          <li>• Fast, hard-hitting strike force</li>
          <li>• Long-range sniper backline</li>
        </ul>
      </div>

      {/* Feature 3: Tactical Combat */}
      <div
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
          className="text-base mb-4 opacity-80"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-secondary)",
          }}
        >
          Fight in turn-based strategic battles where positioning, range, and
          weapon selection determine the outcome. Plan your moves carefully.
        </p>
        <ul
          className="text-sm space-y-1 opacity-90"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-secondary)",
          }}
        >
          <li>• Turn-based PvP battles</li>
          <li>• Strategic positioning system</li>
          <li>• Multiple weapon and defense types</li>
        </ul>
      </div>

      {/* Feature 4: Collect the Rewards */}
      <div
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
          className="text-base mb-4 opacity-80"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-secondary)",
          }}
        >
          Level up your ships by destroying enemy ships in battle. For every
          enemy you kill, collect part of the salvage reward and make your fleet
          stronger over time.
        </p>
        <ul
          className="text-sm space-y-1 opacity-90"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-secondary)",
          }}
        >
          <li>• Ships level up from destroying enemies</li>
          <li>• Salvage reward for each kill</li>
          <li>• Grow your fleet&apos;s power over time</li>
        </ul>
      </div>

      {/* Getting Started Section */}
      <div
        className="md:col-span-12 border-2 border-cyan-400 bg-black/40 p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h2
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
              className="text-base opacity-70"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-secondary)",
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
              className="text-base opacity-70"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-secondary)",
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
              className="text-base opacity-70"
              style={{
                fontFamily: "var(--font-rajdhani), sans-serif",
                color: "var(--color-text-secondary)",
              }}
            >
              Join a lobby and engage in tactical combat against other players
            </p>
          </div>
        </div>
      </div>

      {/* Audio Credits - Keep at bottom */}
      <div
        className="md:col-span-12 border border-purple-400/50 bg-black/30 p-4"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <h4
          className="text-sm font-bold mb-3"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            color: "var(--color-amber)",
          }}
        >
          [AUDIO CREDITS]
        </h4>
        <div
          className="text-sm space-y-2 opacity-70"
          style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            color: "var(--color-text-muted)",
          }}
        >
          <div>
            <p className="font-semibold text-purple-300 mb-1">
              UI Sound Effect:
            </p>
            <p className="ml-4">
              &ldquo;UI_6 Tonal beep.Aliens.Proximity
              alert(63osc,chrs,cmpr).wav&rdquo;
            </p>
            <p className="ml-4">
              <span className="opacity-60">Source:</span>{" "}
              <a
                href="https://freesound.org/s/563864/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                freesound.org/s/563864/
              </a>
            </p>
            <p className="ml-4">
              <span className="opacity-60">License:</span> Attribution 4.0
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-500/20">
            <p className="font-semibold text-purple-300 mb-1">
              Background Music:
            </p>
            <p className="ml-4">
              &ldquo;synthwave-80s-robot-swarm-218092.mp3&rdquo;
            </p>
            <p className="ml-4 opacity-60">Additional credits to be added</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;
