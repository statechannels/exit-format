// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {
    uint256 public constant TokenA = 11;
    uint256 public constant TokenB = 22;

    constructor(uint256 initialSupply) ERC1155("") {
        _mint(msg.sender, TokenA, initialSupply, "");
        _mint(msg.sender, TokenB, initialSupply, "");
    }
}
