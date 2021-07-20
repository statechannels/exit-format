import { BigNumber } from "@ethersproject/bignumber";
import { decodeGuaranteeData } from "./nitro-types";
import {
  Allocation,
  AllocationType,
  Exit,
  SingleAssetExit,
} from "../src/types";
import { constants } from "ethers";

/**
 * @dev Computes the new outcome that should be stored against a target channel after a claim is made on its guarantor.
 * @param guarantees the outcome containing at least one guarantee(s) which will be claimed for each asset.
 * @param funds initial quantity of each asset held on chain for the guarantor channel. Order matches that of initialGuaranteeOutcome.
 * @param targetChannelIndex the index of the guarantee in the list of guarantees for the given asset -- equivalent to declaring a target channel
 * @param targetOutcome initial outcome stored on chain for the target channel.
 * @param exitRequest list  of indices expressing which destinations in the allocation should be paid out for each asset.
 */
export function claim(
  guarantees: Exit,
  funds: BigNumber[],
  targetChannelIndex: number,
  targetOutcome: Exit,
  exitRequest: number[][]
) {
  if (targetOutcome.length !== funds.length) {
    throw Error("targetOutcome length must match funds length");
  }

  // Deep-copy as we will mutating this object.
  const afterClaimGuarantee: Exit = JSON.parse(JSON.stringify(guarantees));
  // Shallow-copy as we will assinging new values to indeces.
  const afterClaimFunds = [...funds];

  const afterClaimTargetOutcome: Exit = [];
  const afterClaimExits: Exit = [];

  // Iterate through every asset
  for (let assetIndex = 0; assetIndex < guarantees.length; assetIndex++) {
    const guarantee = guarantees[assetIndex].allocations;
    const targetAllocations = targetOutcome[assetIndex].allocations;

    const singleAssetExit: SingleAssetExit = {
      ...targetOutcome[assetIndex],
      allocations: [], // start with an empty array
    };

    if (
      guarantee[targetChannelIndex].allocationType !== AllocationType.guarantee
    ) {
      throw Error("Expected allocation type guarantee");
    }

    // Any guarantees before this one have priority on the funds
    // So we must account for that by reducing the surplus
    const guaranteesBeforeOurs = guarantee.slice(0, targetChannelIndex);
    const amountBeforeUs = sumAllocationAmounts(guaranteesBeforeOurs);
    const maximumAmountToPayOut = funds[assetIndex].sub(amountBeforeUs);

    // If there are not enough funds to fund the guarantee, we skip the asset
    if (maximumAmountToPayOut.lte(0)) {
      continue;
    }

    const fundsForOurGuarantee = min(
      maximumAmountToPayOut,
      BigNumber.from(guarantee[targetChannelIndex].amount)
    );

    const {
      updatedAllocations,
      updatedGuaranteeAmount,
      newExits,
    } = claimOneGuarantee(
      guarantee[targetChannelIndex],
      targetAllocations,
      fundsForOurGuarantee,
      exitRequest,
      assetIndex
    );

    // How much did all of the exits pay out?
    const amountPaidOut = sumAllocationAmounts(newExits);
    // For an asset, update funds based on payout
    afterClaimFunds[assetIndex] = afterClaimFunds[assetIndex].sub(
      amountPaidOut
    );
    // Update the guarantee to account for the payout
    afterClaimGuarantee[assetIndex].allocations[
      targetChannelIndex
    ].amount = updatedGuaranteeAmount.toHexString();

    afterClaimTargetOutcome.push({
      asset: targetOutcome[assetIndex].asset,
      metadata: targetOutcome[assetIndex].metadata,
      allocations: updatedAllocations,
    });

    singleAssetExit.allocations = newExits;
    afterClaimExits.push(singleAssetExit);
  }

  return {
    updatedHoldings: afterClaimFunds,
    updatedTargetOutcome: afterClaimTargetOutcome,
    exit: afterClaimExits,
    updatedGuaranteeOutcome: afterClaimGuarantee,
  };
}

function claimOneGuarantee(
  guarantee: Allocation,
  targetAllocations: Allocation[],
  fundingLeft: BigNumber,
  exitRequest: number[][],
  assetIndex: number
): {
  updatedAllocations: Allocation[];
  updatedGuaranteeAmount: BigNumber;
  newExits: Allocation[];
} {
  let updatedAllocations = [...targetAllocations];
  let updatedGuaranteeAmount = BigNumber.from(guarantee.amount);
  const newExits: Allocation[] = [];
  const destinations = decodeGuaranteeData(guarantee.metadata);
  let exitRequestIndex = 0;

  /**
   * The outer for loop iterates through destinations in the guarantee
   */
  for (
    let destinationIndex = 0;
    destinationIndex < destinations.length;
    destinationIndex++
  ) {
    if (fundingLeft.lte(0)) break;

    /**
     * The inner loop iterates through the target allocations.
     */
    for (
      let targetAllocIndex = 0;
      targetAllocIndex < targetAllocations.length;
      targetAllocIndex++
    ) {
      if (fundingLeft.lte(0)) break;

      if (
        destinations[destinationIndex].toLowerCase() ===
        targetAllocations[targetAllocIndex].destination.toLowerCase()
      ) {
        // if we find it, compute new amount
        const affordsForDestination = min(
          BigNumber.from(targetAllocations[targetAllocIndex].amount),
          fundingLeft
        );

        // only if specified in supplied exitRequests, or we if we are doing "all"
        if (
          exitRequest.length === 0 ||
          exitRequest[assetIndex].length === 0 ||
          (exitRequestIndex < exitRequest[assetIndex].length &&
            exitRequest[assetIndex][exitRequestIndex] === targetAllocIndex)
        ) {
          // Update the holdings and allocation
          updatedAllocations[targetAllocIndex].amount = BigNumber.from(
            targetAllocations[targetAllocIndex].amount
          )
            .sub(affordsForDestination)
            .toHexString();

          updatedGuaranteeAmount = updatedGuaranteeAmount.sub(
            affordsForDestination
          );

          newExits.push({
            destination: targetAllocations[targetAllocIndex].destination,
            amount: affordsForDestination.toHexString(),
            allocationType: targetAllocations[targetAllocIndex].allocationType,
            metadata: targetAllocations[targetAllocIndex].metadata,
          });

          exitRequestIndex++;
          // decrease surplus by the current amount regardless of hitting a specified exitRequest
          fundingLeft = fundingLeft.sub(affordsForDestination);
        }
      }
    }
  }
  return {
    updatedAllocations,
    updatedGuaranteeAmount,
    newExits,
  };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}

function sumAllocationAmounts(allocations: Allocation[]) {
  return allocations
    .map((allocation) => BigNumber.from(allocation.amount))
    .reduce((prevVal, currentVal) => prevVal.add(currentVal), constants.Zero);
}
