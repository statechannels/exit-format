import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Exit, SingleAssetExit } from "./types";

export function transfer(
  initialOutcome: Exit,
  initialHoldings: BigNumberish[],
  indices: number[][]
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
    let k = 0; // k is an index for this asset's indices
    for (let j = 0; j < initialAllocations.length; j++) {
      // j indexes allocations for this asset
      const affordsForDestination = min(
        BigNumber.from(initialAllocations[j].amount),
        surplus
      );
      if (
        indices[i].length == 0 ||
        (k < indices[i].length && indices[i][k] === j)
      ) {
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
          data: initialAllocations[j].data,
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
      data: initialOutcome[i].data,
      allocations: updatedAllocations,
    });

    exit.push(singleAssetExit);
  }

  return { updatedHoldings, updatedOutcome, exit };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
