// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    uint256 public constant TokenA = 11;
    uint256 public constant TokenB = 22;

    constructor() ERC721("Test721", "TST") {
        _mint(msg.sender, TokenA);
        _mint(msg.sender, TokenB);
    }
}
