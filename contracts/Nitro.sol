// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ExitFormat.sol";

contract Nitro {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }

    function decodeGuaranteeData(bytes memory data)
        internal
        pure
        returns (address[] memory)
    {
        return abi.decode(data, (address[]));
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
            ExitFormat.SingleAssetExit[] memory updatedGuaranteeOutcome,
            ExitFormat.SingleAssetExit[] memory updatedTargetOutcome,
            uint256[] memory updatedHoldings,
            ExitFormat.SingleAssetExit[] memory exit
        )
    {
        require(initialTargetOutcome.length == initialHoldings.length);
        require(initialTargetOutcome.length == initialGuaranteeOutcome.length);

        exit = new ExitFormat.SingleAssetExit[](initialTargetOutcome.length);
        updatedHoldings = initialHoldings;

        updatedGuaranteeOutcome = initialGuaranteeOutcome;
        updatedTargetOutcome = new ExitFormat.SingleAssetExit[](
            initialTargetOutcome.length
        );

        // Iterate through every asset
        for (
            uint256 assetIndex = 0;
            assetIndex < initialGuaranteeOutcome.length;
            assetIndex++
        ) {
            uint256 surplus = initialHoldings[assetIndex];

            for (
                uint48 targetsIndex;
                targetsIndex < targetChannelIndex;
                targetsIndex++
            ) {
                uint256 affordsForDestination =
                    min(
                        surplus,
                        initialGuaranteeOutcome[assetIndex].allocations[
                            targetsIndex
                        ]
                            .amount
                    );
                surplus -= affordsForDestination;
            }

            if (surplus == 0) {
                break;
            }

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

            uint48 exitRequestIndex = 0;

            require(
                guarantees[targetChannelIndex].callTo ==
                    0x0000000000000000000000000000000000000001,
                "Must be a valid guarantee with callTo set to MAGIC_VALUE_DENOTING_A_GUARANTEE"
            );

            address[] memory destinations =
                decodeGuaranteeData(guarantees[targetChannelIndex].data);

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
                                targetAllocations[targetAllocIndex].callTo,
                                targetAllocations[targetAllocIndex].data
                            );

                            ++exitRequestIndex;
                        }
                        // decrease surplus by the current amount regardless of hitting a specified exitRequest
                        surplus -= affordsForDestination;
                    }

                    updatedTargetOutcome[assetIndex] = ExitFormat
                        .SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].data,
                        targetAllocations
                    );

                    exit[assetIndex] = ExitFormat.SingleAssetExit(
                        initialTargetOutcome[assetIndex].asset,
                        initialTargetOutcome[assetIndex].data,
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

        exit = new ExitFormat.SingleAssetExit[](initialOutcome.length);

        for (uint256 i = 0; i < initialOutcome.length; i++) {
            ExitFormat.Allocation[] memory initialAllocations =
                initialOutcome[i].allocations;

            updatedOutcome = new ExitFormat.SingleAssetExit[](
                initialOutcome.length
            );

            updatedHoldings = initialHoldings;

            uint48 k = 0;
            uint256 surplus = initialHoldings[i];

            ExitFormat.Allocation[] memory exitAllocations =
                new ExitFormat.Allocation[](
                    exitRequest[i].length > 0
                        ? exitRequest[i].length
                        : initialAllocations.length
                );

            for (uint256 j = 0; j < initialAllocations.length; j++) {
                uint256 affordsForDestination =
                    min(initialAllocations[j].amount, surplus);

                if (
                    exitRequest[i].length == 0 ||
                    (k < exitRequest[i].length && exitRequest[i][k] == j)
                ) {
                    if (initialAllocations[j].callTo == address(1))
                        revert("cannot transfer a guarantee");
                    updatedHoldings[i] -= affordsForDestination;

                    initialAllocations[j].amount -= affordsForDestination;

                    exitAllocations[k] = ExitFormat.Allocation(
                        initialAllocations[j].destination,
                        affordsForDestination,
                        initialAllocations[j].callTo,
                        initialAllocations[j].data
                    );
                    ++k;
                } else {}
                surplus -= affordsForDestination;
            }
            updatedOutcome[i] = ExitFormat.SingleAssetExit(
                initialOutcome[i].asset,
                initialOutcome[i].data,
                initialAllocations
            );
            exit[i] = ExitFormat.SingleAssetExit(
                initialOutcome[i].asset,
                initialOutcome[i].data,
                exitAllocations
            );
        }
    }
}
