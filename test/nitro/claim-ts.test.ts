const { expect } = require("chai");
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { claim } from "../../nitro-src/claim";
import {
  encodeGuaranteeData,
  MAGIC_VALUE_DENOTING_A_GUARANTEE,
} from "../../nitro-src/nitro-types";
import { Exit } from "../../src/types";
const { ethers } = require("hardhat");

describe("claim (typescript)", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const A_ADDRESS = "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f";
  const B_ADDRESS = "0x53484E75151D07FfD885159d4CF014B874cd2810";
  const TARGET_CHANNEL_ADDRESS = "0x080678731247781ff0d57c649b6d0ad1a0620df0"; // At some point in the full claim operation, the outcome of this channel must be read and checked
  const ANOTHER_TARGET_CHANNEL_ADDRESS =
    "0x27592B3827907B54684E4f9da3d988263828893D"; // At some point in the full claim operation, the outcome of this channel must be read and checked
  const I_ADDRESS = "0x7ab853663C531EaA080d84091AD0E0e985c688C7";

  const createOutcome = (
    allocations: ["A" | "B" | "I", BigNumberish][]
  ): Exit => {
    return [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: allocations.map((a) => ({
          destination:
            a[0] === "A" ? A_ADDRESS : a[0] === "B" ? B_ADDRESS : I_ADDRESS,
          amount: BigNumber.from(a[1]).toHexString(),
          callTo: ZERO_ADDRESS,
          data: "0x",
        })),
      },
    ];
  };

  it("Can handle an underfunded claim", async function () {
    const initialOutcomeForTargetChannel = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const initialOutcomeForAnotherChannel = createOutcome([["A", "0x03"]]);

    const guarantee: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: ANOTHER_TARGET_CHANNEL_ADDRESS,
            amount: "0x03",
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(A_ADDRESS, B_ADDRESS),
          },
          {
            destination: TARGET_CHANNEL_ADDRESS,
            amount: "0x0A", // This should be the total of the allocations in the target channel
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(A_ADDRESS, I_ADDRESS, B_ADDRESS),
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const firstClaim = claim(
      guarantee,
      initialHoldings,
      1,
      initialOutcomeForTargetChannel,
      exitRequest
    );

    const secondClaim = claim(
      guarantee,
      firstClaim.updatedHoldings, // The holdings will be updated by the first claim
      0,
      initialOutcomeForAnotherChannel,
      exitRequest
    );

    expect(firstClaim.updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x02"],
        ["B", "0x05"],
        ["I", "0x0A"],
      ])
    );
    expect(firstClaim.exit).to.deep.equal(createOutcome([["A", "0x03"]]));
    expect(firstClaim.updatedHoldings).to.deep.equal([BigNumber.from(3)]);

    expect(secondClaim.updatedTargetOutcome).to.deep.equal(
      createOutcome([["A", "0x00"]])
    );
    expect(secondClaim.exit).to.deep.equal(createOutcome([["A", "0x03"]]));
    expect(secondClaim.updatedHoldings).to.deep.equal([BigNumber.from(0)]);
  });

  it("Can claim with no exit requests", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);

    const guarantee: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: TARGET_CHANNEL_ADDRESS,
            amount: "0x0A", // This should be the total of the allocations in the target channel
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(A_ADDRESS, I_ADDRESS, B_ADDRESS),
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const { updatedHoldings, updatedTargetOutcome, exit } = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(0)]);

    expect(updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x00"],
        ["B", "0x05"],
        ["I", "0x09"],
      ])
    );

    expect(exit).to.deep.equal(
      createOutcome([
        ["A", "0x05"],
        ["I", "0x01"],
      ])
    );
  });

  it("Can claim with an empty exit request", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);

    const guarantee: Exit = [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: [
          {
            destination: TARGET_CHANNEL_ADDRESS,
            amount: "0x0A", // This should be the total of the allocations in the target channel
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(A_ADDRESS, I_ADDRESS, B_ADDRESS),
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[2]];

    const { updatedHoldings, updatedTargetOutcome, exit } = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x05"],
        ["B", "0x05"],
        ["I", "0x09"],
      ])
    );

    expect(exit).to.deep.equal(createOutcome([["I", "0x01"]]));
  });
});
