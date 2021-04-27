// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

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
    struct Allocation{
        address destination;
        uint256 amount;
        bytes data;
    }
}
