import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { zKey, groth16, FullProveResult, PublicSignals, Groth16Proof, ISnarkJSVerificationKey } from "snarkjs";
import { stringifyBigInts } from "maci-crypto";
import { cleanThreads, isArm } from "./utils";
import { IGenProofOptions } from "./types";

/**
 * Generate a zk-SNARK proof
 * @dev if running on a intel chip we use rapidsnark for
 * speed - on the other hand if running on ARM we need to use
 * snark and a WASM witness
 * @param inputs - the inputs to the circuit
 * @param zkeyPath - the path to the zkey
 * @param rapidsnarkExePath - the path to the rapidnsark binary
 * @param witnessExePath - the path to the compiled witness binary
 * @param wasmPath - the path to the wasm witness
 * @param silent - whether we want to print to the console or not
 * @returns the zk-SNARK proof and public signals
 */
export const genProof = async ({
  inputs,
  zkeyPath,
  rapidsnarkExePath,
  witnessExePath,
  wasmPath,
  silent = false,
}: IGenProofOptions): Promise<FullProveResult> => {
  // if we are running on an arm chip we can use snarkjs directly
  if (isArm()) {
    const { proof, publicSignals } = await groth16.fullProve(inputs, wasmPath, zkeyPath);
    return { proof, publicSignals };
  }
  // intel chip flow (use rapidnsark)
  // Create tmp directory
  const tmpPath = path.resolve(tmpdir(), `tmp-${Date.now()}`);
  mkdirSync(tmpPath, { recursive: true });

  const inputJsonPath = path.resolve(tmpPath, "input.json");
  const outputWtnsPath = path.resolve(tmpPath, "output.wtns");
  const proofJsonPath = path.resolve(tmpPath, "proof.json");
  const publicJsonPath = path.resolve(tmpPath, "public.json");

  // Write input.json
  const jsonData = JSON.stringify(stringifyBigInts(inputs));
  writeFileSync(inputJsonPath, jsonData);

  // Generate the witness
  const witnessGenCmd = `${witnessExePath} ${inputJsonPath} ${outputWtnsPath}`;

  execSync(witnessGenCmd, { stdio: silent ? "ignore" : "pipe" });

  if (!existsSync(outputWtnsPath)) {
    throw new Error("Error executing " + witnessGenCmd);
  }

  // Generate the proof
  const proofGenCmd = `${rapidsnarkExePath} ${zkeyPath} ${outputWtnsPath} ${proofJsonPath} ${publicJsonPath}`;

  execSync(proofGenCmd, { stdio: silent ? "ignore" : "pipe" });

  if (!existsSync(proofJsonPath)) {
    throw new Error("Error executing " + proofGenCmd);
  }

  // Read the proof and public inputs
  const proof = JSON.parse(readFileSync(proofJsonPath).toString()) as Groth16Proof;
  const publicSignals = JSON.parse(readFileSync(publicJsonPath).toString()) as PublicSignals;

  // remove all artifacts
  for (const f of [proofJsonPath, publicJsonPath, inputJsonPath, outputWtnsPath]) if (existsSync(f)) unlinkSync(f);

  // remove tmp directory
  rmdirSync(tmpPath);

  return { proof, publicSignals };
};

/**
 * Verify a zk-SNARK proof using snarkjs
 * @param publicInputs - the public inputs to the circuit
 * @param proof - the proof
 * @param vk - the verification key
 * @returns whether the proof is valid or not
 */
export const verifyProof = async (
  publicInputs: PublicSignals,
  proof: Groth16Proof,
  vk: ISnarkJSVerificationKey,
): Promise<boolean> => {
  const isValid = await groth16.verify(vk, publicInputs, proof);
  await cleanThreads();
  return isValid;
};

/**
 * Extract the Verification Key from a zKey
 * @param zkeyPath - the path to the zKey
 * @returns the verification key
 */
export const extractVk = async (zkeyPath: string): Promise<ISnarkJSVerificationKey> => {
  const vk = await zKey.exportVerificationKey(zkeyPath);
  await cleanThreads();
  return vk;
};
