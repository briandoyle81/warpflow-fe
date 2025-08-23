import React from "react";

const Lobbies: React.FC = () => {
  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [LOBBIES]
      </h3>
      <div className="space-y-4">
        <div className="border border-green-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-green-400">🎯 QUICK MATCH</h4>
          <p className="text-sm opacity-80">Join a random battle immediately</p>
        </div>
        <div className="border border-blue-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-blue-400">🏆 RANKED</h4>
          <p className="text-sm opacity-80">Competitive matches with ranking</p>
        </div>
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-purple-400">👥 CUSTOM</h4>
          <p className="text-sm opacity-80">Create or join private matches</p>
        </div>
      </div>
    </div>
  );
};

export default Lobbies;
