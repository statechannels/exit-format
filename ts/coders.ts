import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

export function encodeAllocations(allocation: Allocation) {
  return defaultAbiCoder.encode(
    ["tuple(address destination, uint256 amount, bytes data)"],
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
              { name: "data", type: "bytes" },
            ],
          } as ParamType,
        ],
      } as ParamType,
    ],
    [exit]
  );
}
