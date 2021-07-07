const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { encodeGuaranteeData } from "../../nitro-src/nitro-types";
import { AllocationType, Exit } from "../../src/types";
const { ethers } = require("hardhat");
import { Nitro } from "../../typechain/Nitro";
import { rehydrateExit } from "../test-helpers";

const destinations = {
  alice: "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f",
  bob: "0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810"
}

describe("claim (solidity)", function () {
  let nitro: Nitro;

  before(async () => {
    nitro = await (await ethers.getContractFactory("Nitro")).deploy();

    await nitro.deployed();
  });

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const TARGET_CHANNEL_ADDRESS = "0x000000000000000000000000080678731247781ff0d57c649b6d0ad1a0620df0"; // At some point in the full claim operation, the outcome of this channel must be read and checked

  const initialOutcome: Exit = [
    {
      asset: ZERO_ADDRESS,
      metadata: "0x",
      allocations: [
        {
          destination: destinations.alice,
          amount: "0x05",
          allocationType: AllocationType.simple,
          metadata: "0x",
        },
        {
          destination: destinations.bob,
          amount: "0x05",
          allocationType: AllocationType.simple,
          metadata: "0x",
        },
      ],
    },
  ];

  const guarantee: Exit = [
    {
      asset: ZERO_ADDRESS,
      metadata: "0x",
      allocations: [
        {
          destination: TARGET_CHANNEL_ADDRESS,
          amount: "0x00",
          allocationType: AllocationType.guarantee,
          metadata: encodeGuaranteeData(destinations.bob, destinations.alice),
        },
      ],
    },
  ];

  it("Can claim with an empty exit request", async function () {
    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const { updatedHoldings, updatedTargetOutcome, exit } = await nitro.claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    const gasEstimate = await nitro.estimateGas.claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    expect(gasEstimate.toNumber()).to.equal(58310);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(0)]);

    expect(rehydrateExit(updatedTargetOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.alice.toLowerCase(),
            amount: BigNumber.from("0x04"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
          {
            destination: destinations.bob.toLowerCase(),
            amount: BigNumber.from("0x00"), // TODO: It would be nice if these were stripped out
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);

    expect(rehydrateExit(exit)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.bob.toLowerCase(),
            amount: BigNumber.from("0x05"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },

          {
            destination: destinations.alice.toLowerCase(),
            amount: BigNumber.from("0x01"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);
  });

  it("Can claim with exit requests", async function () {
    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[1]];

    const { updatedHoldings, updatedTargetOutcome, exit } = await nitro.claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    const gasEstimate = await nitro.estimateGas.claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    expect(gasEstimate.toNumber()).to.equal(56762);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(1)]);

    expect(rehydrateExit(updatedTargetOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.alice.toLowerCase(),
            amount: BigNumber.from("0x05"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
          {
            destination: destinations.bob.toLowerCase(),
            amount: BigNumber.from("0x00"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);

    expect(rehydrateExit(exit)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.bob.toLowerCase(),
            amount: BigNumber.from("0x05"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);
  });
});
