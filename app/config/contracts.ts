import ShipsContract from "../contracts/DeployModule#Ships.json";
import LobbiesContract from "../contracts/DeployModule#Lobbies.json";
import FleetsContract from "../contracts/DeployModule#Fleets.json";
import GameContract from "../contracts/DeployModule#Game.json";
import UniversalCreditsContract from "../contracts/DeployModule#UniversalCredits.json";
import MapsContract from "../contracts/DeployModule#Maps.json";
import deployedAddresses from "../contracts/deployed_addresses.json";

// Contract addresses from deployed_addresses.json
export const CONTRACT_ADDRESSES = {
  SHIPS: deployedAddresses["DeployModule#Ships"],
  FLEETS: deployedAddresses["DeployModule#Fleets"],
  LOBBIES: deployedAddresses["DeployModule#Lobbies"],
  GAME: deployedAddresses["DeployModule#Game"],
  UNIVERSAL_CREDITS: deployedAddresses["DeployModule#UniversalCredits"],
  MAPS: deployedAddresses["DeployModule#Maps"],
  SHIP_PURCHASER: deployedAddresses["DeployModule#ShipPurchaser"],
} as const;

// Contract ABIs
export const CONTRACT_ABIS = {
  SHIPS: ShipsContract.abi,
  LOBBIES: LobbiesContract.abi,
  FLEETS: FleetsContract.abi,
  GAME: GameContract.abi,
  UNIVERSAL_CREDITS: UniversalCreditsContract.abi,
  MAPS: MapsContract.abi,
} as const;

// Hard-coded ship purchase tiers (from Ships contract)
export const SHIP_PURCHASE_TIERS = {
  tiers: [1, 2, 3, 4, 5],
  shipsPerTier: [5, 11, 28, 60, 125],
  prices: [
    BigInt("4990000000000000000"), // 4.99 FLOW
    BigInt("9990000000000000000"), // 9.99 FLOW
    BigInt("24990000000000000000"), // 24.99 FLOW
    BigInt("49990000000000000000"), // 49.99 FLOW
    BigInt("99990000000000000000"), // 99.99 FLOW
  ],
} as const;

// Contract types for wagmi
export type ContractNames = keyof typeof CONTRACT_ADDRESSES;
export type ContractAddresses = (typeof CONTRACT_ADDRESSES)[ContractNames];
