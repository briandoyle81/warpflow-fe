"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_CHAIN_ID,
  getSelectedChainId,
  SELECTED_CHAIN_ID_STORAGE_KEY,
  VOID_TACTICS_CHAIN_CHANGED_EVENT,
} from "../config/networks";

function subscribeSelectedChainId(onStoreChange: () => void) {
  const onCustom = () => onStoreChange();
  const onStorage = (e: StorageEvent) => {
    if (
      e.storageArea === window.localStorage &&
      e.key === SELECTED_CHAIN_ID_STORAGE_KEY
    ) {
      onStoreChange();
    }
  };
  window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** Subscribes to the in-app network picker (localStorage + same-tab chain change events). */
export function useSelectedChainId(): number {
  return useSyncExternalStore(
    subscribeSelectedChainId,
    getSelectedChainId,
    () => DEFAULT_CHAIN_ID,
  );
}
