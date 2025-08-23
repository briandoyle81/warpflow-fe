import React from "react";

const Games: React.FC = () => {
  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [GAMES]
      </h3>
      <div className="text-center">
        <p className="text-lg opacity-80 mb-6">No active games found</p>
        <button className="px-6 py-3 rounded-lg border-2 border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 font-mono font-bold tracking-wider transition-all duration-200">
          [FIND MATCH]
        </button>
      </div>
    </div>
  );
};

export default Games;
