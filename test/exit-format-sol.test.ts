const { expect } = require("chai");
const { ethers } = require("hardhat");
import { BigNumber, Wallet } from "ethers";
import {
  Allocation,
  AllocationType,
  Exit,
  NullAssetMetadata,
  SingleAssetExit,
  AssetType,
} from "../src/types";
import { makeTokenIdExitMetadata } from "../src/token-id-metadata";
import { TestConsumer } from "../typechain/TestConsumer";
import { makeSimpleExit } from "./test-helpers";
import {
  deployERC20,
  deployERC721,
  deployERC1155,
  getQualifiedSAE,
} from "./test-helpers";
import { AbiCoder, defaultAbiCoder } from "ethers/lib/utils";

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
        assetMetadata: NullAssetMetadata,
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
      "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
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
        assetMetadata: NullAssetMetadata,
        allocations,
      },
    ];

    const exitB: Exit = [
      {
        asset: assetA,
        assetMetadata: NullAssetMetadata,
        allocations,
      },
    ];

    const exitC: Exit = [
      {
        asset: assetC,
        assetMetadata: NullAssetMetadata,
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
      assetMetadata: NullAssetMetadata,
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
      assetMetadata: {
        assetType: AssetType.ERC20,
        metadata: "0x",
      },
    });

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc20Token.balanceOf(alice.address)).to.equal(initialSupply);
    expect(await erc20Token.balanceOf(testConsumer.address)).to.equal(0);
  });

  it("Can execute a single ERC721 asset exit", async function () {
    const [alice] = await ethers.getSigners();
    const tokenId = 11;

    // Alice gets all of the initial minting of tokens
    let erc721Collection = await deployERC721(alice);

    // Alice transfers all tokens to the TestConsumer
    await erc721Collection.transferFrom(
      alice.address,
      testConsumer.address,
      tokenId
    );
    expect(await erc721Collection.ownerOf(tokenId)).to.equal(
      testConsumer.address
    );

    // an exit referring to the token contract
    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.address,
      destination: alice.address,
      amount: 1,
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
    });

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc721Collection.ownerOf(tokenId)).to.equal(alice.address);
  });

  it("ERC721 exits with amount != 1 fail", async function () {
    const [alice] = await ethers.getSigners();
    let erc721Collection = await deployERC721(alice);
    const tokenId = 11;

    // an exit referring to the token contract with an amount > 1
    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.address,
      destination: alice.address,
      amount: 10, // <- this needs to be 1 for ERC721 exits
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
    });

    await expect(
      testConsumer.executeSingleAssetExit(singleAssetExit)
    ).to.be.revertedWith("Amount must be 1 for an ERC721 exit");
  });

  it("ERC721 exits with invalid tokenId", async function () {
    const [alice] = await ethers.getSigners();
    let erc721Collection = await deployERC721(alice);
    const invalidTokenId = 999;

    // an exit referring to the invalid token ID
    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.address,
      destination: alice.address,
      amount: 1,
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(invalidTokenId),
      },
    });

    await expect(
      testConsumer.executeSingleAssetExit(singleAssetExit)
    ).to.be.revertedWith("operator query for nonexistent token");
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
      assetMetadata: {
        assetType: AssetType.ERC1155,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
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
        assetMetadata: {
          assetType: AssetType.ERC1155,
          metadata: makeTokenIdExitMetadata(tokenAId),
        },
      }),
      makeSimpleExit({
        asset: erc1155Collection.address,
        destination: alice.address,
        amount: initialSupply,
        assetMetadata: {
          assetType: AssetType.ERC1155,
          metadata: makeTokenIdExitMetadata(tokenBId),
        },
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

  it("Correctly interprets qualified assets", async function () {
    const amount = "0x01";
    const zero = "0x00";

    // deposit some native asset into the test consumer
    await testConsumer.signer.sendTransaction({
      to: testConsumer.address,
      value: BigNumber.from(amount).toHexString(),
    });

    const alice = new Wallet(
      "0x68d3e3134e2b3488ad249233f8fa77ea040bbb6434ea28e4acde7db08200000a"
    );

    // Note: correct chainID is 31337 (default hardhat chainID)
    //       correct asset holder address is testConsumer.address

    // failure case
    const badChainID = getQualifiedSAE(
      1, // eth mainnet
      testConsumer.address,
      alice.address,
      amount
    );
    await (await testConsumer.executeSingleAssetExit(badChainID)).wait();
    expect(await testConsumer.provider.getBalance(alice.address)).to.equal(
      zero
    );

    // failure case
    const badAssetHolderAddress = getQualifiedSAE(
      31337,
      alice.address, // alice's address is not the asset holder's address
      alice.address,
      amount
    );
    await (
      await testConsumer.executeSingleAssetExit(badAssetHolderAddress)
    ).wait();
    expect(await testConsumer.provider.getBalance(alice.address)).to.equal(
      zero
    );

    // success case
    const correctlyQualifiedLocalAsset = getQualifiedSAE(
      31337,
      testConsumer.address,
      alice.address,
      amount
    );

    await (
      await testConsumer.executeSingleAssetExit(correctlyQualifiedLocalAsset)
    ).wait();
    expect(await testConsumer.provider.getBalance(alice.address)).to.equal(
      amount
    );
  });
});
