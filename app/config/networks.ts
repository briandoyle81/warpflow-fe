import { flowTestnet, saigon } from "viem/chains";

export const SUPPORTED_CHAINS = [flowTestnet, saigon] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const DEFAULT_CHAIN_ID: number = flowTestnet.id;

const STORAGE_KEY = "warpflow.selectedChainId";

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

