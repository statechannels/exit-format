// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./ExitFormat.sol";

contract TestConsumer is ERC1155Holder {
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

    function exitsEqual(
        ExitFormat.SingleAssetExit[] memory exitA,
        ExitFormat.SingleAssetExit[] memory exitB
    ) public pure returns (bool) {
        return ExitFormat.exitsEqual(exitA, exitB);
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
