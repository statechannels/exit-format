const { expect } = require("chai");
import { BigNumber } from "@ethersproject/bignumber";
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
            amount: "0x04",
            callTo: "0x0000000000000000000000000000000000000000",
            callData: "0x",
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
            callTo: "0x0000000000000000000000000000000000000000",
            callData: "0x",
          },
        ],
      },
    ]);
  });
});
