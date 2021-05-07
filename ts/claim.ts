import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import {
  decodeGuaranteeData,
  MAGIC_VALUE_DENOTING_A_GUARANTEE,
} from "./nitro-types";
import { Exit, SingleAssetExit } from "./types";

export function claim(
  initialGuaranteeOutcome: Exit,
  initialHoldings: BigNumberish[],
  targetChannel: number,
  initialTargetOutcome: Exit,
  exitRequest: number[][]
) {
  if (initialTargetOutcome.length !== initialHoldings.length) throw Error;
  const updatedTargetOutcome: Exit = [];
  let updatedHoldings = initialHoldings;
  const exit: Exit = [];

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

    if (guarantees[targetChannel].callTo !== MAGIC_VALUE_DENOTING_A_GUARANTEE)
      throw Error;

    const destinations = decodeGuaranteeData(guarantees[targetChannel].data);
    let exitRequestIndex = 0;
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
          const affordsForDestination = min(
            BigNumber.from(targetAllocations[targetAllocIndex].amount),
            surplus
          );
          if (
            exitRequest.length === 0 ||
            exitRequest[assetIndex].length === 0 ||
            (exitRequestIndex < exitRequest[assetIndex].length &&
              exitRequest[assetIndex][exitRequestIndex] === targetAllocIndex)
          ) {
            updatedHoldings[assetIndex] = BigNumber.from(
              updatedHoldings[assetIndex]
            ).sub(affordsForDestination);
            console.log(updatedHoldings);
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
      data: initialTargetOutcome[assetIndex].data,
      allocations: updatedAllocations,
    });
    exit.push(singleAssetExit);
  }
  return { updatedHoldings, updatedTargetOutcome, exit };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
