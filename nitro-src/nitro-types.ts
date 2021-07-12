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
const A_ADDRESS =
  "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f";
const B_ADDRESS =
  "0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810";
const exampleGuaranteeOutcome1: GuaranteeOutcome = [
  {
    asset: constants.AddressZero,
    metadata: "0x",
    allocations: [
      {
        destination: "0xjointchannel1",
        amount: "0xa",
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData(B_ADDRESS, A_ADDRESS),
      },
      {
        destination: "0xjointchannel2",
        amount: "0xa",
        allocationType: AllocationType.guarantee,
        metadata: encodeGuaranteeData(A_ADDRESS, B_ADDRESS),
      },
    ],
  },
];

const exampleGuaranteeOutcome2: Exit = exampleGuaranteeOutcome1; // GuaranteeOutcome is assignable to Exit

export function encodeGuaranteeData(...destinations: string[]): BytesLike {
  return defaultAbiCoder.encode(["bytes32[]"], [destinations]);
}

export function decodeGuaranteeData(data: BytesLike): string[] {
  return defaultAbiCoder.decode(["bytes32[]"], data)[0];
}
