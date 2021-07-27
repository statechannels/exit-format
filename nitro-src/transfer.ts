import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Allocation, AllocationType, Exit } from "../src/types";

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
  let updatedHoldings = initialHoldings.map(BigNumber.from);
  const exit: Exit = [];

  // loop over assets
  for (let assetIndex = 0; assetIndex < initialOutcome.length; assetIndex++) {
    const {
      newAllocations,
      allocatesOnlyZeros,
      exitAllocations,
      totalPayouts,
    } = computeNewAllocations(
      BigNumber.from(initialHoldings[assetIndex]).toHexString(),
      initialOutcome[assetIndex].allocations,
      exitRequest[assetIndex]
    );

    updatedHoldings[assetIndex] = updatedHoldings[assetIndex].sub(totalPayouts);
    updatedOutcome[assetIndex] = {
      asset: initialOutcome[assetIndex].asset,
      metadata: initialOutcome[assetIndex].metadata,
      allocations: newAllocations,
    };

    exit[assetIndex] = {
      asset: initialOutcome[assetIndex].asset,
      metadata: initialOutcome[assetIndex].metadata,
      allocations: exitAllocations,
    };
  }

  return { updatedHoldings, updatedOutcome, exit };
}

/**
 *
 * Emulates solidity code. TODO replace with PureEVM implementation?
 * @param initialHoldings
 * @param allocation
 * @param indices
 */
export function computeNewAllocations(
  initialHoldings: string,
  allocations: Allocation[], // we must index this with a JS number that is less than 2**32 - 1
  indices: number[]
): {
  newAllocations: Allocation[];
  allocatesOnlyZeros: boolean;
  exitAllocations: Allocation[];
  totalPayouts: string;
} {
  const exitAllocations: Allocation[] = [];
  let totalPayouts = BigNumber.from(0);
  const newAllocations: Allocation[] = [];
  let allocatesOnlyZeros = true;
  let surplus = BigNumber.from(initialHoldings);
  let k = 0;

  for (let i = 0; i < allocations.length; i++) {
    newAllocations.push({
      destination: allocations[i].destination,
      allocationType: allocations[i].allocationType,
      metadata: allocations[i].metadata,
      amount: BigNumber.from(0).toHexString(),
    });
    const affordsForDestination = min(
      BigNumber.from(allocations[i].amount),
      surplus
    );
    if (indices.length == 0 || (k < indices.length && indices[k] === i)) {
      if (allocations[i].allocationType === AllocationType.guarantee)
        throw Error("cannot transfer a guarantee");
      newAllocations[i].amount = BigNumber.from(allocations[i].amount)
        .sub(affordsForDestination)
        .toHexString();
      exitAllocations[k] = {
        destination: allocations[i].destination,
        metadata: allocations[i].metadata,
        allocationType: allocations[i].allocationType,
        amount: affordsForDestination.toHexString(),
      };
      totalPayouts = totalPayouts.add(affordsForDestination);
      ++k;
    } else {
      newAllocations[i].amount = allocations[i].amount;
    }
    if (!BigNumber.from(newAllocations[i].amount).isZero())
      allocatesOnlyZeros = false;
    surplus = surplus.sub(affordsForDestination);
  }

  return {
    newAllocations,
    allocatesOnlyZeros,
    exitAllocations,
    totalPayouts: totalPayouts.toHexString(),
  };
}

function min(a: BigNumber, b: BigNumber) {
  return a.gt(b) ? b : a;
}
