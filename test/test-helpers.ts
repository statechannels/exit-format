// @ts-nocheck
// this is a hack to get around the way ethers presents the result
const { ethers } = require("hardhat");
import {
  SingleAssetExit,
  AllocationType,
  NullAssetMetadata,
} from "../src/types";

import { Result } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";

// TODO can we get at the raw data returned from the eth_call?
export function rehydrateExit(exitResult: Result) {
  return exitResult.map((entry) => {
    const object = {};
    Object.keys(entry).forEach((key) => {
      if (key == "allocations") {
        object[key] = entry[key].map((allocation) => ({
          destination: allocation[0],
          amount: BigNumber.from(allocation[1]),
          allocationType: allocation[2],
          metadata: allocation[3],
        }));
      } else if (Number(key) !== Number(key)) object[key] = entry[key];
    });
    return object;
  });
}

interface MakeSimpleExitParameters {
  asset: string;
  destination: string;
  amount: number;
  assetMetadata: AssetMetadata;
}

export function makeSimpleExit({
  asset,
  destination,
  amount,
  assetMetadata,
}: MakeSimpleExitParameters): SingleAssetExit {
  return {
    asset,
    assetMetadata,
    allocations: [
      {
        destination: "0x000000000000000000000000" + destination.slice(2), // padded alice
        amount,
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ],
  };
}

export async function deployERC20(deployer: any, initialSupply: number) {
  let erc20Token = await (
    await ethers.getContractFactory("TestERC20", deployer)
  ).deploy(initialSupply);
  await erc20Token.deployed();
  return erc20Token;
}

export async function deployERC721(deployer: any) {
  let erc721Collection = await (
    await ethers.getContractFactory("TestERC721", deployer)
  ).deploy();
  await erc721Collection.deployed();
  return erc721Collection;
}

export async function deployERC1155(deployer: any, initialSupply: number) {
  let erc1155Collection = await (
    await ethers.getContractFactory("TestERC1155", deployer)
  ).deploy(initialSupply);
  await erc1155Collection.deployed();
  return erc1155Collection;
}
