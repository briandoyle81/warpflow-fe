/**
 * Manage Navy tutorial series (per chain + wallet): claim, construct delivery, buy ships.
 */
const FREE_SHIP_CLAIM_CLICKED_KEY = "void-tactics-free-ship-claim-clicked";

const DRONE_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-drone-tutorial-dismiss-session";

/** Never show the drone factory claim tutorial again for this wallet on this chain. */
const DRONE_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-drone-tutorial-dismiss-forever-v1";

/** After claiming, prompt construct: completed when user runs construct all / construct batch. */
/** v2: v1 could be set too early while navy was still loading (unconstructed read as 0). */
const CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-done-v2";

const CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-dismiss-session";

const CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-dismiss-forever-v1";

function storageKey(chainId: number, walletAddress: string): string {
  return `${chainId}:${walletAddress.toLowerCase()}`;
}

export function hasEverClickedFreeShipClaim(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(FREE_SHIP_CLAIM_CLICKED_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistFreeShipClaimClicked(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FREE_SHIP_CLAIM_CLICKED_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(FREE_SHIP_CLAIM_CLICKED_KEY, JSON.stringify(parsed));
  } catch {
    // Quota or disabled storage
  }
}

/** Hide the tutorial until the browser session ends (does not count as a claim click). */
export function isDroneFactoryTutorialSessionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY) === "1";
}

export function dismissDroneFactoryTutorialForSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY, "1");
}

export function isDroneFactoryTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DRONE_TUTORIAL_DISMISS_FOREVER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistDroneFactoryTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRONE_TUTORIAL_DISMISS_FOREVER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(
      DRONE_TUTORIAL_DISMISS_FOREVER_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}

export function hasCompletedConstructDeliveryTutorial(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistConstructDeliveryTutorialCompleted(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(
      CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}

export function isConstructDeliveryTutorialSessionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return (
    sessionStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY) ===
    "1"
  );
}

export function dismissConstructDeliveryTutorialForSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY, "1");
}

export function isConstructDeliveryTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistConstructDeliveryTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(
      CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}

const BUY_SHIPS_TUTORIAL_DONE_KEY =
  "void-tactics-manage-navy-buy-ships-tutorial-done-v1";

const BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-buy-ships-tutorial-dismiss-session";

const BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-buy-ships-tutorial-dismiss-forever-v1";

export function hasCompletedBuyShipsTutorial(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(BUY_SHIPS_TUTORIAL_DONE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistBuyShipsTutorialCompleted(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(BUY_SHIPS_TUTORIAL_DONE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(BUY_SHIPS_TUTORIAL_DONE_KEY, JSON.stringify(parsed));
  } catch {
    // Quota or disabled storage
  }
}

export function isBuyShipsTutorialSessionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY) === "1";
}

export function dismissBuyShipsTutorialForSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY, "1");
}

export function isBuyShipsTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[storageKey(chainId, walletAddress)] === true;
  } catch {
    return false;
  }
}

export function persistBuyShipsTutorialPermanentlyDismissed(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[storageKey(chainId, walletAddress)] = true;
    localStorage.setItem(
      BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}

function removeScopedBooleanKey(
  storageKeyName: string,
  walletAddress: string,
  chainId: number,
): void {
  const raw = localStorage.getItem(storageKeyName);
  if (!raw) return;
  const parsed = JSON.parse(raw) as Record<string, boolean>;
  delete parsed[storageKey(chainId, walletAddress)];
  if (Object.keys(parsed).length === 0) {
    localStorage.removeItem(storageKeyName);
    return;
  }
  localStorage.setItem(storageKeyName, JSON.stringify(parsed));
}

/** Debug utility: clear all Manage Navy tutorial progress for a wallet/chain. */
export function clearManageNavyTutorialCache(
  walletAddress: string,
  chainId: number,
): void {
  if (typeof window === "undefined") return;
  try {
    removeScopedBooleanKey(FREE_SHIP_CLAIM_CLICKED_KEY, walletAddress, chainId);
    removeScopedBooleanKey(
      CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY,
      walletAddress,
      chainId,
    );
    removeScopedBooleanKey(BUY_SHIPS_TUTORIAL_DONE_KEY, walletAddress, chainId);
    removeScopedBooleanKey(
      DRONE_TUTORIAL_DISMISS_FOREVER_KEY,
      walletAddress,
      chainId,
    );
    removeScopedBooleanKey(
      CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY,
      walletAddress,
      chainId,
    );
    removeScopedBooleanKey(
      BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY,
      walletAddress,
      chainId,
    );
  } catch {
    // Ignore storage parse failures and still clear session dismiss flags.
  }

  sessionStorage.removeItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY);
  sessionStorage.removeItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY);
  sessionStorage.removeItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY);
}
