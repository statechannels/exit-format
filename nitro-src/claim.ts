import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import {
  decodeGuaranteeData,
  MAGIC_VALUE_DENOTING_A_GUARANTEE,
} from "./nitro-types";
import { Exit, SingleAssetExit } from "../src/types";

export function claim(
  initialGuaranteeOutcome: Exit,
  initialHoldings: BigNumberish[],
  targetChannelIndex: number,
  initialTargetOutcome: Exit,
  exitRequest: number[][]
) {
  if (initialTargetOutcome.length !== initialHoldings.length) throw Error;
  const updatedTargetOutcome: Exit = [];
  let updatedHoldings = initialHoldings;
  const exit: Exit = [];

  // Iterate through every asset
  for (
    let assetIndex = 0;
    assetIndex < initialGuaranteeOutcome.length;
    assetIndex++
  ) {
    const guarantees = initialGuaranteeOutcome[assetIndex].allocations;
    const targetAllocations = initialTargetOutcome[assetIndex].allocations;

    const updatedAllocations = [...targetAllocations]; // copy the allocations for mutation
    let surplus = BigNumber.from(initialHoldings[assetIndex]);
    const singleAssetExit: SingleAssetExit = {
      ...initialTargetOutcome[assetIndex],
      allocations: [], // start with an empty array
    };

    if (
      guarantees[targetChannelIndex].callTo !== MAGIC_VALUE_DENOTING_A_GUARANTEE
    )
      throw Error;

    let exitRequestIndex = 0;

    const destinations = decodeGuaranteeData(
      guarantees[targetChannelIndex].data
    );
    // Iterate through every destination in the guarantee's destinations
    for (
      let destinationIndex = 0;
      destinationIndex < destinations.length;
      destinationIndex++
    ) {
      if (surplus.isZero()) break;
      for (
        let targetAllocIndex = 0;
        targetAllocIndex < targetAllocations.length;
        targetAllocIndex++
      ) {
        if (surplus.isZero()) break;

        if (
          destinations[destinationIndex] ===
          targetAllocations[targetAllocIndex].destination
        ) {
          // if we find it, compute new amount
          const affordsForDestination = min(
            BigNumber.from(targetAllocations[targetAllocIndex].amount),
            surplus
          );

          // only if specified in supplied exitRequests, or we if we are doing "all"
          if (
            exitRequest.length === 0 ||
            exitRequest[assetIndex].length === 0 ||
            (exitRequestIndex < exitRequest[assetIndex].length &&
              exitRequest[assetIndex][exitRequestIndex] === targetAllocIndex)
          ) {
            // Update the holdings and allocation
            updatedHoldings[assetIndex] = BigNumber.from(
              updatedHoldings[assetIndex]
            ).sub(affordsForDestination);
            updatedAllocations[targetAllocIndex].amount = BigNumber.from(
              targetAllocations[targetAllocIndex].amount
            )
              .sub(affordsForDestination)
              .toHexString();

            singleAssetExit.allocations.push({
              destination: targetAllocations[targetAllocIndex].destination,
              amount: affordsForDestination.toHexString(),
              callTo: targetAllocations[targetAllocIndex].callTo,
              data: targetAllocations[targetAllocIndex].data,
            });

            ++exitRequestIndex;
          } else {
          }
          // decrease surplus by the current amount regardless of hitting a specified exitRequest
          surplus = surplus.sub(affordsForDestination);
        }
      }
    }
    updatedTargetOutcome.push({
      asset: initialTargetOutcome[assetIndex].asset,
      tokenType: initialTargetOutcome[assetIndex].tokenType,
      allocations: updatedAllocations,
    });
    exit.push(singleAssetExit);
  }
  return { updatedHoldings, updatedTargetOutcome, exit };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
