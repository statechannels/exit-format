import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

const allocationType =
  "tuple(bytes32 destination, uint256 amount, uint8 allocationType, bytes metadata)";

export function encodeAllocations(allocation: Allocation) {
  return defaultAbiCoder.encode([allocationType], [allocation]);
}

export function decodeAllocations(_allocations_: any) {
  return defaultAbiCoder.decode(
    [allocationType],
    [_allocations_]
  ) as Allocation[];
}

const exitType = {
  type: "tuple[]",
  components: [
    { name: "asset", type: "address" },
    { name: "metadata", type: "bytes" },
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
} as ParamType;

export function encodeExit(exit: Exit) {
  return defaultAbiCoder.encode([exitType], [exit]);
}

export function decodeExit(_exit_: any) {
  return defaultAbiCoder.decode([exitType], _exit_) as Exit;
}
