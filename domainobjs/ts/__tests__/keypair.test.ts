import { expect } from "chai";
import { genKeypair } from "maci-crypto";

import { Keypair, PrivKey } from "..";

describe("keypair", () => {
  it("the Keypair constructor should generate a random keypair if not provided a private key", () => {
    const k1 = new Keypair();
    const k2 = new Keypair();

    expect(k1.equals(k2)).to.eq(false);

    expect(k1.privKey.rawPrivKey).not.to.eq(k2.privKey.rawPrivKey);
  });

  it("the Keypair constructor should generate the correct public key given a private key", () => {
    const rawKeyPair = genKeypair();
    const k = new Keypair(new PrivKey(rawKeyPair.privKey));
    expect(rawKeyPair.pubKey[0]).to.eq(k.pubKey.rawPubKey[0]);
    expect(rawKeyPair.pubKey[1]).to.eq(k.pubKey.rawPubKey[1]);
  });

  it("should return false for two completely different keypairs", () => {
    const k1 = new Keypair();
    const k2 = new Keypair();
    expect(k1.equals(k2)).to.eq(false);
  });

  it("should return false for two keypairs with different private keys", () => {
    const k1 = new Keypair();
    const k2 = new Keypair();
    k2.privKey.rawPrivKey = BigInt(0);
    expect(k1.equals(k2)).to.eq(false);
  });
  it("should return false for two keypairs with different public keys", () => {
    const k1 = new Keypair();
    const k2 = new Keypair();
    k2.pubKey.rawPubKey[0] = BigInt(0);
    expect(k1.equals(k2)).to.eq(false);
  });

  it("should return true for two identical keypairs", () => {
    const k1 = new Keypair();
    const k2 = k1.copy();
    expect(k1.equals(k2)).to.eq(true);
  });

  it("copy should produce a deep copy", () => {
    const k1 = new Keypair();

    // shallow copy
    const k2 = k1;

    expect(k1.privKey.rawPrivKey.toString()).to.eq(k2.privKey.rawPrivKey.toString());
    k1.privKey.rawPrivKey = BigInt(0);
    expect(k1.privKey.rawPrivKey.toString()).to.eq(k2.privKey.rawPrivKey.toString());

    // deep copy
    const k3 = new Keypair();
    const k4 = k3.copy();
    expect(k3.privKey.rawPrivKey.toString()).to.eq(k4.privKey.rawPrivKey.toString());

    k3.privKey.rawPrivKey = BigInt(0);
    expect(k3.privKey.rawPrivKey.toString()).not.to.eq(k4.privKey.rawPrivKey.toString());
  });
});
