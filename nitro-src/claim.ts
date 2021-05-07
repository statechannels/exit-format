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
  // We want to create a clone of the original values to prevent mutation
  const updatedHoldings = initialHoldings.map((h) => BigNumber.from(h));
  const updatedGuaranteeOutcome: Exit = JSON.parse(
    JSON.stringify(initialGuaranteeOutcome)
  );
  const exit: Exit = [];

  // Iterate through every asset
  for (
    let assetIndex = 0;
    assetIndex < initialGuaranteeOutcome.length;
    assetIndex++
  ) {
    const guarantees = initialGuaranteeOutcome[assetIndex].allocations;
    const targetAllocations = initialTargetOutcome[assetIndex].allocations;

    const updatedAllocations = targetAllocations.map((a) =>
      JSON.parse(JSON.stringify(a))
    ); // copy the allocations for mutation

    const singleAssetExit: SingleAssetExit = {
      ...initialTargetOutcome[assetIndex],
      allocations: [], // start with an empty array
    };

    if (
      guarantees[targetChannelIndex].callTo !== MAGIC_VALUE_DENOTING_A_GUARANTEE
    )
      throw Error;

    let surplus = BigNumber.from(initialHoldings[assetIndex]);
    // Any guarantees before this one have priority on the funds
    // So we must account for that by reducing the surplus
    for (
      let guaranteeIndex = 0;
      guaranteeIndex < targetChannelIndex;
      guaranteeIndex++
    ) {
      const { amount } = guarantees[guaranteeIndex];

      surplus = surplus.sub(min(BigNumber.from(amount), surplus)); // Prevent going below 0
    }
    // If there are not enough funds to fund the guarantee we return immediately
    if (surplus.lte(0)) {
      return {
        updatedGuaranteeOutcome,
        updatedHoldings,
        updatedTargetOutcome,
        exit,
      };
    } else {
      const currentAmount = BigNumber.from(
        updatedGuaranteeOutcome[assetIndex].allocations[targetChannelIndex]
          .amount
      );
      const newAmount = currentAmount
        .sub(min(surplus, currentAmount)) // It's possible that surplus is large
        .toHexString();

      // If we do have enough funds we update the guarantee to indicate they have been allocated
      updatedGuaranteeOutcome[assetIndex].allocations[
        targetChannelIndex
      ].amount = newAmount;
    }
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
      if (surplus.lte(0)) break;
      for (
        let targetAllocIndex = 0;
        targetAllocIndex < targetAllocations.length;
        targetAllocIndex++
      ) {
        if (surplus.lte(0)) break;

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
      data: initialTargetOutcome[assetIndex].data,
      allocations: updatedAllocations,
    });
    exit.push(singleAssetExit);
  }
  return {
    updatedHoldings,
    updatedTargetOutcome,
    exit,
    updatedGuaranteeOutcome,
  };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
