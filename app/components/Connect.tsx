import React from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

const Connect: React.FC = () => {
  const { setShowAuthFlow } = useDynamicContext();

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      className="bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border border-cyan-300"
    >
      Connect Wallet
    </button>
  );
};

export default Connect;
