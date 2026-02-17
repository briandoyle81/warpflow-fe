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
  const [activeTab, setActiveTab] = useState("Info");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved tab after hydration
  useEffect(() => {
    setIsHydrated(true);
    const savedTab = localStorage.getItem("warpflow-active-tab");
    const savedGameId = localStorage.getItem("selectedGameId");

    const validTabs = [
      "Info",
      "Manage Navy",
      "Lobbies",
      "Games",
      "Profile",
      "Maps",
      "Customize Ship",
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

  // Listen for navigation events from Lobbies component
  useEffect(() => {
    const handleNavigateToGames = () => {
      setActiveTab("Games");
    };

    window.addEventListener("warpflow-navigate-to-games", handleNavigateToGames);
    document.addEventListener("warpflow-navigate-to-games", handleNavigateToGames);
    return () => {
      window.removeEventListener("warpflow-navigate-to-games", handleNavigateToGames);
      document.removeEventListener("warpflow-navigate-to-games", handleNavigateToGames);
    };
  }, []);

  // Listen for navigation events from Info (and elsewhere)
  useEffect(() => {
    const handleNavigateToLobbies = () => {
      setActiveTab("Lobbies");
    };

    window.addEventListener(
      "warpflow-navigate-to-lobbies",
      handleNavigateToLobbies,
    );
    return () => {
      window.removeEventListener(
        "warpflow-navigate-to-lobbies",
        handleNavigateToLobbies,
      );
    };
  }, []);

  // Listen for navigation to Manage Navy (fleet) tab
  useEffect(() => {
    const handleNavigateToManageNavy = () => {
      setActiveTab("Manage Navy");
    };

    window.addEventListener(
      "warpflow-navigate-to-manage-navy",
      handleNavigateToManageNavy,
    );
    return () => {
      window.removeEventListener(
        "warpflow-navigate-to-manage-navy",
        handleNavigateToManageNavy,
      );
    };
  }, []);

  // Save tab to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("warpflow-active-tab", activeTab);
    }
  }, [activeTab, isHydrated]);

  // Show loading state while wallet is connecting
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div
        className="grid grid-rows-[auto_1fr_20px] min-h-screen"
        style={{ backgroundColor: "var(--color-near-black)" }}
      >
        <Header />
        <main className="flex flex-col gap-8 row-start-2 pt-4 pb-20 px-8 sm:px-20 w-full max-w-7xl mx-auto">
          <div
            className="border border-solid p-8"
            style={{
              backgroundColor: "var(--color-slate)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
            }}
          >
            <div
              className="text-center uppercase"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                color: "var(--color-cyan)",
              }}
            >
              <div className="text-2xl mb-4 font-bold tracking-wider">WARPFLOW</div>
              <div className="text-lg">Connecting to wallet...</div>
            </div>
          </div>
        </main>
        <footer
          className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm tracking-wider uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
            color: "var(--color-text-muted)",
          }}
        >
          <span>WARPFLOW ALPHA</span>
        </footer>
      </div>
    );
  }
  return (
    <div
      className="grid grid-rows-[auto_1fr_20px] min-h-screen"
      style={{ backgroundColor: "var(--color-near-black)" }}
    >
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
                "Info",
                "Manage Navy",
                "Lobbies",
                "Games",
                "Profile",
                "Maps",
                "Customize Ship",
              ];
              if (isOwner) {
                tabs.push("Ship Attributes");
              }
              return tabs;
            })().map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-6 py-3 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: isActive
                      ? "var(--color-cyan)"
                      : "var(--color-gunmetal)",
                    color: isActive
                      ? "var(--color-cyan)"
                      : "var(--color-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--color-steel)"
                      : "var(--color-slate)",
                    borderTopColor: isActive
                      ? "var(--color-cyan)"
                      : "var(--color-steel)",
                    borderLeftColor: isActive
                      ? "var(--color-cyan)"
                      : "var(--color-steel)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "var(--color-cyan)";
                      e.currentTarget.style.color = "var(--color-cyan)";
                      e.currentTarget.style.backgroundColor = "var(--color-steel)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                      e.currentTarget.style.color = "var(--color-text-secondary)";
                      e.currentTarget.style.backgroundColor = "var(--color-slate)";
                    }
                  }}
                >
                  [{tab.toUpperCase()}]
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "Maps" ? (
            <div className="w-full">
              <div
                className="border border-solid p-1"
                style={{
                  backgroundColor: "var(--color-slate)",
                  borderColor: "var(--color-gunmetal)",
                  borderTopColor: "var(--color-steel)",
                  borderLeftColor: "var(--color-steel)",
                }}
              >
                <Maps />
              </div>
            </div>
          ) : activeTab === "Games" ? (
            <div className="w-full px-2 sm:px-4">
              <div
                className="border border-solid p-4"
                style={{
                  backgroundColor: "var(--color-slate)",
                  borderColor: "var(--color-gunmetal)",
                  borderTopColor: "var(--color-steel)",
                  borderLeftColor: "var(--color-steel)",
                }}
              >
                <Games />
              </div>
            </div>
          ) : (
            <div
              className="border border-solid p-8"
              style={{
                backgroundColor: "var(--color-slate)",
                borderColor: "var(--color-gunmetal)",
                borderTopColor: "var(--color-steel)",
                borderLeftColor: "var(--color-steel)",
              }}
            >
              {activeTab === "Manage Navy" && <ManageNavy />}
              {activeTab === "Lobbies" && <Lobbies />}
              {activeTab === "Profile" && <Profile />}
              {activeTab === "Info" && <Info />}
              {activeTab === "Ship Attributes" && <ShipAttributes />}
              {activeTab === "Customize Ship" && <ShipConstructor />}
            </div>
          )}
        </div>
      </main>
      <footer
        className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm tracking-wider uppercase"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          color: "var(--color-text-muted)",
        }}
      >
        <span>WARPFLOW ALPHA</span>
      </footer>
    </div>
  );
}
