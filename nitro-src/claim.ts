import { BigNumber } from "@ethersproject/bignumber";
import { decodeGuaranteeData, GuaranteeAllocation } from "./nitro-types";
import {
  Allocation,
  AllocationType,
  Exit,
  SingleAssetExit,
} from "../src/types";
import { constants } from "ethers";
import _ from "lodash";
import { convertPayoutsToExitAllocations } from "./transfer";

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
      newAllocations: afterClaimAllocations,
      allocatesOnlyZeros,
      payouts,
      totalPayouts,
    } = computeNewAllocationsWithGuarantee(
      maxAmountCanPayOut.toHexString(),
      targetAllocations,
      exitRequest[assetIndex],
      guaranteesForOneAsset[targetChannelIndex] as GuaranteeAllocation // we checked this above
    );

    // For an asset, update funds based on payout
    afterClaimHoldings[assetIndex] = afterClaimHoldings[assetIndex].sub(
      totalPayouts
    );
    // Update the guarantee to account for the payout
    afterClaimGuarantee[assetIndex].allocations[
      targetChannelIndex
    ].amount = BigNumber.from(
      afterClaimGuarantee[assetIndex].allocations[targetChannelIndex].amount
    )
      .sub(totalPayouts)
      .toHexString();

    afterClaimTargetOutcome.push({
      asset: targetOutcome[assetIndex].asset,
      metadata: targetOutcome[assetIndex].metadata,
      allocations: afterClaimAllocations,
    });

    singleAssetExit.allocations = convertPayoutsToExitAllocations(
      targetAllocations,
      payouts,
      exitRequest[assetIndex]
    );
    afterClaimExits.push(singleAssetExit);
  }

  return {
    updatedHoldings: afterClaimHoldings,
    updatedTargetOutcome: afterClaimTargetOutcome,
    exit: afterClaimExits,
    updatedGuaranteeOutcome: afterClaimGuarantee,
  };
}

/**
 *
 * Emulates solidity code. TODO replace with PureEVM implementation?
 * @param initialHoldings
 * @param allocation
 * @param indices
 */
export function computeNewAllocationsWithGuarantee(
  initialHoldings: string,
  allocations: Allocation[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[],
  guarantee: GuaranteeAllocation
): {
  newAllocations: Allocation[];
  allocatesOnlyZeros: boolean;
  payouts: string[];
  totalPayouts: string;
} {
  const payouts: string[] = Array(
    indices.length > 0 ? indices.length : allocations.length
  ).fill(BigNumber.from(0).toHexString());
  let totalPayouts = BigNumber.from(0);
  let allocatesOnlyZeros = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  // copy allocation
  const newAllocations: Allocation[] = [];
  for (let i = 0; i < allocations.length; i++) {
    newAllocations.push({
      destination: allocations[i].destination,
      amount: allocations[i].amount,
      allocationType: allocations[i].allocationType,
      metadata: allocations[i].metadata,
    });
  }

  const destinations = decodeGuaranteeData(guarantee.metadata);

  // for each guarantee destination
  for (let j = 0; j < destinations.length; j++) {
    if (surplus.isZero()) break;
    for (let i = 0; i < newAllocations.length; i++) {
      if (surplus.isZero()) break;
      // search for it in the allocation
      if (
        BigNumber.from(destinations[j]).eq(
          BigNumber.from(newAllocations[i].destination)
        )
      ) {
        // if we find it, compute new amount
        const affordsForDestination = min(
          BigNumber.from(newAllocations[i].amount),
          surplus
        );
        // decrease surplus by the current amount regardless of hitting a specified index
        surplus = surplus.sub(affordsForDestination);
        if (indices.length === 0 || (k < indices.length && indices[k] === i)) {
          // only if specified in supplied indices, or we if we are doing "all"
          // reduce the current allocationItem.amount
          newAllocations[i].amount = BigNumber.from(newAllocations[i].amount)
            .sub(affordsForDestination)
            .toHexString();
          // increase the relevant payout
          payouts[k] = affordsForDestination.toHexString();
          totalPayouts = totalPayouts.add(affordsForDestination);
          ++k;
        }
        break;
      }
    }
  }

  for (let i = 0; i < allocations.length; i++) {
    if (!BigNumber.from(newAllocations[i].amount).isZero()) {
      allocatesOnlyZeros = false;
      break;
    }
  }

  return {
    newAllocations,
    allocatesOnlyZeros,
    payouts,
    totalPayouts: totalPayouts.toHexString(),
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
