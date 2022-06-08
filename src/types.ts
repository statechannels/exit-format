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
  tokenMetadata: TokenMetadata;
  allocations: Allocation[];
}

export enum TokenType {
  Null,
  ERC20,
  ERC1155,
}

export interface TokenMetadata {
  tokenType: TokenType;
  metadata: BytesLike;
}

export const NullTokenMetadata: TokenMetadata = {
  tokenType: TokenType.Null,
  metadata: "0x",
};

export type Exit = SingleAssetExit[];
