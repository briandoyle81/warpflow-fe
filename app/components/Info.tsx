import React from "react";

const Info: React.FC = () => {
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
          <p className="text-sm opacity-80">
            Learn the basics of navy management and combat
          </p>
        </div>
        <div className="border border-blue-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-blue-400">🌐 WEBSITE</h4>
          <p className="text-sm opacity-80">
            Visit warpflow.com for more information
          </p>
        </div>
      </div>
    </div>
  );
};

export default Info;
