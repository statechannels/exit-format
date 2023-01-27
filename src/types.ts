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
  Default,
  ERC721,
  ERC1155,
  Qualified,
}

export interface AssetMetadata {
  assetType: AssetType;
  metadata: BytesLike;
}

export interface QualifiedAssetMetaData {
  chainID: string; // a uint256
  assetHolder: string; // an Ethereum address
}

export const NullAssetMetadata: AssetMetadata = {
  assetType: AssetType.Default,
  metadata: "0x",
};

export type Exit = SingleAssetExit[];
