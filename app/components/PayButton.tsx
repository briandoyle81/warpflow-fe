import React from "react";

interface PayButtonProps {
  className?: string;
}

const PayButton: React.FC<PayButtonProps> = ({ className = "w-32 h-8" }) => {
  const handlePay = () => {
    // TODO: Implement payment functionality
  };

  return (
    <button
      onClick={handlePay}
      className={`${className} border-2 border-green-400 text-green-400 hover:border-green-300 hover:text-green-300 hover:bg-green-400/10 px-3 py-1.5 font-mono font-bold tracking-wider transition-all duration-200 shadow-lg shadow-green-400/20 hover:shadow-green-400/40 flex items-center justify-center text-xs`}
      style={{
        borderRadius: 0, // Square corners for industrial theme
      }}
    >
      [BUY FLOW]
    </button>
  );
};

export default PayButton;
