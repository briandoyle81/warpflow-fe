import ShipsContract from "../contracts/DeployModule#Ships.json";
import LobbiesContract from "../contracts/DeployModule#Lobbies.json";
import FleetsContract from "../contracts/DeployModule#Fleets.json";
import GameContract from "../contracts/DeployModule#Game.json";
import UniversalCreditsContract from "../contracts/DeployModule#UniversalCredits.json";
import MapsContract from "../contracts/DeployModule#Maps.json";
import ShipAttributesContract from "../contracts/DeployModule#ShipAttributes.json";
import DroneYardContract from "../contracts/DeployModule#DroneYard.json";
import { flowTestnet } from "viem/chains";
import flowTestnetDeployedAddresses from "../contracts/flow-testnet/deployed_addresses.json";

type DeployedAddresses = Record<string, `0x${string}`>;

const FLOW_TESTNET_DEPLOYED_ADDRESSES =
  flowTestnetDeployedAddresses as unknown as DeployedAddresses;

// Per-network deployed address registries
export const DEPLOYED_ADDRESSES_BY_CHAIN_ID = {
  [flowTestnet.id]: FLOW_TESTNET_DEPLOYED_ADDRESSES,
} as const;

// Stable, per-network contract address sets
const FLOW_TESTNET_CONTRACT_ADDRESSES = {
  SHIPS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Ships"],
  FLEETS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Fleets"],
  LOBBIES: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Lobbies"],
  GAME: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Game"],
  UNIVERSAL_CREDITS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#UniversalCredits"],
  MAPS: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#Maps"],
  SHIP_ATTRIBUTES: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipAttributes"],
  SHIP_PURCHASER: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#ShipPurchaser"],
  DRONE_YARD: FLOW_TESTNET_DEPLOYED_ADDRESSES["DeployModule#DroneYard"],
} as const;

export const CONTRACT_ADDRESSES_BY_CHAIN_ID = {
  [flowTestnet.id]: FLOW_TESTNET_CONTRACT_ADDRESSES,
} as const;

/**
 * Returns contract addresses for the active chain. For now, we fall back to
 * Flow Testnet until additional networks are added.
 */
export function getContractAddresses(chainId?: number) {
  if (chainId && chainId in CONTRACT_ADDRESSES_BY_CHAIN_ID) {
    return CONTRACT_ADDRESSES_BY_CHAIN_ID[
      chainId as keyof typeof CONTRACT_ADDRESSES_BY_CHAIN_ID
    ];
  }
  return FLOW_TESTNET_CONTRACT_ADDRESSES;
}

// Default export for existing callsites (current app config uses Flow Testnet)
export const CONTRACT_ADDRESSES = FLOW_TESTNET_CONTRACT_ADDRESSES;

// Contract ABIs
export const CONTRACT_ABIS = {
  SHIPS: ShipsContract.abi,
  LOBBIES: LobbiesContract.abi,
  FLEETS: FleetsContract.abi,
  GAME: GameContract.abi,
  UNIVERSAL_CREDITS: UniversalCreditsContract.abi,
  MAPS: MapsContract.abi,
  SHIP_ATTRIBUTES: ShipAttributesContract.abi,
   DRONE_YARD: DroneYardContract.abi,
} as const;

// Hard-coded ship purchase tiers (from Ships contract)
// Tiers are now 0-based (0-4) instead of 1-based (1-5)
export const SHIP_PURCHASE_TIERS = {
  tiers: [0, 1, 2, 3, 4],
  shipsPerTier: [5, 11, 22, 40, 60],
  prices: [
    BigInt("4990000000000000000"), // 4.99 FLOW - Tier 0
    BigInt("9990000000000000000"), // 9.99 FLOW - Tier 1
    BigInt("19990000000000000000"), // 19.99 FLOW - Tier 2
    BigInt("34990000000000000000"), // 34.99 FLOW - Tier 3
    BigInt("49990000000000000000"), // 49.99 FLOW - Tier 4
  ],
} as const;

// Contract types for wagmi
export type ContractNames = keyof typeof CONTRACT_ADDRESSES;
export type ContractAddresses = (typeof CONTRACT_ADDRESSES)[ContractNames];
