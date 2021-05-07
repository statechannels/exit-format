const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { claim } from "../ts/claim";
import {
  encodeGuaranteeData,
  MAGIC_VALUE_DENOTING_A_GUARANTEE,
} from "../ts/nitro-types";
import { Exit } from "../ts/types";
const { ethers } = require("hardhat");

describe("claim (typescript)", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const A_ADDRESS = "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f";
  const B_ADDRESS = "0x53484E75151D07FfD885159d4CF014B874cd2810";
  const TARGET_CHANNEL_ADDRESS = "0x080678731247781ff0d57c649b6d0ad1a0620df0"; // At some point in the full claim operation, the outcome of this channel must be read and checked

  it("Can claim with no exit requests", async function () {
    const initialOutcome: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: A_ADDRESS,
            amount: "0x05",
            callTo: ZERO_ADDRESS,
            data: "0x",
          },
          {
            destination: B_ADDRESS,
            amount: "0x05",
            callTo: ZERO_ADDRESS,
            data: "0x",
          },
        ],
      },
    ];

    const guarantee: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: TARGET_CHANNEL_ADDRESS,
            amount: "0x00",
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(
              "0x53484E75151D07FfD885159d4CF014B874cd2810",
              "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f"
            ),
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const indices = [[]];

    const { updatedHoldings, updatedTargetOutcome, exit } = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      indices
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(0)]);

    expect(updatedTargetOutcome).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: A_ADDRESS,
            amount: "0x04",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
          {
            destination: B_ADDRESS,
            amount: "0x00", // TODO: It would be nice if these were stripped out
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);

    expect(exit).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: B_ADDRESS,
            amount: "0x05",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },

          {
            destination: A_ADDRESS,
            amount: "0x01",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);
  });

  it("Can claim with exit requests", async function () {
    const initialOutcome: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: A_ADDRESS,
            amount: "0x05",
            callTo: ZERO_ADDRESS,
            data: "0x",
          },
          {
            destination: B_ADDRESS,
            amount: "0x05",
            callTo: ZERO_ADDRESS,
            data: "0x",
          },
        ],
      },
    ];

    const guarantee: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: ZERO_ADDRESS, // TODO: What should this be?
            amount: "0x00",
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(
              "0x53484E75151D07FfD885159d4CF014B874cd2810",
              "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f"
            ),
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const indices = [[1]];

    const { updatedHoldings, updatedTargetOutcome, exit } = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      indices
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(1)]);

    expect(updatedTargetOutcome).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: A_ADDRESS,
            amount: "0x05",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
          {
            destination: B_ADDRESS,
            amount: "0x00",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);

    expect(exit).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: B_ADDRESS,
            amount: "0x05",
            callTo: "0x0000000000000000000000000000000000000000",
            data: "0x",
          },
        ],
      },
    ]);
  });
});
