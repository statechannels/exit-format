<p align="center">
  <img src="logo.png" />
</p>

**Standard Exit Format for L2s built on EVM chains**

We present a general standard for such a format, along with coders written in Typescript, which will aid L2 interoperability and support arbitrary tokens.

Description

The idea behind this library is to standardise the data structures used in exiting a layer 2 system: whether that is a [Celer](https://www.celer.network/), [Connext](https://connext.network/), or [Nitro](https://statechannels.org/) state channel or a rollup such as [Arbitrum](https://offchainlabs.com/) or [Optimism](https://optimism.io/). An exit format allows one to specify how assets locked up and redistributed in an L2 should be paid out in L1. Standard utilities, built against a standard format, can undergo a higher concentration of scrutiny from the community and auditors — a major benefit.

We hope to receive feedback from as many layer 2 projects as possible, to help towards writing a standards track EIP. Adoption of this standard improves interoperability between L2s, and enables the sharing of L2 entrance & exit utilities, such as exit meta transactions.

We have concentrated so far on a format that works for [Nitro state channels](https://medium.com/magmo/nitro-protocol-c49b50f59df7). The new format enables us to streamline our virtual channel construction, simplifying the protocol while lowering the gas costs for channel disputes. Find out more at [https://www.notion.so/statechannels/Streamlining-Virtual-Channels-8a8650ba849d4221b7e93c125a794ecf](https://www.notion.so/statechannels/Streamlining-Virtual-Channels-8a8650ba849d4221b7e93c125a794ecf)

The standard is extensible enough to support future token standards and even to describe cross-chain assets.

### How It's Made

The main content is the definition of an exit format, with some exit-transformations implemented in Typescript and Solidity.

This repo depends on `ethers-js` for ABI encoding.

**How to install this package**

```shell
yarn add @statechannels/exit-format
```

**Example usage**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@statechannels/exit-format/contracts/ExitFormat.sol";

contract MyLayer2 {
  bytes32 exitHash;

  function storeExitHash(ExitFormat.SingleAssetExit[] memory exit) public {
    if (msg.sender == 0x0737369d5F8525D039038Da1EdBAC4C4f161b949) {
      exitHash = keccak256(ExitFormat.encodeExit(exit));
    }
  }

  function payout(ExitFormat.SingleAssetExit[] memory exit) public {
    if (keccak256(ExitFormat.encodeExit(exit)) == exitHash) {
      ExitFormat.executeExit(exit);
    }
  }
}

```

```typescript
import {
  Exit,
  SingleAssetExit,
  NullAssetMetadata,
} from "@statechannels/exit-format";

const ethExit: SingleAssetExit = {
  asset: "0x0000000000000000000000000000000000000000", // this implies the native token (e.g. ETH)
  assetMetadata: NullAssetMetadata,
  allocations: [
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Alice
      amount: "0x05",
      allocationType: AllocationType.simple, // a regular ETH transfer
      metadata: "0x",
    },
    {
      destination: "0x0737369d5F8525D039038Da1EdBAC4C4f161b949", // Bob
      amount: "0x05",
      allocationType: AllocationType.withdrawHelper, // call a WithdrawHelper
      metadata: "0x0123", // at the address, and with the calldata, encoded within
    },
  ],
};

const daiExit: SingleAssetExit = {
  asset: "0x6b175474e89094c44da98b954eedeac495271d0f", // this implies DAI (an ERC20 token)
  assetMetadata: {
    assetType: AssetType.ERC20, // The format supports Native, ERC20, ERC721 and ERC1155 tokens and can be extended to others.
    metadata: "0x",
  },
  allocations: [
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Alice
      amount: "0x05",
      allocationType: AllocationType.simple, // a regular ERC20.transfer
      metadata: "0x",
    },
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Bob
      amount: "0x05",
      allocationType: AllocationType.simple, // a regular ERC20.transfer
      metadata: "0x",
    },
  ],
};

const exit: Exit = [ethExit, daiExit];
```
