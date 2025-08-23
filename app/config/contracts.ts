import ShipsContract from "../contracts/DeployModule#Ships.json";

// Contract addresses from deployed_addresses.json
export const CONTRACT_ADDRESSES = {
  SHIPS: "0xe55177350359D70F9906585AD9d93954fF212Cb7",
  FLEETS: "0x8B05189fD42749e5CFD3F988d02E87708B6970A5",
  LOBBIES: "0x0069915431aCD8d9834C7246Bbc9FC96f01271fE",
  GAME: "0x83209b5766220ba9Fc0116CCeA99f0Ff1753f998",
  UNIVERSAL_CREDITS: "0x173f2552EA5437A24BE43DFf274BF4224D8CBE66",
  SHIP_PURCHASER: "0xC5014C4fA7896A0160d0a80502642DcB95207656",
} as const;

// Contract ABIs
export const CONTRACT_ABIS = {
  SHIPS: ShipsContract.abi,
} as const;

// Contract types for wagmi
export type ContractNames = keyof typeof CONTRACT_ADDRESSES;
export type ContractAddresses = (typeof CONTRACT_ADDRESSES)[ContractNames];
