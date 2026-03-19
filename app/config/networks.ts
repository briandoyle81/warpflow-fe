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
  return isSupportedChainId(parsed) ? parsed : DEFAULT_CHAIN_ID;
}

export function setSelectedChainId(chainId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(chainId));
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

