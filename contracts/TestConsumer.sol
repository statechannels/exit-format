// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ExitFormat.sol";

contract TestConsumer {
    function encodeExit(ExitFormat.SingleAssetExit[] memory exit)
        public
        pure
        returns (bytes memory)
    {
        return ExitFormat.encodeExit(exit);
    }

    function decodeExit(bytes memory _exit_)
        public
        pure
        returns (ExitFormat.SingleAssetExit[] memory)
    {
        return ExitFormat.decodeExit(_exit_);
    }

    function encodeAllocation(ExitFormat.Allocation memory allocation)
        public
        pure
        returns (bytes memory)
    {
        return ExitFormat.encodeAllocation(allocation);
    }

    function decodeAllocation(bytes memory _allocation_)
        public
        pure
        returns (ExitFormat.Allocation memory)
    {
        return ExitFormat.decodeAllocation(_allocation_);
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
