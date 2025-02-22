import { expect } from "chai";
import { BigNumberish } from "ethers";
import { genRandomSalt } from "maci-crypto";

import { deployPoseidonContracts, linkPoseidonLibraries } from "../ts/deploy";
import { HasherBenchmarks } from "../typechain-types";

require("module-alias/register");

describe("Hasher", () => {
  let hasherContract: HasherBenchmarks;
  before(async () => {
    const { PoseidonT3Contract, PoseidonT4Contract, PoseidonT5Contract, PoseidonT6Contract } =
      await deployPoseidonContracts(true);
    const [poseidonT3ContractAddress, poseidonT4ContractAddress, poseidonT5ContractAddress, poseidonT6ContractAddress] =
      await Promise.all([
        PoseidonT3Contract.getAddress(),
        PoseidonT4Contract.getAddress(),
        PoseidonT5Contract.getAddress(),
        PoseidonT6Contract.getAddress(),
      ]);
    // Link Poseidon contracts
    const hasherContractFactory = await linkPoseidonLibraries(
      "HasherBenchmarks",
      poseidonT3ContractAddress,
      poseidonT4ContractAddress,
      poseidonT5ContractAddress,
      poseidonT6ContractAddress,
      true,
    );

    hasherContract = (await hasherContractFactory.deploy()) as HasherBenchmarks;
    await hasherContract.deploymentTransaction()?.wait();
  });

  it("hashLeftRight", async () => {
    const left = genRandomSalt();
    const right = genRandomSalt();

    const tx = await hasherContract.hashLeftRightBenchmark(left.toString(), right.toString());
    const receipt = await tx.wait();

    expect(receipt).to.not.eq(null);
    expect(receipt?.gasUsed.toString()).to.not.eq("");
    expect(receipt?.gasUsed.toString()).to.not.eq("0");
  });

  it("hash5", async () => {
    const values = [];

    for (let i = 0; i < 5; i += 1) {
      values.push(genRandomSalt().toString());
    }

    const tx = await hasherContract.hash5Benchmark(
      values as [BigNumberish, BigNumberish, BigNumberish, BigNumberish, BigNumberish],
    );
    const receipt = await tx.wait();

    expect(receipt).to.not.eq(null);
    expect(receipt?.gasUsed.toString()).to.not.eq("");
    expect(receipt?.gasUsed.toString()).to.not.eq("0");
  });
});
