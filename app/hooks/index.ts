// Contract hooks
export {
  useShipsContract,
  useShipsRead,
  useShipsWrite,
} from "./useShipsContract";
export { useOwnedShips } from "./useOwnedShips";
export { useShipActions } from "./useShipActions";
export { useShipDetails } from "./useShipDetails";

// Phase 3: Real-time & Performance hooks
export { useContractEvents } from "./useContractEvents";
export { useFleetAnalytics } from "./useFleetAnalytics";
export { useFleetOptimization } from "./useFleetOptimization";

// Phase 4: Ship Purchasing with FLOW
export { useShipPurchasing } from "./useShipPurchasing";
export { useFreeShipClaiming } from "./useFreeShipClaiming";

// Types
export type { ShipsReadFunction, ShipsWriteFunction } from "./useShipsContract";
export type {
  FleetComposition,
  FleetPerformance,
  OptimizationSuggestion,
} from "./useFleetAnalytics";
export type { VirtualScrollConfig } from "./useFleetOptimization";
