const { expect } = require("chai");
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { claim } from "../../nitro-src/claim";
import { encodeGuaranteeData } from "../../nitro-src/nitro-types";
import { AllocationType, Exit } from "../../src/types";
const { ethers } = require("hardhat");

describe("claim (typescript)", function () {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const A_ADDRESS = "0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f".toLowerCase();
  const B_ADDRESS = "0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810".toLowerCase();
  const CHANNEL_1 = "0x000000000000000000000000080678731247781ff0d57c649b6d0ad1a0620df0".toLowerCase(); // At some point in the full claim operation, the outcome of this channel must be read and checked
  const CHANNEL_2 = "0x00000000000000000000000027592B3827907B54684E4f9da3d988263828893D".toLowerCase(); // At some point in the full claim operation, the outcome of this channel must be read and checked
  const I_ADDRESS = "0x0000000000000000000000007ab853663C531EaA080d84091AD0E0e985c688C7".toLowerCase();

  const createGuarantee = (
    guarantees: ["C1" | "C2", BigNumberish, Array<"A" | "B" | "I">][]
  ): Exit => {
    return [
      {
        asset: ZERO_ADDRESS,
        metadata: "0x",
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
            allocationType: AllocationType.guarantee,
            metadata: encodeGuaranteeData(...guaranteeList),
          };
        }),
      },
    ];
  };
  const createOutcome = (
    allocations?: ["A" | "B" | "I", BigNumberish][]
  ): Exit => {
    return [
      {
        asset: ZERO_ADDRESS,
        metadata: "0x",
        allocations: allocations
          ? allocations.map((a) => ({
              destination:
                a[0] === "A" ? A_ADDRESS : a[0] === "B" ? B_ADDRESS : I_ADDRESS,
              amount: BigNumber.from(a[1]).toHexString(),
              allocationType: AllocationType.simple,
              metadata: "0x",
            }))
          : [],
      },
    ];
  };

  /**
   * One channel per guarantee tests
   * - guarantor_funding is the amount of funds deposited for the guarantor channel aka initialHoldings
   * - target_funding is the amount of funds the guarantee allots to the target channel
   * - outcome_sum is the sum of amounts in the outcome for destinations that are listed in the guarantee.
   */

  it("guarantor_funding == target_funding < outcome_sum, pay out 1 destination", async function () {
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

    // Now, let's try to claim for the second index. This test reuses values above. But we do not depend on the outcome of the first claim
    const claimResult2 = claim(guarantee, initialHoldings, 0, initialOutcome, [
      [1],
    ]);

    expect(claimResult2.updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x05"],
        ["B", "0x05"],
        ["I", "0x0A"],
      ])
    );

    expect(claimResult2.exit).to.deep.equal(createOutcome([]));
    expect(claimResult2.updatedHoldings).to.deep.equal([BigNumber.from(10)]);

    expect(claimResult2.updatedGuaranteeOutcome).to.deep.equal(
      createGuarantee([["C1", "0x0a", ["A", "I", "B"]]])
    );

    // Let's try to claim for a destination not part of the guarantee
    const guarantee3 = createGuarantee([["C1", "0x0a", ["I", "B"]]]);
    const claimResult3 = claim(guarantee3, initialHoldings, 0, initialOutcome, [
      [0],
    ]);

    expect(claimResult3.updatedTargetOutcome).to.deep.equal(
      createOutcome([
        ["A", "0x05"],
        ["B", "0x05"],
        ["I", "0x0A"],
      ])
    );
    expect(claimResult3.exit).to.deep.equal(createOutcome([]));
    expect(claimResult3.updatedHoldings).to.deep.equal([BigNumber.from(10)]);
    expect(claimResult3.updatedGuaranteeOutcome).to.deep.equal(guarantee3);
  });

  it("guarantor_funding > target_funding < outcome_sum, pay out all", async function () {
    const initialOutcome: Exit = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const guarantee = createGuarantee([["C1", "0x06", ["A", "I", "B"]]]);

    const initialHoldings = [BigNumber.from(10)];
    const exitRequest = [[]];

    const {
      updatedHoldings,
      updatedTargetOutcome,
      exit,
      updatedGuaranteeOutcome,
    } = claim(guarantee, initialHoldings, 0, initialOutcome, exitRequest);

    expect(updatedHoldings).to.deep.equal([BigNumber.from(4)]);

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

  it("guarantor_funding == target_funding < outcome_sum", async function () {
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

  /**
   * Multiple channel per guarantee test
   */
  it("Can handle an underfunded claim", async function () {
    const initialOutcomeForTargetChannel = createOutcome([
      ["A", "0x05"],
      ["B", "0x05"],
      ["I", "0x0A"],
    ]);
    const initialOutcomeForAnotherChannel = createOutcome([["A", "0x03"]]);
    const guarantee = createGuarantee([
      ["C1", "0x03", ["A"]],
      ["C2", "0x0A", ["A", "I", "B"]],
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
        ["C1", "0x03", ["A"]],
        ["C2", "0x07", ["A", "I", "B"]],
      ])
    );

    expect(secondClaim.updatedTargetOutcome).to.deep.equal(
      createOutcome([["A", "0x00"]])
    );
    expect(secondClaim.exit).to.deep.equal(createOutcome([["A", "0x03"]]));
    expect(secondClaim.updatedHoldings).to.deep.equal([BigNumber.from(0)]);
  });
});
