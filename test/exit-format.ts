const { expect } = require("chai");
const { ethers } = require("hardhat");
import { TestConsumer } from "../typechain/TestConsumer";

describe("ExitFormat", function () {
  let testConsumer: TestConsumer;

  before(async () => {
    const exitFormat = await (
      await ethers.getContractFactory("ExitFormat")
    ).deploy();

    await exitFormat.deployed();

    testConsumer = await (
      await ethers.getContractFactory("TestConsumer", {
        libraries: {
          ExitFormat: exitFormat.address,
        },
      })
    ).deploy();

    await testConsumer.deployed();
  });

  it("Can encode an allocation", async function () {
    const encodedAllocation = await testConsumer.encodeAllocation({
      destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
      amount: "0x01",
      data: "0x",
    });

    expect(encodedAllocation).to.eq(
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  });

});
