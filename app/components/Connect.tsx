import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const Connect: React.FC = () => {
  return (
    <ConnectButton
      chainStatus="icon"
      showBalance={false}
      accountStatus={{
        smallScreen: "avatar",
        largeScreen: "full",
      }}
    />
  );
};

export default Connect;
