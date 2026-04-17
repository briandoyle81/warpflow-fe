import { switchChain } from "@wagmi/core";
import type { Config, Connector } from "@wagmi/core";
import { numberToHex } from "viem";
import { getChainById } from "../config/networks";
import {
  addEthereumChainViaWallet,
  buildAddEthereumChainParameter,
  isChainAlreadyInWalletError,
  isUserRejectedWalletError,
  messageHintsMissingChain,
  readRpcErrorCode,
  type Eip1193Requester,
} from "./ensureUiChainsInWallet";

/**
 * Switches the connected wallet to `chainId` using the same path everywhere:
 * wagmi `switchChain`, then on 4902 manual add + `wallet_switchEthereumChain`,
 * then poll `connector.getChainId()` until it matches (wagmi sometimes lags `chainChanged`).
 */
export async function switchWalletToAppChain(
  config: Config,
  connector: Connector,
  chainId: number,
): Promise<void> {
  const chain = getChainById(chainId);
  const addEthereumChainParameter = buildAddEthereumChainParameter(chain);

  try {
    await switchChain(config, {
      chainId,
      connector,
      addEthereumChainParameter,
    });
  } catch (err) {
    const code = readRpcErrorCode(err);
    const needsManual = code === 4902 || messageHintsMissingChain(err);
    if (!needsManual) throw err;

    const getProvider = connector.getProvider?.bind(connector);
    if (typeof getProvider !== "function") throw err;

    const provider = (await getProvider({
      chainId,
    })) as Eip1193Requester | null;
    if (!provider?.request) throw err;

    try {
      await addEthereumChainViaWallet(
        provider,
        chainId,
        addEthereumChainParameter,
      );
    } catch (addErr) {
      if (isUserRejectedWalletError(addErr)) throw addErr;
      if (!isChainAlreadyInWalletError(addErr)) throw addErr;
    }

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: numberToHex(chainId) }],
    });
  }

  let lastObservedChainId: number | null = null;
  for (let i = 0; i < 24; i++) {
    const current = await connector.getChainId();
    lastObservedChainId = current;
    if (current === chainId) return;
    await new Promise((r) => setTimeout(r, 75));
  }

  throw new Error(
    `Wallet did not switch to ${chain.name} (${numberToHex(chainId)}). Current wallet chain: ${
      lastObservedChainId == null ? "unknown" : numberToHex(lastObservedChainId)
    }`,
  );
}
