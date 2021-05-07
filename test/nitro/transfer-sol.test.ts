const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { MAGIC_VALUE_DENOTING_A_GUARANTEE } from "../../nitro-src/nitro-types";
import { Exit } from "../../src/types";
const { ethers } = require("hardhat");
import { Nitro } from "../../typechain/Nitro";
import { rehydrateExit } from "../test-helpers";

describe("transfer (solidity)", function () {
  let nitro: Nitro;

  before(async () => {
    nitro = await (await ethers.getContractFactory("Nitro")).deploy();

    await nitro.deployed();
  });

  const initialOutcome: Exit = [
    {
      asset: "0x0000000000000000000000000000000000000000",
      data: "0x",
      allocations: [
        {
          destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
          amount: "0x05",
          callTo: "0x0000000000000000000000000000000000000000",
          data: "0x",
        },
        {
          destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
          amount: "0x05",
          callTo: "0x0000000000000000000000000000000000000000",
          data: "0x",
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

    expect(gasEstimate.toNumber()).to.equal(45780);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(rehydrateExit(updatedOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: BigNumber.from("0x05"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: BigNumber.from("0x04"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);

    expect(rehydrateExit(exit)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: BigNumber.from("0x01"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
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

    expect(gasEstimate.toNumber()).to.equal(47212);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(0)]);

    expect(rehydrateExit(updatedOutcome)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: BigNumber.from("0x0"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: BigNumber.from("0x04"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);

    expect(rehydrateExit(exit)).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: BigNumber.from("0x5"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: BigNumber.from("0x01"),
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
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
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: "0x05",
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: "0x05",
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: "0x",
          },
        ],
      },
    ];

    const exitRequest = [[]];

    await expect(nitro.transfer(guarantee, initialHoldings, exitRequest)).to.be
      .reverted;
  });
});
