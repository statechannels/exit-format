const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { AllocationType, Exit } from "../../src/types";
const { ethers } = require("hardhat");
import { Nitro } from "../../typechain/Nitro";
import { rehydrateExit } from "../test-helpers";

const destinations = {
  alice: "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f".toLowerCase(),
  bob: "0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810".toLowerCase()
}

describe("transfer (solidity)", function () {
  let nitro: Nitro;

  before(async () => {
    nitro = await (await ethers.getContractFactory("Nitro")).deploy();

    await nitro.deployed();
  });

  const initialOutcome: Exit = [
    {
      asset: "0x0000000000000000000000000000000000000000",
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
  const initialHoldings = [BigNumber.from(6)];

  it("Can transfer with an exitRequest", async function () {
    const exitRequest = [[1]];

    const { updatedHoldings, updatedOutcome, exit } = await nitro.transfer(
      initialOutcome,
      initialHoldings,
      exitRequest
    );

    const gasEstimate = await nitro.estimateGas.transfer(
      initialOutcome,
      initialHoldings,
      exitRequest
    );

    expect(gasEstimate.toNumber()).to.equal(45461);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(rehydrateExit(updatedOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.alice,
            amount: BigNumber.from("0x05"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
          {
            destination: destinations.bob,
            amount: BigNumber.from("0x04"),
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
            destination: destinations.bob,
            amount: BigNumber.from("0x01"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);
  });

  it("Can transfer with an emptpy exitRequest", async function () {
    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const { updatedHoldings, updatedOutcome, exit } = await nitro.transfer(
      initialOutcome,
      initialHoldings,
      exitRequest
    );

    const gasEstimate = await nitro.estimateGas.transfer(
      initialOutcome,
      initialHoldings,
      exitRequest
    );

    expect(gasEstimate.toNumber()).to.equal(46920);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(0)]);

    expect(rehydrateExit(updatedOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.alice,
            amount: BigNumber.from("0x0"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
          {
            destination: destinations.bob,
            amount: BigNumber.from("0x04"),
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
            destination: destinations.alice,
            amount: BigNumber.from("0x5"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
          {
            destination: destinations.bob,
            amount: BigNumber.from("0x01"),
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);
  });

  it("Reverts if the initialOutcome is a guarantee", async function () {
    const initialHoldings = [BigNumber.from(6)];

    const guarantee: Exit = [
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.alice,
            amount: "0x05",
            allocationType: AllocationType.guarantee,
            metadata: "0x",
          },
          {
            destination: destinations.bob,
            amount: "0x05",
            allocationType: AllocationType.guarantee,
            metadata: "0x",
          },
        ],
      },
    ];

    const exitRequest = [[]];

    await expect(nitro.transfer(guarantee, initialHoldings, exitRequest)).to.be
      .reverted;
  });
});
