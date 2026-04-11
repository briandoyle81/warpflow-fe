import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import type { Chain } from "viem";

// Custom chain definition (not included in `viem/chains`)
// Source: https://xai-foundation.gitbook.io/xai-network/kn/build-on-xai/xai-chains-and-parameters/connect-to-xai-testnet-sepolia
export const xaiTestnet = {
  id: 37714555429,
  name: "Xai Testnet v2",
  nativeCurrency: { name: "Xai", symbol: "sXAI", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-v2.xai-chain.net/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Xai Testnet Explorer",
      url: "https://testnet-explorer-v2.xai-chain.net",
    },
  },
  testnet: true,
} as const satisfies Chain;

export const SUPPORTED_CHAINS = [flowTestnet, saigon, baseSepolia, xaiTestnet] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const DEFAULT_CHAIN_ID: number = flowTestnet.id;

/** Chains the in-app network picker may select (must match wallet / wagmi). */
const CHAIN_IDS_SELECTABLE_IN_UI = new Set<number>([
  flowTestnet.id,
  baseSepolia.id,
]);

export function isChainSelectableInUi(chainId: number): boolean {
  return CHAIN_IDS_SELECTABLE_IN_UI.has(chainId);
}

const STORAGE_KEY = "void-tactics.selectedChainId";

export function isSupportedChainId(chainId: number | undefined | null): boolean {
  if (chainId == null) return false;
  return SUPPORTED_CHAINS.some((c) => c.id === chainId);
}

export function getSelectedChainId(): number {
  if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_CHAIN_ID;
  if (!isSupportedChainId(parsed)) return DEFAULT_CHAIN_ID;
  if (!isChainSelectableInUi(parsed)) return DEFAULT_CHAIN_ID;
  return parsed;
}

export function setSelectedChainId(chainId: number) {
  if (typeof window === "undefined") return;
  const next = isChainSelectableInUi(chainId) ? chainId : DEFAULT_CHAIN_ID;
  window.localStorage.setItem(STORAGE_KEY, String(next));
}

export function getChainById(chainId: number | undefined | null): SupportedChain {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  return (
    (SUPPORTED_CHAINS.find((c) => c.id === id) as SupportedChain | undefined) ??
    flowTestnet
  );
}

export function getNativeTokenSymbol(chainId: number | undefined | null): string {
  const chain = getChainById(chainId);
  // Ronin Saigon should display RON
  if (chain.id === saigon.id) return "RON";
  return (chain.nativeCurrency?.symbol ?? "FLOW").toUpperCase();
}

// Contract-side art/game variant to use per supported chain.
// NOTE: These values must match the backend contract deployment expectations.
const CHAIN_VARIANT_BY_CHAIN_ID: Record<number, number> = {
  [flowTestnet.id]: 1,
  // Current deployments across supported chains are configured with maxVariant=1.
  [saigon.id]: 1,
  [baseSepolia.id]: 1,
  [xaiTestnet.id]: 1,
};

export function getVariantForChainId(chainId: number | undefined | null): number {
  if (chainId == null) return CHAIN_VARIANT_BY_CHAIN_ID[DEFAULT_CHAIN_ID] ?? 1;
  return CHAIN_VARIANT_BY_CHAIN_ID[chainId] ?? (CHAIN_VARIANT_BY_CHAIN_ID[DEFAULT_CHAIN_ID] ?? 1);
}

