const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { Result, RLP } from "ethers/lib/utils";
import { Exit } from "../ts/types";
const { ethers } = require("hardhat");
import { TestConsumer } from "../typechain/TestConsumer";

describe("transfer (solidity)", function () {
  let testConsumer: TestConsumer;

  before(async () => {
    testConsumer = await (
      await ethers.getContractFactory("TestConsumer")
    ).deploy();

    await testConsumer.deployed();
  });

  it("Can transfer", async function () {
    const initialOutcome: Exit = [
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: "0x05",
            callTo: "0x0000000000000000000000000000000000000000",
            callData: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: "0x05",
            callTo: "0x0000000000000000000000000000000000000000",
            callData: "0x",
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const indices = [[1]];

    const {
      updatedHoldings,
      updatedOutcome,
      exit,
    } = await testConsumer.transfer(initialOutcome, initialHoldings, indices);

    const gasEstimate = await testConsumer.estimateGas.transfer(
      initialOutcome,
      initialHoldings,
      indices
    );

    expect(gasEstimate.toNumber()).to.equal(45801);

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
            callData: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: BigNumber.from("0x04"),
            callTo: "0x0000000000000000000000000000000000000000",
            callData: "0x",
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
            callData: "0x",
          },
        ],
      },
    ]);
  });
});

// this is a hack to get around the way ethers presents the result
// TODO can we get at the raw data returned from the eth_call?
function rehydrateExit(exitResult: Result) {
  return exitResult.map((entry) => {
    const object = {};
    Object.keys(entry).forEach((key) => {
      if (key == "allocations") {
        object[key] = entry[key].map((allocation) => ({
          destination: allocation[0],
          amount: BigNumber.from(allocation[1]),
          callTo: allocation[2],
          callData: allocation[3],
        }));
      } else if (Number(key) !== Number(key)) object[key] = entry[key];
    });
    return object;
  });
}
