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
      className={`${className} border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 px-3 py-1.5 font-mono font-bold tracking-wider transition-all duration-200 flex items-center justify-center text-xs`}
      style={{
        borderRadius: 0, // Square corners for industrial theme
      }}
    >
      [BUY FLOW]
    </button>
  );
};

export default PayButton;
