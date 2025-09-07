"use client";

import React from "react";

const Profile: React.FC = () => {
  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [PROFILE]
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-cyan-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-cyan-400 mb-2">
            📊 STATISTICS
          </h4>
          <p className="text-sm opacity-80">
            Wins: 0 | Losses: 0 | Win Rate: 0%
          </p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-purple-400 mb-2">
            🏅 ACHIEVEMENTS
          </h4>
          <p className="text-sm opacity-80">No achievements unlocked yet</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
