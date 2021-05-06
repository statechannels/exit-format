// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Ideally this would be imported from @connect/vector-withdraw-helpers
// And the interface would match this one (note WithdrawData calldata wd has become bytes calldata cD)
interface WithdrawHelper {
    function execute(bytes calldata cD, uint256 actualAmount) external;
}

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
        address payable destination;
        uint256 amount;
        address callTo; // compatible with Vetor WithdrawHelper
        bytes data; // compatible with Vetor WithdrawHelper
    }

    // We use underscore parentheses to denote an _encodedVariable_
    function encodeExit(SingleAssetExit[] memory exit)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(exit);
    }

    function decodeGuaranteeData(bytes memory data)
        internal
        pure
        returns (address[] memory)
    {
        return abi.decode(data, (address[]));
    }

    function decodeExit(bytes memory _exit_)
        internal
        pure
        returns (SingleAssetExit[] memory)
    {
        return abi.decode(_exit_, (SingleAssetExit[]));
    }

    function encodeAllocation(Allocation memory allocation)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(allocation);
    }

    function decodeAllocation(bytes memory _allocation_)
        internal
        pure
        returns (Allocation memory)
    {
        return abi.decode(_allocation_, (Allocation));
    }

    /**
     * @notice Executes an exit by paying out assets and calling external contracts
     * @dev Executes an exit by paying out assets and calling external contracts
     * @param exit The exit to be paid out.
     */
    function executeExit(ExitFormat.SingleAssetExit[] memory exit) public {
        for (uint256 i = 0; i < exit.length; i++) {
            address asset = exit[i].asset;
            for (uint256 j = 0; j < exit[i].allocations.length; j++) {
                address payable destination =
                    exit[i].allocations[j].destination;
                uint256 amount = exit[i].allocations[j].amount;
                address callTo = exit[i].allocations[j].callTo;
                bytes memory data = exit[i].allocations[j].data;
                if (asset == address(0)) {
                    destination.transfer(amount);
                } else {
                    // TODO support other token types via the exit[i].data field
                    IERC20(asset).transfer(destination, amount);
                }
                if (callTo != address(0)) {
                    WithdrawHelper(callTo).execute(data, amount);
                }
            }
        }
    }
}
