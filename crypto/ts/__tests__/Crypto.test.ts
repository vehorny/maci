import { expect } from "chai";

import {
  genPubKey,
  genKeypair,
  genEcdhSharedKey,
  encrypt,
  decrypt,
  sign,
  sha256Hash,
  hash5,
  hash13,
  verifySignature,
  genRandomSalt,
  SNARK_FIELD_SIZE,
  genTreeCommitment,
} from "..";

describe("Cryptographic operations", function test() {
  this.timeout(100000);

  const { privKey, pubKey } = genKeypair();
  const k = genKeypair();

  const privKey1 = k.privKey;
  const pubKey1 = k.pubKey;

  const ecdhSharedKey = genEcdhSharedKey(privKey, pubKey1);
  const ecdhSharedKey1 = genEcdhSharedKey(privKey1, pubKey);

  const plaintext: bigint[] = [];

  for (let i = 0; i < 5; i += 1) {
    plaintext.push(genRandomSalt());
  }

  const nonce = BigInt(123);

  const ciphertext = encrypt(plaintext, ecdhSharedKey, nonce);
  const decryptedCiphertext = decrypt(ciphertext, ecdhSharedKey, nonce, plaintext.length);

  describe("Hashing", () => {
    it("The hash of a plaintext should be smaller than the snark field size", () => {
      const h = hash5([0, 1, 2, 3, 4].map((x) => BigInt(x)));
      expect(h < SNARK_FIELD_SIZE).to.eq(true);

      const s = sha256Hash(plaintext);
      expect(s < SNARK_FIELD_SIZE).to.eq(true);
    });
  });

  describe("sha256Hash([0, 1])", () => {
    const s = sha256Hash([BigInt(0), BigInt(1)]);
    expect(s.toString()).to.eq("21788914573420223731318033363701224062123674814818143146813863227479480390499");
  });

  describe("hash13", () => {
    it("Hashing a smaller array should work", () => {
      const h = hash13([BigInt(1), BigInt(2), BigInt(3)]);
      expect(h < SNARK_FIELD_SIZE).to.eq(true);
    });

    it("Hashing more than 13 elements should throw", () => {
      const arr: bigint[] = [];

      for (let i = 0; i < 14; i += 1) {
        arr.push(BigInt(i));
      }

      expect(() => hash13(arr)).to.throw();
    });
  });

  describe("Public and private keys", () => {
    it("A private key should be smaller than the snark field size", () => {
      expect(privKey < SNARK_FIELD_SIZE).to.eq(true);
      // TODO: add tests to ensure that the prune buffer step worked
    });

    it("A public key's constitutent values should be smaller than the snark field size", () => {
      // TODO: Figure out if these checks are correct and enough
      expect(pubKey[0] < SNARK_FIELD_SIZE).to.eq(true);
      expect(pubKey[1] < SNARK_FIELD_SIZE).to.eq(true);
    });
  });

  describe("ECDH shared key generation", () => {
    it("The shared keys should match", () => {
      expect(ecdhSharedKey[0].toString()).to.eq(ecdhSharedKey1[0].toString());
      expect(ecdhSharedKey[1].toString()).to.eq(ecdhSharedKey1[1].toString());
    });

    it("A shared key should be smaller than the snark field size", () => {
      // TODO: Figure out if this check is correct and enough
      expect(ecdhSharedKey[0] < SNARK_FIELD_SIZE).to.eq(true);
      expect(ecdhSharedKey[1] < SNARK_FIELD_SIZE).to.eq(true);
    });
  });

  describe("Encryption and decryption", () => {
    it("The ciphertext should be of the correct format", () => {
      const expectedLength = plaintext.length <= 3 ? 4 : 1 + (plaintext.length % 3) * 3;

      expect(ciphertext.length).to.eq(expectedLength);
    });

    it("The ciphertext should differ from the plaintext", () => {
      for (let i = 0; i < plaintext.length; i += 1) {
        expect(plaintext[i] !== ciphertext[i + 1]).to.eq(true);
      }
    });

    it("The ciphertext should be smaller than the snark field size", () => {
      ciphertext.forEach((ct) => {
        // TODO: Figure out if this check is correct and enough
        expect(ct < SNARK_FIELD_SIZE).to.eq(true);
      });
    });

    it("The decrypted ciphertext should be correct", () => {
      for (let i = 0; i < decryptedCiphertext.length; i += 1) {
        expect(decryptedCiphertext[i]).to.eq(plaintext[i]);
      }
    });

    it("The plaintext should be incorrect if decrypted with a different key", () => {
      const sk = BigInt(1);
      const pk = genPubKey(sk);
      const differentKey = genEcdhSharedKey(sk, pk);

      expect(() => {
        decrypt(ciphertext, differentKey, nonce, plaintext.length);
      }).to.throw();
    });
  });

  describe("Signature generation and verification", () => {
    const message = BigInt(Math.floor(Math.random() * 1000000000));
    const signature = sign(privKey, message);

    it("The signature should have the correct format and it constitutent parts should be smaller than the snark field size", () => {
      expect(signature).to.haveOwnProperty("R8");
      expect(signature).to.haveOwnProperty("S");
      expect(signature.R8[0] < SNARK_FIELD_SIZE).to.eq(true);
      expect(signature.R8[1] < SNARK_FIELD_SIZE).to.eq(true);
      expect(signature.S < SNARK_FIELD_SIZE).to.eq(true);
    });

    it("The signature should be valid", () => {
      const valid = verifySignature(message, signature, pubKey);
      expect(valid).to.eq(true);
    });

    it("The signature should be invalid for a different message", () => {
      const valid = verifySignature(message + BigInt(1), signature, pubKey);
      expect(valid).to.eq(false);
    });

    it("The signature should be invalid if tampered with", () => {
      const valid = verifySignature(
        message,
        {
          R8: signature.R8,
          S: BigInt(1),
        },
        pubKey,
      );
      expect(valid).to.eq(false);
    });

    it("The signature should be invalid for a different public key", () => {
      const valid = verifySignature(message, signature, pubKey1);
      expect(valid).to.eq(false);
    });
  });

  describe("genTreeCommitment", () => {
    const leaves = [BigInt(1), BigInt(2), BigInt(3), BigInt(4), BigInt(5)];
    const salt = BigInt(6);
    const depth = 3;
    it("should generate a commitment to the tree root using the provided salt", () => {
      const commitment = genTreeCommitment(leaves, salt, depth);
      expect(commitment).to.satisfy((num: bigint) => num > 0);
      expect(commitment).to.satisfy((num: bigint) => num < SNARK_FIELD_SIZE);
    });

    it("should always generate the same commitment for the same inputs", () => {
      const commitment = genTreeCommitment(leaves, salt, depth);
      expect(commitment).to.satisfy((num: bigint) => num > 0);
      expect(commitment).to.satisfy((num: bigint) => num < SNARK_FIELD_SIZE);

      const commitment2 = genTreeCommitment(leaves, salt, depth);
      expect(commitment).to.satisfy((num: bigint) => num > 0);
      expect(commitment).to.satisfy((num: bigint) => num < SNARK_FIELD_SIZE);
      expect(commitment).to.eq(commitment2);
    });
  });
});
