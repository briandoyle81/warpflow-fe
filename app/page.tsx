"use client";

import { useState, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { useAccount } from "wagmi";
import Header from "./components/Header";
import AlphaDiscordNoticeBar from "./components/AlphaDiscordNoticeBar";
import FlowWalletNoticeBar from "./components/FlowWalletNoticeBar";
import SiteFooter from "./components/SiteFooter";
import ManageNavy from "./components/ManageNavy";
import Lobbies from "./components/Lobbies";
import Games from "./components/Games";
import Profile from "./components/Profile";
import Info from "./components/Info";
import Maps from "./components/Maps";
import ShipAttributes from "./components/ShipAttributes";
import ShipConstructor from "./components/ShipConstructor";
import ShipPurchasePrices from "./components/ShipPurchasePrices";
import { useShipAttributesOwner } from "./hooks/useShipAttributesContract";
import { useShipPurchasePricesAccess } from "./hooks/useShipPurchasePricesAccess";
import { TUTORIAL_STEP_STORAGE_KEY } from "./types/onboarding";
import posthog from "posthog-js";

/** Tabs we may persist; includes owner-only names so refresh works before contract reads resolve. */
const KNOWN_TAB_NAMES = new Set<string>([
  "Info",
  "Manage Navy",
  "Lobbies",
  "Games",
  "Profile",
  "Maps",
  "Customize Ship",
  "Ship Attributes",
  "Purchase Prices",
]);

export default function Home() {
  const { status } = useAccount();
  const { isOwner } = useShipAttributesOwner();
  const { canAdminShipPurchasePrices } = useShipPurchasePricesAccess();

  // Initialize with default tab to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState("Info");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInfoTutorialActive, setIsInfoTutorialActive] = useState(false);
  const [isGamesDetailActive, setIsGamesDetailActive] = useState(false);

  // Register tutorial chrome listener before paint so Info's layout effect can use it.
  useLayoutEffect(() => {
    const handleInfoTutorialActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsInfoTutorialActive(Boolean(custom.detail?.active));
    };

    window.addEventListener(
      "void-tactics-info-tutorial-active",
      handleInfoTutorialActive as EventListener,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-info-tutorial-active",
        handleInfoTutorialActive as EventListener,
      );
    };
  }, []);

  // Restore tab from localStorage once on mount. Owner tabs are not gated on
  // isOwner / canAdminShipPurchasePrices (those are false until reads finish).
  useLayoutEffect(() => {
    setIsHydrated(true);
    const savedTab = localStorage.getItem("void-tactics-active-tab");
    const savedGameId = localStorage.getItem("selectedGameId");
    const forceGamesTab =
      localStorage.getItem("void-tactics-force-games-tab") === "true";

    let nextTab = "Info";
    if (forceGamesTab) {
      nextTab = "Games";
      localStorage.removeItem("void-tactics-force-games-tab");
    } else if (savedGameId) {
      nextTab = "Games";
    } else if (savedTab && KNOWN_TAB_NAMES.has(savedTab)) {
      nextTab = savedTab;
    }

    setActiveTab(nextTab);

    const tutorialInProgress =
      localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY) !== null;
    setIsInfoTutorialActive(tutorialInProgress && nextTab === "Info");
  }, []);

  // Leaving Info must drop tutorial chrome (tabs are hidden while it is on).
  useLayoutEffect(() => {
    if (activeTab !== "Info") {
      setIsInfoTutorialActive(false);
    }
  }, [activeTab]);

  // Listen for navigation events from Lobbies component
  useEffect(() => {
    const handleNavigateToGames = () => {
      setActiveTab("Games");
    };

    window.addEventListener(
      "void-tactics-navigate-to-games",
      handleNavigateToGames,
    );
    document.addEventListener(
      "void-tactics-navigate-to-games",
      handleNavigateToGames,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-games",
        handleNavigateToGames,
      );
      document.removeEventListener(
        "void-tactics-navigate-to-games",
        handleNavigateToGames,
      );
    };
  }, []);

  // Listen for Games tab detail view activation so we can hide global chrome.
  useEffect(() => {
    const handleGamesDetailActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsGamesDetailActive(Boolean(custom.detail?.active));
    };

    window.addEventListener(
      "void-tactics-games-detail-active",
      handleGamesDetailActive as EventListener,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-games-detail-active",
        handleGamesDetailActive as EventListener,
      );
    };
  }, []);

  // Listen for navigation events from Info (and elsewhere)
  useEffect(() => {
    const handleNavigateToLobbies = () => {
      setActiveTab("Lobbies");
    };

    window.addEventListener(
      "void-tactics-navigate-to-lobbies",
      handleNavigateToLobbies,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-lobbies",
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
      "void-tactics-navigate-to-manage-navy",
      handleNavigateToManageNavy,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-manage-navy",
        handleNavigateToManageNavy,
      );
    };
  }, []);

  // Save tab to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("void-tactics-active-tab", activeTab);
    }
  }, [activeTab, isHydrated]);

  /** Hide site header (0px row) during Info onboarding tutorial or Games detail; not tied to wallet state. */
  const hideGlobalChrome = isInfoTutorialActive || isGamesDetailActive;

  const topChromeRowStyle: CSSProperties = hideGlobalChrome
    ? {
        height: "0px",
        minHeight: 0,
        maxHeight: "0px",
        overflow: "hidden",
        pointerEvents: "none",
      }
    : {};

  // Show loading state while wallet is connecting
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "var(--color-near-black)" }}
      >
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <FlowWalletNoticeBar suppressed={hideGlobalChrome} />
        </div>
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <AlphaDiscordNoticeBar suppressed={hideGlobalChrome} />
        </div>
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <Header />
        </div>
        <main
          className={`flex min-h-0 flex-1 flex-col gap-8 px-8 pb-20 sm:px-20 w-full max-w-7xl mx-auto ${
            hideGlobalChrome ? "pt-0" : "pt-4"
          }`}
        >
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
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                color: "var(--color-cyan)",
              }}
            >
              <div className="text-2xl mb-4 font-bold tracking-wider">
                VOID TACTICS
              </div>
              <div className="text-lg">Connecting to wallet...</div>
            </div>
          </div>
        </main>
        <div className="shrink-0">
          <SiteFooter />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--color-near-black)" }}
    >
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <FlowWalletNoticeBar suppressed={hideGlobalChrome} />
      </div>
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <AlphaDiscordNoticeBar suppressed={hideGlobalChrome} />
      </div>
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <Header />
      </div>
      <main
        className={`flex min-h-0 flex-1 flex-col gap-8 pb-20 w-full ${
          hideGlobalChrome ? "pt-0" : "pt-4"
        } ${
          activeTab === "Games" || isInfoTutorialActive ? "px-0" : "px-8 sm:px-20"
        }`}
      >
        {/* Game Tabs */}
        <div
          className={`w-full ${
            activeTab === "Maps" ||
            activeTab === "Games" ||
            isInfoTutorialActive
              ? ""
              : "max-w-7xl mx-auto"
          }`}
        >
          {status === "connected" && !hideGlobalChrome && (
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
                if (isOwner || activeTab === "Ship Attributes") {
                  tabs.push("Ship Attributes");
                }
                if (
                  canAdminShipPurchasePrices ||
                  activeTab === "Purchase Prices"
                ) {
                  tabs.push("Purchase Prices");
                }
                return tabs;
              })().map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); posthog.capture("tab_navigated", { tab_name: tab }); }}
                    className="px-6 py-3 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
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
                        e.currentTarget.style.backgroundColor =
                          "var(--color-steel)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor =
                          "var(--color-gunmetal)";
                        e.currentTarget.style.color =
                          "var(--color-text-secondary)";
                        e.currentTarget.style.backgroundColor =
                          "var(--color-slate)";
                      }
                    }}
                  >
                    [{tab.toUpperCase()}]
                  </button>
                );
              })}
            </div>
          )}

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
              {activeTab === "Purchase Prices" && <ShipPurchasePrices />}
              {activeTab === "Customize Ship" && <ShipConstructor />}
            </div>
          )}
        </div>
      </main>
      <div className="shrink-0">
        <SiteFooter />
      </div>
    </div>
  );
}
