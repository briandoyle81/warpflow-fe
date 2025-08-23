import React from "react";

const ManageFleet: React.FC = () => {
  return (
    <div className="text-cyan-300 font-mono">
      <h3 className="text-2xl font-bold mb-6 tracking-wider text-center">
        [MANAGE FLEET]
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border border-purple-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-purple-400 mb-2">🚀 CRUISER</h4>
          <p className="text-sm opacity-80">
            Heavy firepower, slow maneuverability
          </p>
        </div>
        <div className="border border-cyan-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-cyan-400 mb-2">⚡ FIGHTER</h4>
          <p className="text-sm opacity-80">Fast and agile, light armor</p>
        </div>
        <div className="border border-amber-400 bg-black/40 rounded-lg p-4">
          <h4 className="text-lg font-bold text-amber-400 mb-2">
            🛡️ DESTROYER
          </h4>
          <p className="text-sm opacity-80">Balanced offense and defense</p>
        </div>
      </div>
    </div>
  );
};

export default ManageFleet;
