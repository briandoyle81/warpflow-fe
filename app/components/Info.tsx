"use client";

import React, { useState } from "react";
import { OnboardingTutorial } from "./OnboardingTutorial";

const Info: React.FC = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  if (showTutorial) {
    return (
      <OnboardingTutorial
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
      />
    );
  }

  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [INFO]
      </h3>
      <div className="space-y-4">
        <div className="border border-amber-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-amber-400">🎮 HOW TO PLAY</h4>
          <p className="text-sm opacity-80">
            Strategic spaceship combat in real-time PvP battles
          </p>
        </div>
        <div className="border border-green-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-green-400">📖 TUTORIAL</h4>
          <p className="text-sm opacity-80 mb-3">
            Learn the basics of navy management and combat
          </p>
          <button
            onClick={() => setShowTutorial(true)}
            className="px-4 py-2 bg-green-600 text-white rounded font-mono hover:bg-green-700 transition-colors"
          >
            Start Tutorial
          </button>
        </div>
        <div className="border border-blue-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-blue-400">🌐 WEBSITE</h4>
          <p className="text-sm opacity-80">
            Visit warpflow.com for more information
          </p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-purple-400">
            🎵 AUDIO CREDITS
          </h4>
          <div className="text-sm opacity-80 space-y-3">
            <p>
              <span className="text-purple-300 font-semibold">
                UI Sound Effect:
              </span>
            </p>
            <p className="ml-4">
              &ldquo;UI_6 Tonal beep.Aliens.Proximity
              alert(63osc,chrs,cmpr).wav&rdquo;
            </p>
            <p className="ml-4">
              <span className="text-gray-400">by</span>
            </p>
            <p className="ml-4">
              <span className="text-gray-400">Source:</span>{" "}
              <a
                href="https://freesound.org/s/563864/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline"
              >
                freesound.org/s/563864/
              </a>
            </p>
            <p className="ml-4">
              <span className="text-gray-400">License:</span> Attribution 4.0
            </p>
            <div className="mt-4 pt-3 border-t border-purple-500/30">
              <p>
                <span className="text-purple-300 font-semibold">
                  Background Music:
                </span>
              </p>
              <p className="ml-4">
                &ldquo;synthwave-80s-robot-swarm-218092.mp3&rdquo;
              </p>
              <p className="ml-4 text-gray-400">
                Additional credits to be added
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;
