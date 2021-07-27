// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0;

import "./ExitFormat.sol";

contract Nitro {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }

    function decodeGuaranteeData(bytes memory data)
        internal
        pure
        returns (bytes32[] memory)
    {
        return abi.decode(data, (bytes32[]));
    }

    /**
     * @dev Computes the new outcome that should be stored against a target channel after a claim is made on its guarantor.
     * @param initialGuaranteeOutcome the outcome containing at least one guarantee(s) which will be claimed for each asset.
     * @param initialHoldings initial quantity of each asset held on chain for the guarantor channel. Order matches that of initialGuaranteeOutcome.
     * @param targetChannelIndex the index of the guarantee in the list of guarantees for the given asset -- equivalent to declaring a target channel
     * @param initialTargetOutcome initial outcome stored on chain for the target channel.
     * @param exitRequest list  of indices expressing which destinations in the allocation should be paid out for each asset.
     */
    function claim(
        ExitFormat.SingleAssetExit[] memory initialGuaranteeOutcome,
        uint256[] memory initialHoldings,
        uint48 targetChannelIndex,
        ExitFormat.SingleAssetExit[] memory initialTargetOutcome,
        uint48[][] memory exitRequest
    )
        public
        pure
        returns (
            ExitFormat.SingleAssetExit[] memory updatedTargetOutcome,
            uint256[] memory updatedHoldings,
            ExitFormat.SingleAssetExit[] memory exit
        )
    {
        require(initialTargetOutcome.length == initialHoldings.length);
        require(initialTargetOutcome.length == initialGuaranteeOutcome.length);

        exit = new ExitFormat.SingleAssetExit[](initialTargetOutcome.length);
        updatedHoldings = initialHoldings;

        // Iterate through every asset
        for (
            uint256 assetIndex = 0;
            assetIndex < initialGuaranteeOutcome.length;
            assetIndex++
        ) {
            ExitFormat.Allocation[] memory guarantees =
                initialGuaranteeOutcome[assetIndex].allocations;

            ExitFormat.Allocation[] memory targetAllocations =
                initialTargetOutcome[assetIndex].allocations;

            // If exitRequest is empty for the allocation we want ALL to exit
            ExitFormat.Allocation[] memory exitAllocations =
                new ExitFormat.Allocation[](
                    exitRequest[assetIndex].length > 0
                        ? exitRequest[assetIndex].length
                        : targetAllocations.length
                );

            updatedTargetOutcome = new ExitFormat.SingleAssetExit[](
                initialTargetOutcome.length
            );

            uint256 surplus = initialHoldings[assetIndex];
            uint48 exitRequestIndex = 0;

            require(
                guarantees[targetChannelIndex].allocationType ==
                    uint8(ExitFormat.AllocationType.guarantee),
                "Must be a valid guarantee with allocationType set to ExitFormat.AllocationType.guarantee"
            );

            bytes32[] memory destinations =
                decodeGuaranteeData(guarantees[targetChannelIndex].metadata);

            // Iterate through every destination in the guarantee's destinations
            for (
                uint256 destinationIndex = 0;
                destinationIndex < destinations.length;
                destinationIndex++
            ) {
                if (surplus == 0) break;

                // Iterate through every allocation item in the target allocation
                for (
                    uint256 targetAllocIndex = 0;
                    targetAllocIndex < targetAllocations.length;
                    targetAllocIndex++
                ) {
                    if (surplus == 0) break;

                    if (
                        destinations[destinationIndex] ==
                        targetAllocations[targetAllocIndex].destination
                    ) {
                        // if we find it, compute new amount
                        uint256 affordsForDestination =
                            min(targetAllocations[assetIndex].amount, surplus);

                        // only if specified in supplied exitRequests, or we if we are doing "all"
                        if (
                            ((exitRequest.length == 0) ||
                                (exitRequest[assetIndex].length == 0)) ||
                            ((exitRequestIndex < exitRequest.length) &&
                                exitRequest[assetIndex][exitRequestIndex] ==
                                targetAllocIndex)
                        ) {
                            // Update the holdings and allocation
                            updatedHoldings[
                                assetIndex
                            ] -= affordsForDestination;
                            targetAllocations[targetAllocIndex]
                                .amount -= affordsForDestination;

                            exitAllocations[exitRequestIndex] = ExitFormat
                                .Allocation(
                                targetAllocations[targetAllocIndex].destination,
                                affordsForDestination,
                                targetAllocations[targetAllocIndex]
                                    .allocationType,
                                targetAllocations[targetAllocIndex].metadata
                            );

                            ++exitRequestIndex;
                        }
                        // decrease surplus by the current amount regardless of hitting a specified exitRequest
                        surplus -= affordsForDestination;
                    }

                    updatedTargetOutcome[assetIndex] = ExitFormat
                        .SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].metadata,
                        targetAllocations
                    );

                    exit[assetIndex] = ExitFormat.SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].metadata,
                        exitAllocations
                    );
                }
            }
        }
    }

    /**
     * @notice Extracts an exit from an initial outcome and an exit request. NITRO SPECIFIC
     * @dev Extracts an exit from an initial outcome and an exit request
     * @param initialOutcome The initial outcome.
     * @param initialHoldings The total funds that are available for the exit.
     * @param exitRequest An array with an entry for each asset: each entry is itself an array containing the exitRequest of the destinations to transfer funds to. Should be in increasing order. An empty array indicates "all".
     */
    function transfer(
        ExitFormat.SingleAssetExit[] memory initialOutcome,
        uint256[] memory initialHoldings,
        uint48[][] memory exitRequest
    )
        public
        pure
        returns (
            ExitFormat.SingleAssetExit[] memory updatedOutcome,
            uint256[] memory updatedHoldings,
            ExitFormat.SingleAssetExit[] memory exit
        )
    {
        require(initialOutcome.length == initialHoldings.length);

        updatedOutcome = new ExitFormat.SingleAssetExit[](
            initialOutcome.length
        );
        updatedHoldings = initialHoldings;
        exit = new ExitFormat.SingleAssetExit[](initialOutcome.length);

        // loop over assets
        for (
            uint256 assetIndex = 0;
            assetIndex < initialOutcome.length;
            assetIndex++
        ) {
            (
                ExitFormat.Allocation[] memory newAllocations,
                ,
                ExitFormat.Allocation[] memory exitAllocations,
                uint256 totalPayouts
            ) =
                _computeNewAllocations(
                    initialHoldings[assetIndex],
                    initialOutcome[assetIndex].allocations,
                    exitRequest[assetIndex]
                );
            updatedHoldings[assetIndex] -= totalPayouts;
            updatedOutcome[assetIndex] = ExitFormat.SingleAssetExit(
                initialOutcome[assetIndex].asset,
                initialOutcome[assetIndex].metadata,
                newAllocations
            );

            exit[assetIndex] = ExitFormat.SingleAssetExit(
                initialOutcome[assetIndex].asset,
                initialOutcome[assetIndex].metadata,
                exitAllocations
            );
        }
    }

    function _computeNewAllocations(
        uint256 initialHoldings,
        ExitFormat.Allocation[] memory allocations,
        uint48[] memory indices
    )
        public
        pure
        returns (
            ExitFormat.Allocation[] memory newAllocations,
            bool allocatesOnlyZeros,
            ExitFormat.Allocation[] memory exitAllocations,
            uint256 totalPayouts
        )
    {
        // `indices == []` means "pay out to all"
        // Note: by initializing payouts to be an array of fixed length, its entries are initialized to be `0`
        exitAllocations = new ExitFormat.Allocation[](
            indices.length > 0 ? indices.length : allocations.length
        );
        totalPayouts = 0;
        newAllocations = new ExitFormat.Allocation[](allocations.length);
        allocatesOnlyZeros = true; // switched to false if there is an item remaining with amount > 0
        uint256 surplus = initialHoldings; // tracks funds available during calculation
        uint256 k = 0; // indexes the `indices` array

        // loop over allocations and decrease surplus
        for (uint256 i = 0; i < allocations.length; i++) {
            // copy destination, allocationType and metadata parts
            newAllocations[i].destination = allocations[i].destination;
            newAllocations[i].allocationType = allocations[i].allocationType;
            newAllocations[i].metadata = allocations[i].metadata;
            // compute new amount part
            uint256 affordsForDestination = min(allocations[i].amount, surplus);
            if (
                (indices.length == 0) ||
                ((k < indices.length) && (indices[k] == i))
            ) {
                if (
                    allocations[k].allocationType ==
                    uint8(ExitFormat.AllocationType.guarantee)
                ) revert("cannot transfer a guarantee");
                // found a match
                // reduce the current allocationItem.amount
                newAllocations[i].amount =
                    allocations[i].amount -
                    affordsForDestination;
                // increase the relevant payout
                exitAllocations[k] = ExitFormat.Allocation(
                    allocations[i].destination,
                    affordsForDestination,
                    allocations[i].allocationType,
                    allocations[i].metadata
                );
                totalPayouts += affordsForDestination;
                // move on to the next supplied index
                ++k;
            } else {
                newAllocations[i].amount = allocations[i].amount;
            }
            if (newAllocations[i].amount != 0) allocatesOnlyZeros = false;
            // decrease surplus by the current amount if possible, else surplus goes to zero
            surplus -= affordsForDestination;
        }
    }
}
