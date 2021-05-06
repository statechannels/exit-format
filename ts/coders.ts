import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

export function encodeAllocations(allocation: Allocation) {
  return defaultAbiCoder.encode(
    ["tuple(address destination, uint256 amount, address callTo, bytes data)"],
    [allocation]
  );
}

export function encodeExit(exit: Exit) {
  return defaultAbiCoder.encode(
    [
      {
        type: "tuple[]",
        components: [
          { name: "asset", type: "address" },
          { name: "data", type: "bytes" },
          {
            type: "tuple[]",
            name: "allocations",
            components: [
              { name: "destination", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "callTo", type: "address" },
              { name: "data", type: "bytes" },
            ],
          } as ParamType,
        ],
      } as ParamType,
    ],
    [exit]
  );
}

export function decodeExit(_exit_: any) {
  return defaultAbiCoder.decode(
    [
      {
        type: "tuple[]",
        components: [
          { name: "asset", type: "address" },
          { name: "data", type: "bytes" },
          {
            type: "tuple[]",
            name: "allocations",
            components: [
              { name: "destination", type: "address" },
              { name: "amount", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          } as ParamType,
        ],
      } as ParamType,
    ],
    _exit_
  );
}
