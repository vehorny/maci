import { stringifyBigInts } from "maci-crypto";
import path from "path";
import { expect } from "chai";
import tester from "circom_tester";
import { getSignal } from "./utils/utils";

describe("Splice circuit", () => {
  let circuit: tester.WasmTester;
  before(async () => {
    const circuitPath = path.resolve(__dirname, "../../circom/test", `splicer_test.circom`);
    circuit = await tester.wasm(circuitPath);
  });

  it("Should output the correct reconstructed level", async () => {
    for (let index = 0; index < 5; index++) {
      const items = [0, 20, 30, 40];
      const leaf = 10;
      const circuitInputs = stringifyBigInts({ in: items, leaf, index });

      const witness = await circuit.calculateWitness(circuitInputs);
      await circuit.checkConstraints(witness);

      const output: bigint[] = [];
      for (let i = 0; i < items.length + 1; i++) {
        const selected = await getSignal(circuit, witness, `out[${i}]`);
        output.push(BigInt(selected));
      }
      items.splice(index, 0, leaf);

      expect(JSON.stringify(stringifyBigInts(items.map(BigInt)))).to.be.eq(
        JSON.stringify(stringifyBigInts(output.map(String))),
      );
    }
  });
});
