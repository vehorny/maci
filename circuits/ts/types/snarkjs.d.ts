declare module "snarkjs" {
  export type NumericString = `${number}` | string;
  export type PublicSignals = Record<string, string | bigint | bigint[] | string[]>;
  export type BigNumberish = number | string | bigint;

  export interface ISnarkJSVerificationKey {
    protocol: BigNumberish;
    curve: BigNumberish;
    nPublic: BigNumberish;
    vk_alpha_1: BigNumberish[];
    vk_beta_2: BigNumberish[][];
    vk_gamma_2: BigNumberish[][];
    vk_delta_2: BigNumberish[][];
    vk_alphabeta_12: BigNumberish[][][];
    IC: BigNumberish[][];
  }

  export interface FullProveResult {
    proof: Groth16Proof;
    publicSignals: PublicSignals;
  }

  export interface Groth16Proof {
    pi_a: NumericString[];
    pi_b: NumericString[][];
    pi_c: NumericString[];
    protocol: string;
    curve: string;
  }

  export namespace zKey {
    function exportVerificationKey(zkeyName: string, logger?: any): Promise<ISnarkJSVerificationKey>;
  }

  export namespace groth16 {
    function verify(
      vk_verifier: ISnarkJSVerificationKey,
      publicSignals: PublicSignals,
      proof: Groth16Proof,
      logger?: any,
    ): Promise<boolean>;
    function fullProve(
      input: PublicSignals,
      wasmFile: string,
      zkeyFileName: string,
      logger?: any,
    ): Promise<FullProveResult>;
  }
}
