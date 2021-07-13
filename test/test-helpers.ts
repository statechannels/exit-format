// @ts-nocheck
// this is a hack to get around the way ethers presents the result

import { Result } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";

// TODO can we get at the raw data returned from the eth_call?
export function rehydrateExit(exitResult: Result) {
  return exitResult.map((entry) => {
    const object = {};
    Object.keys(entry).forEach((key) => {
      if (key === "allocations") {
        object[key] = entry[key].map((allocation) => ({
          destination: allocation[0],
          amount: BigNumber.from(allocation[1]),
          allocationType: allocation[2],
          metadata: allocation[3],
        }));
      } else if (Number(key) !== Number(key)) object[key] = entry[key];
    });
    return object;
  });
}
