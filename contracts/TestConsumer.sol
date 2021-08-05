// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ExitFormat.sol";

contract TestConsumer {
    receive() external payable {
        // contract may receive ether
    }

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

    function executeSingleAssetExit(
        ExitFormat.SingleAssetExit memory singleAssetExit
    ) public {
        ExitFormat.executeSingleAssetExit(singleAssetExit);
    }

    function executeExit(ExitFormat.SingleAssetExit[] memory exit) public {
        ExitFormat.executeExit(exit);
    }
}
