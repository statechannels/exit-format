import { defaultAbiCoder } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

export function encodeAllocations(allocation: Allocation) {
  return defaultAbiCoder.encode(
    ["tuple(address destination, uint256 amount, bytes data)"],
    [allocation]
  );
}

// export function encodeExit(exit: Exit) {
//   return defaultAbiCoder.encode(
//     ["tuple(address asset, bytes data, bytes encodedAllocations)"],
//     exit.map((singleAssetExit) => ({
//       asset: singleAssetExit.asset,
//       data: singleAssetExit.data,
//       encodedAllocations: encodeAllocations(singleAssetExit.allocations),
//     }))
//   );
// }
