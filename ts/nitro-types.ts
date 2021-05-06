import { defaultAbiCoder } from "@ethersproject/abi";
import { constants } from "ethers";
import { Exit } from "./types";

const MAGIC_VALUE_DENOTING_A_GUARANTEE =
  "0x0000000000000000000000000000000000000001";
// this will cause executeExit to revert, which is what we want for a guarantee
// it should only work with a custom 'claim' operation
// we avoid the magic value of the zero address, because that is already used by executeExit

const guaranteeOutcome: Exit = [
  {
    asset: constants.AddressZero,
    data: "0x",
    allocations: [
      {
        destination: "0xjointchannel1",
        amount: "0xa",
        callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
        data: encodeGuarantee("0xAlice", "0xHarry", "0xvirtualchannel1"),
      },
      {
        destination: "0xjointchannel2",
        amount: "0xa",
        callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
        data: encodeGuarantee("0xAlice", "0xHarry", "0xvirtualchannel2"),
      },
    ],
  },
];

function encodeGuarantee(...destinations: string[]) {
  return defaultAbiCoder.encode(["address[]"], destinations);
}
