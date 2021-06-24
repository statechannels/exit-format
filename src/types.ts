import { BigNumberish } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";

export interface Allocation {
  destination: string; // an Ethereum address
  amount: BigNumberish;
  callTo: string; // an Ethereum address
  metadata: BytesLike;
}

export interface SingleAssetExit {
  asset: string; // an Ethereum address
  metadata: BytesLike;
  allocations: Allocation[];
}

export type Exit = SingleAssetExit[];
