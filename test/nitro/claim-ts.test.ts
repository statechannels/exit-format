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
  const CHANNEL_1 = "0x080678731247781ff0d57c649b6d0ad1a0620df0"; // At some point in the full claim operation, the outcome of this channel must be read and checked
  const CHANNEL_2 = "0x27592B3827907B54684E4f9da3d988263828893D"; // At some point in the full claim operation, the outcome of this channel must be read and checked
  const I_ADDRESS = "0x7ab853663C531EaA080d84091AD0E0e985c688C7";

  const createGuarantee = (
    guarantees: ["C1" | "C2", BigNumberish, Array<"A" | "B" | "I">][]
  ): Exit => {
    return [
      {
        asset: ZERO_ADDRESS,
        data: "0x",
        allocations: guarantees.map((g) => {
          const guaranteeList = g[2].map(
            (p) =>
              (p === "A"
                ? A_ADDRESS
                : p === "B"
                ? B_ADDRESS
                : I_ADDRESS) as string
          );

          return {
            destination: g[0] === "C1" ? CHANNEL_1 : CHANNEL_2,
            amount: BigNumber.from(g[1]).toHexString(),
            callTo: MAGIC_VALUE_DENOTING_A_GUARANTEE,
            data: encodeGuaranteeData(...guaranteeList),
          };
        }),
      },
    ];
  };
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

  it("correctly calculates the exit when the payout is less than the holdings", async function () {
    const initialOutcome = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);

    const guarantee = createGuarantee([["C1", "0x0A", ["A", "I", "B"]]]);

    const initialHoldings = [BigNumber.from(10)];
    const exitRequest = [[0]];

    const claimResult = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );

    expect(claimResult.updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x00"],
        ["B", "0x05"],
        ["I", "0x0A"],
      ])
    );
    expect(claimResult.exit).to.deep.equal(createOutcome([["A", "0x05"]]));
    expect(claimResult.updatedHoldings).to.deep.equal([BigNumber.from(5)]);

    expect(claimResult.updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([["C1", "0x05", ["A", "I", "B"]]])
    );
  });

  it("Can handle an underfunded claim", async function () {
    const initialOutcomeForTargetChannel = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const initialOutcomeForAnotherChannel = createOutcome([["A", "0x03"]]);
    const guarantee = createGuarantee([
      ["C2", "0x03", ["A"]],
      ["C1", "0x0A", ["A", "I", "B"]],
    ]);

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
      firstClaim.updatedGuaranteeOutcome,
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

    expect(firstClaim.updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([
        ["C2", "0x03", ["A"]],
        ["C1", "0x07", ["A", "I", "B"]],
      ])
    );

    expect(secondClaim.updatedTargetOutcome).to.deep.equal(
      createOutcome([["A", "0x00"]])
    );
    expect(secondClaim.exit).to.deep.equal(createOutcome([["A", "0x03"]]));
    expect(secondClaim.updatedHoldings).to.deep.equal([BigNumber.from(0)]);
  });

  it("Can claim with a surplus of funds", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const guarantee = createGuarantee([["C1", "0x06", ["A", "I", "B"]]]);

    const initialHoldings = [BigNumber.from(1000)]; // Enough funds for everyone
    const exitRequest = [[]];

    const {
      updatedHoldings,
      updatedTargetOutcome,
      exit,
      updatedGuaranteeOutcome,
    } = claim(guarantee, initialHoldings, 0, initialOutcome, exitRequest);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(980)]);

    expect(updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x00"],
        ["B", "0x00"],
        ["I", "0x00"],
      ])
    );

    // Since there are lots of funds everything gets funded
    expect(exit).to.deep.equal(
      createOutcome([
        ["A", "0x05"],
        ["I", "0x0A"],
        ["B", "0x05"],
      ])
    );

    expect(updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([["C1", "0x00", ["A", "I", "B"]]])
    );
  });
  it("Can claim with no exit requests", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const guarantee = createGuarantee([["C1", "0x06", ["A", "I", "B"]]]);

    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const {
      updatedHoldings,
      updatedTargetOutcome,
      exit,
      updatedGuaranteeOutcome,
    } = claim(guarantee, initialHoldings, 0, initialOutcome, exitRequest);

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

    expect(updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([["C1", "0x00", ["A", "I", "B"]]])
    );
  });

  it("Can claim with an empty exit request", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);

    const guarantee: Exit = createGuarantee([["C1", "0x06", ["A", "I", "B"]]]);

    const initialHoldings = [BigNumber.from(6)];
    const exitRequest = [[]];

    const claimResult = claim(
      guarantee,
      initialHoldings,
      0,
      initialOutcome,
      exitRequest
    );
    const {
      updatedHoldings,
      updatedTargetOutcome,
      exit,
      updatedGuaranteeOutcome,
    } = claimResult;

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
    expect(updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([["C1", "0x00", ["A", "I", "B"]]])
    );
  });
});
