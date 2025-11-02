import React from "react";

const PayButton: React.FC = () => {
  const handlePay = () => {
    // TODO: Implement payment functionality
  };

  return (
    <button
      onClick={handlePay}
      className="border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 px-3 py-1.5 rounded-lg font-mono font-bold tracking-wider transition-all duration-200 shadow-lg shadow-green-400/20 hover:shadow-green-400/40 w-32 flex items-center justify-center text-xs h-8"
    >
      [PAY]
    </button>
  );
};

export default PayButton;
