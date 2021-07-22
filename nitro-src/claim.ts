import { BigNumber } from "@ethersproject/bignumber";
import { decodeGuaranteeData } from "./nitro-types";
import {
  Allocation,
  AllocationType,
  Exit,
  SingleAssetExit,
} from "../src/types";
import { constants } from "ethers";
import _ from "lodash";

/**
 * Note about the inputs.
 * exitRequest is a 2 dimensional array.
 * - The first index enumerates assets.
 * - The second index enumerates destinations.
 * This means that the target channel must have the following characteristics.
 * - Every asset must list every destination.
 * - The destination order must be consistent across assets.
 */
/**
 * @dev Computes the new outcome that should be stored against a target channel after a claim is made on its guarantor.
 * @param guarantees the outcome containing at least one guarantee(s) which will be claimed for each asset.
 * @param holdings initial quantity of each asset held on chain for the guarantor channel. Order matches that of initialGuaranteeOutcome.
 * @param targetChannelIndex the index of the guarantee in the list of guarantees for the given asset -- equivalent to declaring a target channel
 * @param targetOutcome initial outcome stored on chain for the target channel.
 * @param exitRequest list of indices expressing which destinations in the allocation should be paid out for each asset.
 */
export function claim(
  guarantees: Exit,
  holdings: BigNumber[],
  targetChannelIndex: number,
  targetOutcome: Exit,
  exitRequest: number[][]
) {
  if (targetOutcome.length !== holdings.length) {
    throw Error("targetOutcome length must match funds length");
  }

  // Deep-copy as we will mutating these objects.
  const afterClaimGuarantee: Exit = _.cloneDeep(guarantees);
  const afterClaimHoldings = _.cloneDeep(holdings);

  const afterClaimTargetOutcome: Exit = [];
  const afterClaimExits: Exit = [];

  // Iterate through every asset
  for (let assetIndex = 0; assetIndex < guarantees.length; assetIndex++) {
    const guaranteesForOneAsset = guarantees[assetIndex].allocations;
    const targetAllocations = targetOutcome[assetIndex].allocations;

    const singleAssetExit: SingleAssetExit = {
      ...targetOutcome[assetIndex],
      allocations: [], // start with an empty array
    };

    if (
      guaranteesForOneAsset[targetChannelIndex].allocationType !==
      AllocationType.guarantee
    ) {
      throw Error("Expected allocation type guarantee");
    }

    // Any allocations before this one have priority on the funds
    // So we must account for that by reducing the surplus
    const guaranteesBeforeOurs = guaranteesForOneAsset.slice(
      0,
      targetChannelIndex
    );
    const amountBeforeUs = sumAllocationAmounts(guaranteesBeforeOurs);
    let maxAmountCanPayOut = holdings[assetIndex].sub(amountBeforeUs);

    // If there are not enough funds to fund the guarantee, we skip the asset
    if (maxAmountCanPayOut.lte(0)) {
      continue;
    }

    maxAmountCanPayOut = min(
      maxAmountCanPayOut,
      BigNumber.from(guaranteesForOneAsset[targetChannelIndex].amount)
    );

    const {
      afterClaimAllocations,
      afterClaimGuaranteeAmount,
      newExits,
    } = claimOneGuaranteeForOneAsset(
      guaranteesForOneAsset[targetChannelIndex],
      targetAllocations,
      maxAmountCanPayOut,
      exitRequest[assetIndex]
    );

    // How much did all of the exits pay out?
    const amountPaidOut = sumAllocationAmounts(newExits);
    // For an asset, update funds based on payout
    afterClaimHoldings[assetIndex] = afterClaimHoldings[assetIndex].sub(
      amountPaidOut
    );
    // Update the guarantee to account for the payout
    afterClaimGuarantee[assetIndex].allocations[
      targetChannelIndex
    ].amount = afterClaimGuaranteeAmount.toHexString();

    afterClaimTargetOutcome.push({
      asset: targetOutcome[assetIndex].asset,
      metadata: targetOutcome[assetIndex].metadata,
      allocations: afterClaimAllocations,
    });

    singleAssetExit.allocations = newExits;
    afterClaimExits.push(singleAssetExit);
  }

  return {
    updatedHoldings: afterClaimHoldings,
    updatedTargetOutcome: afterClaimTargetOutcome,
    exit: afterClaimExits,
    updatedGuaranteeOutcome: afterClaimGuarantee,
  };
}

function claimOneGuaranteeForOneAsset(
  guarantee: Allocation,
  targetAllocations: Allocation[],
  holdingsForGuarantee: BigNumber,
  exitRequest: number[]
): {
  afterClaimAllocations: Allocation[];
  afterClaimGuaranteeAmount: BigNumber;
  newExits: Allocation[];
} {
  let afterClaimAllocations = _.cloneDeep(targetAllocations);
  let afterClaimGuaranteeAmount = BigNumber.from(guarantee.amount);
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
    if (holdingsForGuarantee.lte(0)) break;

    /**
     * The inner loop iterates through the target allocations.
     */
    for (
      let targetAllocIndex = 0;
      targetAllocIndex < targetAllocations.length;
      targetAllocIndex++
    ) {
      if (holdingsForGuarantee.lte(0)) break;

      if (
        destinations[destinationIndex].toLowerCase() ===
        targetAllocations[targetAllocIndex].destination.toLowerCase()
      ) {
        // if we find it, compute new amount
        const affordsForDestination = min(
          BigNumber.from(targetAllocations[targetAllocIndex].amount),
          holdingsForGuarantee
        );

        // only if specified in supplied exitRequests, or we if we are doing "all"
        if (
          exitRequest.length === 0 ||
          exitRequest.length === 0 ||
          (exitRequestIndex < exitRequest.length &&
            exitRequest[exitRequestIndex] === targetAllocIndex)
        ) {
          // Update the holdings and allocation
          afterClaimAllocations[targetAllocIndex].amount = BigNumber.from(
            targetAllocations[targetAllocIndex].amount
          )
            .sub(affordsForDestination)
            .toHexString();

          afterClaimGuaranteeAmount = afterClaimGuaranteeAmount.sub(
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
          holdingsForGuarantee = holdingsForGuarantee.sub(
            affordsForDestination
          );
        }
      }
    }
  }

  return {
    afterClaimAllocations,
    afterClaimGuaranteeAmount,
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
