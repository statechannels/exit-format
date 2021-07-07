import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { AllocationType, Exit, SingleAssetExit } from "../src/types";
import { MAGIC_VALUE_DENOTING_A_GUARANTEE } from "./nitro-types";

/**
 * Extracts an exit from an initial outcome and an exit request
 * @param initialOutcome The initial outcome.
 * @param initialHoldings The total funds that are available for the exit.
 * @param exitRequest An array with an entry for each asset: each entry is itself an array containing the exitRequest of the destinations to transfer funds to. Should be in increasing order. An empty array indicates "all".
 */
export function transfer(
  initialOutcome: Exit,
  initialHoldings: BigNumberish[],
  exitRequest: number[][]
) {
  if (initialOutcome.length !== initialHoldings.length) throw Error;
  const updatedOutcome: Exit = [];
  let updatedHoldings = initialHoldings;
  const exit: Exit = [];

  for (let i = 0; i < initialOutcome.length; i++) {
    // i indexes assets
    const initialAllocations = initialOutcome[i].allocations; // unpacking
    const updatedAllocations = [...initialAllocations]; // copy the allocations for mutation
    let surplus = BigNumber.from(initialHoldings[i]); //
    const singleAssetExit: SingleAssetExit = {
      ...initialOutcome[i],
      allocations: [], // start with an empty array
    };
    let k = 0; // k is an index for this asset's exitRequest
    for (let j = 0; j < initialAllocations.length; j++) {
      // j indexes allocations for this asset
      const affordsForDestination = min(
        BigNumber.from(initialAllocations[j].amount),
        surplus
      );
      if (
        exitRequest[i].length == 0 ||
        (k < exitRequest[i].length && exitRequest[i][k] === j)
      ) {
        if (initialAllocations[j].allocationType == AllocationType.guarantee)
          throw Error("Cannot transfer a guarantee");
        updatedHoldings[i] = BigNumber.from(updatedHoldings[i]).sub(
          affordsForDestination
        );
        updatedAllocations[j].amount = BigNumber.from(
          initialAllocations[j].amount
        )
          .sub(affordsForDestination)
          .toHexString();
        singleAssetExit.allocations.push({
          destination: initialAllocations[j].destination,
          amount: affordsForDestination.toHexString(),
          allocationType: initialAllocations[j].allocationType,
          metadata: initialAllocations[j].metadata,
        });
        ++k;
      } else {
        updatedAllocations[j].amount = BigNumber.from(
          initialAllocations[j].amount
        ).toHexString();
      }
      surplus = surplus.sub(affordsForDestination);
    }
    updatedOutcome.push({
      asset: initialOutcome[i].asset,
      metadata: initialOutcome[i].metadata,
      allocations: updatedAllocations,
    });

    exit.push(singleAssetExit);
  }

  return { updatedHoldings, updatedOutcome, exit };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
