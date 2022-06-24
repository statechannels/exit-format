import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

export function encodeAllocations(allocation: Allocation) {
  return defaultAbiCoder.encode(
    [
      "tuple(bytes32 destination, uint256 amount, uint8 allocationType, bytes metadata)",
    ],
    [allocation]
  );
}

const exitABI = [
  {
    type: "tuple[]",
    components: [
      { name: "asset", type: "address" },
      {
        name: "assetMetadata",
        type: "tuple",
        components: [
          { name: "assetType", type: "uint8" },
          { name: "metadata", type: "bytes" },
        ],
      },
      {
        type: "tuple[]",
        name: "allocations",
        components: [
          { name: "destination", type: "bytes32" },
          { name: "amount", type: "uint256" },
          { name: "allocationType", type: "uint8" },
          { name: "metadata", type: "bytes" },
        ],
      } as ParamType,
    ],
  } as ParamType,
];

export function encodeExit(exit: Exit) {
  return defaultAbiCoder.encode(exitABI, [exit]);
}

export function decodeExit(_exit_: any) {
  return defaultAbiCoder.decode(exitABI, _exit_) as Exit;
}
