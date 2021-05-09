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

As another bonus, we have also built the beginnings of a zero-knowledge proof mechanism, which will allow Nitro state channels to scale even farther beyond their current limit and bring gas costs down even further. This work-in-progress currently takes the form of some [Cairo](https://www.cairo-lang.org/) code that we successfully submitted to the Starkware [shared prover](https://www.cairo-lang.org/docs/sharp.html).

### How It's Made

The main content is the definition of an exit format, with some exit-transformations implemented in Typescript, Solidity & Cairo. One notable transformation, `claim`, streamlines Nitro's virtual channel protocol.

This repo has two dependencies: `ethers-js` for BigNumber types and ABI encoding and `openzeppelin/contracts` for token interfaces. We used `hardhat` for our development environment. The zk work uses the `cairo` language.

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
import { Exit, SingleAssetExit } from "@statechannels/exit-format";

const ethExit: SingleAssetExit = {
  asset: "0x0000000000000000000000000000000000000000", // this implies an ETH token
  data: "0x",
  allocations: [
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Alice
      amount: "0x05",
      callTo: "0x0000000000000000000000000000000000000000", // a regular ETH transfer
      data: "0x",
    },
    {
      destination: "0x0737369d5F8525D039038Da1EdBAC4C4f161b949", // Bob
      amount: "0x05",
      callTo: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // this implies "call a WithdrawHelper"
      data: "0x0123", /// ... with this calldata
    },
  ],
};

const daiExit: SingleAssetExit = {
  asset: "0x6b175474e89094c44da98b954eedeac495271d0f ", // this implies DAI (an ERC20 token)
  data: "0x",
  allocations: [
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Alice
      amount: "0x05",
      callTo: "0x0000000000000000000000000000000000000000", // a regular ERC20.transfer
      data: "0x",
    },
    {
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f", // Bob
      amount: "0x05",
      callTo: "0x0000000000000000000000000000000000000000", // a regular ERC20.transfer
      data: "0x",
    },
  ],
};

const exit: Exit = [ethExit, daiExit];
```
