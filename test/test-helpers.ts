// @ts-nocheck
// this is a hack to get around the way ethers presents the result
import { SingleAssetExit, AllocationType } from "../src/types";

import { Result } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";

// TODO can we get at the raw data returned from the eth_call?
export function rehydrateExit(exitResult: Result) {
  return exitResult.map((entry) => {
    const object = {};
    Object.keys(entry).forEach((key) => {
      if (key == "allocations") {
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

interface MakeSimpleExitParameters {
  asset: string;
  destination: string;
  amount: number;
  metadata?: BytesLike;
}

export function makeSimpleExit({
  asset,
  destination,
  amount,
  metadata = "0x",
}: MakeSimpleExitParameters): SingleAssetExit {
  return {
    asset,
    metadata,
    allocations: [
      {
        destination: "0x000000000000000000000000" + destination.slice(2), // padded alice
        amount,
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ],
  };
}
