import { BytesLike } from "@ethersproject/bytes";

export enum AllocationType {
  simple,
  withdrawHelper,
  guarantee,
}

export interface Allocation {
  destination: string; // an Ethereum address
  amount: string; // a uint256;
  allocationType: number;
  metadata: BytesLike;
}

export interface SingleAssetExit {
  asset: string; // an Ethereum address
  assetMetadata: AssetMetadata;
  allocations: Allocation[];
}

export enum AssetType {
  Null,
  ERC20,
  ERC721,
  ERC1155,
}

export interface AssetMetadata {
  assetType: AssetType;
  metadata: BytesLike;
}

export const NullAssetMetadata: AssetMetadata = {
  assetType: AssetType.Null,
  metadata: "0x",
};

export type Exit = SingleAssetExit[];
