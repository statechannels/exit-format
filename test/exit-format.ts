const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExitFormat", function () {
  it("Should return the new greeting once it's changed", async function () {
    const ExitFormat = await ethers.getContractFactory("ExitFormat");
    const exitFormat = await ExitFormat.deploy();

    await exitFormat.deployed();
  });
});
