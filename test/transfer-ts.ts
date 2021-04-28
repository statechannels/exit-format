const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
import { encodeExit } from "../ts/coders";
import { transfer } from "../ts/transfer";
import { Exit } from "../ts/types";

describe("transfer (typescript)", function () {
  it("Can transfer", async function () {
    const initialOutcome: Exit = [
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: "0x05",
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: "0x05",
            data: "0x",
          },
        ],
      },
    ];

    const initialHoldings = [BigNumber.from(6)];
    const indices = [[1]];

    const { updatedHoldings, updatedOutcome, exit } = transfer(
      initialOutcome,
      initialHoldings,
      indices
    );

    expect(updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(updatedOutcome).to.deep.equal([
      {
        asset: "0x0000000000000000000000000000000000000000",
        data: "0x",
        allocations: [
          {
            destination: "0x96f7123E3A80C9813eF50213ADEd0e4511CB820f",
            amount: "0x05",
            data: "0x",
          },
          {
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: "0x04",
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
            destination: "0x53484E75151D07FfD885159d4CF014B874cd2810",
            amount: "0x01",
            data: "0x",
          },
        ],
      },
    ]);
  });
});
