import { defaultAbiCoder } from "@ethersproject/abi";
import { BytesLike, constants } from "ethers";
import { Exit, Allocation, SingleAssetExit } from "./types";

export const MAGIC_VALUE_DENOTING_A_GUARANTEE =
  "0x0000000000000000000000000000000000000001";
// this will cause executeExit to revert, which is what we want for a guarantee
// it should only work with a custom 'claim' operation
// we avoid the magic value of the zero address, because that is already used by executeExit

export type GuaranteeAllocation = Allocation & {
  callTo: typeof MAGIC_VALUE_DENOTING_A_GUARANTEE;
};

export type SingleAssetGuaranteeOutcome = SingleAssetExit & {
  allocations: GuaranteeAllocation[];
};

export type GuaranteeOutcome = SingleAssetGuaranteeOutcome[];

const exampleGuaranteeOutcome1: GuaranteeOutcome = [
  {
    asset: constants.AddressZero,
    data: "0x",
    allocations: [
      {
        destination: "0xjointchannel1",
        amount: "0xa",
        callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
        data: encodeGuaranteeData("0xAlice", "0xHarry", "0xvirtualchannel1"),
      },
      {
        destination: "0xjointchannel2",
        amount: "0xa",
        callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
        data: encodeGuaranteeData("0xAlice", "0xHarry", "0xvirtualchannel2"),
      },
    ],
  },
];

const exampleGuaranteeOutcome2: Exit = exampleGuaranteeOutcome1; // GuaranteeOutcome is assignable to Exit

function encodeGuaranteeData(...destinations: string[]): BytesLike {
  return defaultAbiCoder.encode(["address[]"], destinations);
}
