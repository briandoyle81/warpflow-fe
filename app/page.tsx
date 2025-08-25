"use client";

import { useState } from "react";
import Header from "./components/Header";
import ManageFleet from "./components/ManageFleet";

import Lobbies from "./components/Lobbies";
import Games from "./components/Games";
import Profile from "./components/Profile";
import Info from "./components/Info";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Manage Fleet");
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_20px] min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="flex flex-col gap-8 row-start-2 pt-4 pb-20 px-8 sm:px-20 w-full max-w-7xl mx-auto">
        {/* Game Tabs */}
        <div className="w-full">
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {["Manage Fleet", "Lobbies", "Games", "Profile", "Info"].map(
              (tab) => (
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
              )
            )}
          </div>

          {/* Tab Content */}
          <div className="bg-black/40 border border-cyan-400 rounded-lg p-8 shadow-lg shadow-cyan-400/20">
            {activeTab === "Manage Fleet" && <ManageFleet />}
            {activeTab === "Lobbies" && <Lobbies />}
            {activeTab === "Games" && <Games />}
            {activeTab === "Profile" && <Profile />}
            {activeTab === "Info" && <Info />}
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-cyan-400/60 font-mono text-sm tracking-wider">
        <span>⚡ WARPFLOW ALPHA ⚡</span>
      </footer>
    </div>
  );
}
