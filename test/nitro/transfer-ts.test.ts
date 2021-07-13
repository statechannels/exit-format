const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { transfer } from "../../nitro-src/transfer";
import { AllocationType, Exit } from "../../src/types";

const destinations = {
  alice: "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f",
  bob: "0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810",
};

describe("transfer (typescript)", function () {
  it("Can transfer", async function () {
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
    const exitRequest = [[1]];

    const { updatedHoldings, updatedOutcome, exit } = transfer(
      initialOutcome,
      initialHoldings,
      exitRequest
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(updatedOutcome).to.deep.equal([
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
            amount: "0x04",
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ]);

    expect(exit).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        metadata: "0x",
        allocations: [
          {
            destination: destinations.bob,
            amount: "0x01",
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

    await expect(() =>
      transfer(guarantee, initialHoldings, exitRequest)
    ).to.throw();
  });
});
