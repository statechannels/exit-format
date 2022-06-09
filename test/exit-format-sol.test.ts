const { expect } = require("chai");
const { ethers } = require("hardhat");
import { BigNumber, Wallet } from "ethers";
import {
  Allocation,
  AllocationType,
  Exit,
  SingleAssetExit,
} from "../src/types";
import { makeERC1155ExitMetadata } from "../src/metadata";
import { TestConsumer } from "../typechain/TestConsumer";
import { makeSimpleExit } from "./test-helpers";

async function deployERC20(deployer: any, initialSupply: number) {
  let erc20Token = await (
    await ethers.getContractFactory("TestERC20", deployer)
  ).deploy(initialSupply);
  await erc20Token.deployed();
  return erc20Token;
}

async function deployERC1155(deployer: any, initialSupply: number) {
  let erc1155Collection = await (
    await ethers.getContractFactory("TestERC1155", deployer)
  ).deploy(initialSupply);
  await erc1155Collection.deployed();
  return erc1155Collection;
}

describe("ExitFormat (solidity)", function () {
  let testConsumer: TestConsumer;

  before(async () => {
    testConsumer = await (
      await ethers.getContractFactory("TestConsumer")
    ).deploy();

    await testConsumer.deployed();
  });

  it("Can encode an allocation", async function () {
    const allocation: Allocation = {
      destination:
        "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f",
      amount: "0x01",
      allocationType: AllocationType.simple,
      metadata: "0x",
    };
    const encodedAllocation = await testConsumer.encodeAllocation(allocation);

    expect(encodedAllocation).to.eq(
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("Can encode an exit", async function () {
    const exit: Exit = [
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination:
              "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: "0x01",
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ];
    const encodedExit = await testConsumer.encodeExit(exit);

    expect(encodedExit).to.eq(
      "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("Can compare exits for equality", async function () {
    const allocations: Allocation[] = [
      {
        destination:
          "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f",
        amount: "0x01",
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ];

    const assetA = "0x0000000000000000000000000000000000000000";
    const assetC = "0x0000000000000000000000000000000000000001";

    const exitA: Exit = [
      {
        asset: assetA,
        metadata: "0x",
        allocations,
      },
    ];

    const exitB: Exit = [
      {
        asset: assetA,
        metadata: "0x",
        allocations,
      },
    ];

    const exitC: Exit = [
      {
        asset: assetC,
        metadata: "0x",
        allocations,
      },
    ];
    const exitsABequal = await testConsumer.exitsEqual(exitA, exitB);
    const exitsACequal = await testConsumer.exitsEqual(exitA, exitC);
    expect(exitsABequal).to.be.true;
    expect(exitsACequal).to.be.false;
  });

  it("Can execute a single asset exit and a whole exit", async function () {
    const amount = "0x01";

    // We will deposit twice the amount, because we want to test two different ways of executing the exit
    const totalDeposit = BigNumber.from(amount).mul(2).toHexString();

    const alice = new Wallet(
      "0x68d3e3134e2b3488ad249233f8fa77ea040bbb6434ea28e4acde7db082665c4c"
    );

    const singleAssetExit: SingleAssetExit = {
      asset: "0x0000000000000000000000000000000000000000",
      metadata: "0x",
      allocations: [
        {
          destination: "0x000000000000000000000000" + alice.address.slice(2), // padded alice
          amount,
          allocationType: AllocationType.simple,
          metadata: "0x",
        },
      ],
    };

    await testConsumer.signer.sendTransaction({
      to: testConsumer.address,
      value: totalDeposit,
    }); // send some money to testConsumer

    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();

    expect(await testConsumer.provider.getBalance(alice.address)).to.equal(
      amount
    );

    await (await testConsumer.executeExit([singleAssetExit])).wait();

    expect(await testConsumer.provider.getBalance(alice.address)).to.equal(
      BigNumber.from(amount).mul(2)
    );
  });

  it("Can execute a single ERC20 asset exit", async function () {
    const [alice] = await ethers.getSigners();

    // Alice gets all of the initial minting of tokens
    let initialSupply = ethers.utils.parseEther((1000).toString());
    let erc20Token = await deployERC20(alice, initialSupply);

    // Alice transfers all tokens to the TestConsumer
    await erc20Token
      .connect(alice)
      .transfer(testConsumer.address, initialSupply);
    expect(await erc20Token.balanceOf(alice.address)).to.equal(0);
    expect(await erc20Token.balanceOf(testConsumer.address)).to.equal(
      initialSupply
    );

    // an exit referring to the token contract
    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc20Token.address,
      destination: alice.address,
      amount: initialSupply,
    });

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc20Token.balanceOf(alice.address)).to.equal(initialSupply);
    expect(await erc20Token.balanceOf(testConsumer.address)).to.equal(0);
  });

  it("Can execute a single ERC1155 asset exit", async function () {
    const [alice] = await ethers.getSigners();
    const tokenId = 11;

    // Alice gets all of the initial minting of tokens
    let initialSupply = ethers.utils.parseEther((1000).toString());
    let erc1155Collection = await deployERC1155(alice, initialSupply);

    // Alice transfers all tokens to the TestConsumer
    await erc1155Collection.safeTransferFrom(
      alice.address,
      testConsumer.address,
      tokenId,
      initialSupply,
      "0x"
    );
    expect(await erc1155Collection.balanceOf(alice.address, tokenId)).to.equal(
      0
    );
    expect(
      await erc1155Collection.balanceOf(testConsumer.address, tokenId)
    ).to.equal(initialSupply);

    // an exit referring to the token contract
    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc1155Collection.address,
      destination: alice.address,
      amount: initialSupply,
      metadata: makeERC1155ExitMetadata(tokenId),
    });

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc1155Collection.balanceOf(alice.address, tokenId)).to.equal(
      initialSupply
    );
    expect(
      await erc1155Collection.balanceOf(testConsumer.address, tokenId)
    ).to.equal(0);
  });

  it("Can execute a multiple token asset exits from the same collection", async function () {
    const [alice] = await ethers.getSigners();
    const tokenAId = 11;
    const tokenBId = 22;

    // Alice gets all of the initial minting of tokens
    let initialSupply = ethers.utils.parseEther((1000).toString());
    let erc1155Collection = await deployERC1155(alice, initialSupply);

    // Alice transfers all tokens to the TestConsumer
    await erc1155Collection.safeTransferFrom(
      alice.address,
      testConsumer.address,
      tokenAId,
      initialSupply,
      "0x"
    );
    await erc1155Collection.safeTransferFrom(
      alice.address,
      testConsumer.address,
      tokenBId,
      initialSupply,
      "0x"
    );

    expect(
      await erc1155Collection.balanceOf(testConsumer.address, tokenAId)
    ).to.equal(initialSupply);
    expect(
      await erc1155Collection.balanceOf(testConsumer.address, tokenBId)
    ).to.equal(initialSupply);

    // an exit referring to the token contract
    const exit: Exit = [
      makeSimpleExit({
        asset: erc1155Collection.address,
        destination: alice.address,
        amount: initialSupply,
        metadata: makeERC1155ExitMetadata(tokenAId),
      }),
      makeSimpleExit({
        asset: erc1155Collection.address,
        destination: alice.address,
        amount: initialSupply,
        metadata: makeERC1155ExitMetadata(tokenBId),
      }),
    ];

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeExit(exit)).wait();
    expect(await erc1155Collection.balanceOf(alice.address, tokenAId)).to.equal(
      initialSupply
    );
    expect(await erc1155Collection.balanceOf(alice.address, tokenBId)).to.equal(
      initialSupply
    );
  });
});
