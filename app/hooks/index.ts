// Contract hooks
export {
  useShipsContract,
  useShipsRead,
  useShipsWrite,
} from "./useShipsContract";
export {
  useLobbiesContract,
  useLobbiesRead,
  useLobbiesWrite,
  useLobby,
  usePlayerLobbyState,
  useLobbyCount,
  useLobbySettings,
  useIsLobbyOpenForJoining,
} from "./useLobbiesContract";
export { useLobbies } from "./useLobbies";
export { useLobbyList } from "./useLobbyList";
export { useOwnedShips } from "./useOwnedShips";
export { useShipActions } from "./useShipActions";
export { useShipDetails } from "./useShipDetails";

// Phase 3: Real-time & Performance hooks
export { useContractEvents } from "./useContractEvents";
export { useNavyAnalytics } from "./useNavyAnalytics";
export { useNavyOptimization } from "./useNavyOptimization";

// Phase 4: Ship Purchasing with FLOW
export { useShipPurchasing } from "./useShipPurchasing";
export { useFreeShipClaiming } from "./useFreeShipClaiming";

// Ship Image Caching
export {
  useShipImageCache,
  clearShipImageCache,
  clearShipImageCacheForShip,
  clearBrokenImageCache,
  clearAllShipImageCache,
  resetShipRequestState,
  resetAllShipRequestStates,
  clearShipRetryTimeout,
  clearAllShipRetryTimeouts,
  restartQueueProcessing,
  getQueueStatus,
  clearCacheOnLogout,
  getShipImageCacheStats,
  getUseLocalRendering,
  setUseLocalRendering,
} from "./useShipImageCache";

// Types
export type { ShipsReadFunction, ShipsWriteFunction } from "./useShipsContract";
export type {
  NavyComposition,
  NavyPerformance,
  OptimizationSuggestion,
} from "./useNavyAnalytics";
export type { VirtualScrollConfig } from "./useNavyOptimization";
