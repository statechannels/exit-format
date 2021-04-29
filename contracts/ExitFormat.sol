// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

library ExitFormat {
    // An Exit is an array of SingleAssetExit (one for each asset)
    // Exit = SingleAssetExit[]

    // A SingleAssetExit specifies
    // * an asset address (0 implies the native asset of the chain: on mainnet, this is ETH)
    // * custom data (optional field, can be zero bytes). This might specify how to transfer this particular asset (e.g. target an "ERC20.transfer"' method)
    // * an allocations array
    struct SingleAssetExit {
        address asset;
        bytes data;
        Allocation[] allocations;
    }

    // allocations is an ordered array of Allocation.
    // The ordering is important, and may express e.g. a priority order for the exit
    // (which would make a material difference to the final state in the case of running out of gas or funds)
    // Allocations = Allocation[]

    // An Allocation specifies
    // * a destination address
    // * an amount of asset
    // * custom data (optional field, can be zero bytes). This can be used flexibly by different protocols.
    struct Allocation {
        address destination;
        uint256 amount;
        bytes data;
    }

    // We use underscore parentheses to denote an _encodedVariable_
    function encodeExit(SingleAssetExit[] memory exit)
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(exit);
    }

    function decodeExit(bytes memory _exit_)
        public
        pure
        returns (SingleAssetExit[] memory)
    {
        return abi.decode(_exit_, (SingleAssetExit[]));
    }

    function encodeAllocation(Allocation memory allocation)
        public
        pure
        returns (bytes memory)
    {
        return abi.encode(allocation);
    }

    function decodeAllocation(bytes memory _allocation_)
        public
        pure
        returns (Allocation memory)
    {
        return abi.decode(_allocation_, (Allocation));
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? b : a;
    }

    /**
     * @notice Extracts an exit from an initial outcome and an exit request
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
                new ExitFormat.Allocation[](exitRequest[i].length);
            for (uint256 j = 0; j < initialAllocations.length; j++) {
                uint256 affordsForDestination =
                    min(initialAllocations[j].amount, surplus);

                if (
                    exitRequest[i].length == 0 ||
                    (k < exitRequest[i].length && exitRequest[i][k] == j)
                ) {
                    updatedHoldings[i] -= affordsForDestination;
                    initialAllocations[j].amount -= affordsForDestination;
                    exitAllocations[k] = ExitFormat.Allocation(
                        initialAllocations[j].destination,
                        affordsForDestination,
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
