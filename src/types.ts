import { BytesLike } from "@ethersproject/bytes";

export enum AllocationType {
  simple,
  withdrawHelper,
  guarantee,
}

export interface Allocation {
  destination: string; // an Ethereum address
  amount: string; // a uint256;
  allocationType: string;
  metadata: BytesLike;
}

export interface SingleAssetExit {
  asset: string; // an Ethereum address
  metadata: BytesLike;
  allocations: Allocation[];
}

export type Exit = SingleAssetExit[];
