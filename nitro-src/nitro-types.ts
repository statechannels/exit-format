import { defaultAbiCoder } from "@ethersproject/abi";
import { BytesLike, constants } from "ethers";
import {
  Exit,
  Allocation,
  SingleAssetExit,
  AllocationType,
} from "../src/types";

// this will cause executeExit to revert, which is what we want for a guarantee
// it should only work with a custom 'claim' operation
// we avoid the magic value of the zero address, because that is already used by executeExit

export type GuaranteeAllocation = Allocation & {
  allocationType: AllocationType.guarantee;
};

export type SingleAssetGuaranteeOutcome = SingleAssetExit & {
  allocations: GuaranteeAllocation[];
};

export type GuaranteeOutcome = SingleAssetGuaranteeOutcome[];

export const encodeTagList = (...tags: string[]): BytesLike =>
  defaultAbiCoder.encode(["string[]"], [tags]);

export const decodeTagList = (data: BytesLike): string[] =>
  defaultAbiCoder.decode(["string[]"], data)[0];
