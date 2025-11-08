"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Header from "./components/Header";
import ManageNavy from "./components/ManageNavy";
import Lobbies from "./components/Lobbies";
import Games from "./components/Games";
import Profile from "./components/Profile";
import Info from "./components/Info";
import Maps from "./components/Maps";
import ShipAttributes from "./components/ShipAttributes";
import ShipConstructor from "./components/ShipConstructor";
import { useShipAttributesOwner } from "./hooks/useShipAttributesContract";

export default function Home() {
  const { status } = useAccount();
  const { isOwner } = useShipAttributesOwner();

  // Initialize with default tab to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState("Manage Navy");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved tab after hydration
  useEffect(() => {
    setIsHydrated(true);
    const savedTab = localStorage.getItem("warpflow-active-tab");
    const savedGameId = localStorage.getItem("selectedGameId");

    const validTabs = [
      "Manage Navy",
      "Lobbies",
      "Games",
      "Profile",
      "Info",
      "Maps",
      "Ship Constructor",
    ];
    if (isOwner) {
      validTabs.push("Ship Attributes");
    }

    // If there's a saved game, prioritize switching to Games tab
    if (savedGameId) {
      setActiveTab("Games");
    } else if (savedTab && validTabs.includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, [isOwner]);

  // Save tab to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("warpflow-active-tab", activeTab);
    }
  }, [activeTab, isHydrated]);

  // Show loading state while wallet is connecting
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="font-sans grid grid-rows-[auto_1fr_20px] min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Header />
        <main className="flex flex-col gap-8 row-start-2 pt-4 pb-20 px-8 sm:px-20 w-full max-w-7xl mx-auto">
          <div className="bg-black/40 border border-cyan-400 rounded-lg p-8 shadow-lg shadow-cyan-400/20">
            <div className="text-center text-cyan-400 font-mono">
              <div className="text-2xl mb-4">⚡ WARPFLOW ⚡</div>
              <div className="text-lg">Connecting to wallet...</div>
            </div>
          </div>
        </main>
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-cyan-400/60 font-mono text-sm tracking-wider">
          <span>⚡ WARPFLOW ALPHA ⚡</span>
        </footer>
      </div>
    );
  }
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_20px] min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main
        className={`flex flex-col gap-8 row-start-2 pt-4 pb-20 w-full ${
          activeTab === "Games" ? "px-0" : "px-8 sm:px-20"
        }`}
      >
        {/* Game Tabs */}
        <div
          className={`w-full ${
            activeTab === "Maps" || activeTab === "Games"
              ? ""
              : "max-w-7xl mx-auto"
          }`}
        >
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {(() => {
              const tabs = [
                "Manage Navy",
                "Lobbies",
                "Games",
                "Profile",
                "Info",
                "Maps",
                "Ship Constructor",
              ];
              if (isOwner) {
                tabs.push("Ship Attributes");
              }
              return tabs;
            })().map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg border-2 font-mono font-bold tracking-wider transition-all duration-200 shadow-lg ${
                  activeTab === tab
                    ? "border-cyan-300 text-cyan-300 bg-cyan-400/20 shadow-cyan-400/40"
                    : "border-cyan-400 text-cyan-400 hover:border-cyan-300 hover:text-cyan-300 hover:bg-cyan-400/10 shadow-cyan-400/20 hover:shadow-cyan-400/40"
                }`}
              >
                [{tab.toUpperCase()}]
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "Maps" ? (
            <div className="w-full">
              <div className="bg-black/40 border border-cyan-400 rounded-lg p-1 shadow-lg shadow-cyan-400/20">
                <Maps />
              </div>
            </div>
          ) : activeTab === "Games" ? (
            <div className="w-full px-2 sm:px-4">
              <div className="bg-black/40 border border-cyan-400 rounded-lg p-4 shadow-lg shadow-cyan-400/20">
                <Games />
              </div>
            </div>
          ) : (
            <div className="bg-black/40 border border-cyan-400 rounded-lg p-8 shadow-lg shadow-cyan-400/20">
              {activeTab === "Manage Navy" && <ManageNavy />}
              {activeTab === "Lobbies" && <Lobbies />}
              {activeTab === "Profile" && <Profile />}
              {activeTab === "Info" && <Info />}
              {activeTab === "Ship Attributes" && <ShipAttributes />}
              {activeTab === "Ship Constructor" && <ShipConstructor />}
            </div>
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-cyan-400/60 font-mono text-sm tracking-wider">
        <span>⚡ WARPFLOW ALPHA ⚡</span>
      </footer>
    </div>
  );
}
