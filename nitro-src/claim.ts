import { BigNumber } from "@ethersproject/bignumber";
import { decodeGuaranteeData } from "./nitro-types";
import { AllocationType, Exit, SingleAssetExit } from "../src/types";
import { constants } from "ethers";

export function claim(
  initialGuaranteeOutcome: Exit,
  initialHoldings: BigNumber[],
  targetChannelIndex: number,
  initialTargetOutcome: Exit,
  exitRequest: number[][]
) {
  if (initialTargetOutcome.length !== initialHoldings.length) throw Error;
  const updatedTargetOutcome: Exit = [];
  // Shallow-copy the holdings array as we will creating modified version.
  const updatedHoldings = [...initialHoldings];
  // Deep-copy the guaranteeOutcome as we will be creating a modified version.
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
      guarantees[targetChannelIndex].allocationType !== AllocationType.guarantee
    )
      throw Error;

    let surplus = initialHoldings[assetIndex];
    // Any guarantees before this one have priority on the funds
    // So we must account for that by reducing the surplus
    const guaranteesBeforeOurs = guarantees.slice(0, targetChannelIndex);
    const amountBeforeUs = guaranteesBeforeOurs
      .map((allocation) => BigNumber.from(allocation.amount))
      .reduce((sumSoFar, amount) => sumSoFar.add(amount), constants.Zero);
    surplus = surplus.sub(amountBeforeUs);
    // If there are not enough funds to fund the guarantee we return immediately
    if (surplus.lte(0)) {
      return {
        updatedGuaranteeOutcome,
        updatedHoldings,
        updatedTargetOutcome,
        exit,
      };
    }

    surplus = min(
      surplus,
      BigNumber.from(guarantees[targetChannelIndex].amount)
    );

    let exitRequestIndex = 0;

    const destinations = decodeGuaranteeData(
      guarantees[targetChannelIndex].metadata
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
        if (surplus.lte(0)) break;

        if (
          destinations[destinationIndex].toLowerCase() ===
          targetAllocations[targetAllocIndex].destination.toLowerCase()
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

            const currentGuaranteeAmount = BigNumber.from(
              updatedGuaranteeOutcome[assetIndex].allocations[
                targetChannelIndex
              ].amount
            );

            // Update the guarantee
            updatedGuaranteeOutcome[assetIndex].allocations[
              targetChannelIndex
            ].amount = currentGuaranteeAmount
              .sub(min(currentGuaranteeAmount, affordsForDestination))
              .toHexString();

            singleAssetExit.allocations.push({
              destination: targetAllocations[targetAllocIndex].destination,
              amount: affordsForDestination.toHexString(),
              allocationType:
                targetAllocations[targetAllocIndex].allocationType,
              metadata: targetAllocations[targetAllocIndex].metadata,
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
      metadata: initialTargetOutcome[assetIndex].metadata,
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
