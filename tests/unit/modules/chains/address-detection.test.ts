import { describe, expect, it } from "vitest";

import {
  detectAddress,
  isBitcoinAddress,
  isSolanaAddress
} from "../../../../src/modules/chains/domain/address-detection.js";

const ALL_CHAINS = ["ethereum", "algorand", "solana", "bitcoin"];

// Real, live-verified addresses for each family.
const EVM = "0xd8dA680F17485f5fE14a58674455179eBBfC1F40";
const ALGORAND = "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4";
const SOLANA = "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE";
const BITCOIN_BECH32 = "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97";
const BITCOIN_LEGACY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

describe("detectAddress", () => {
  it("routes each family to its own chain", () => {
    expect(detectAddress(EVM, ALL_CHAINS).candidateChains).toEqual(["ethereum"]);
    expect(detectAddress(ALGORAND, ALL_CHAINS).candidateChains).toEqual(["algorand"]);
    expect(detectAddress(SOLANA, ALL_CHAINS).candidateChains).toEqual(["solana"]);
    expect(detectAddress(BITCOIN_BECH32, ALL_CHAINS).candidateChains).toEqual(["bitcoin"]);
    expect(detectAddress(BITCOIN_LEGACY, ALL_CHAINS).candidateChains).toEqual(["bitcoin"]);
  });

  it("trims surrounding whitespace, as a paste from a block explorer carries", () => {
    expect(detectAddress(`  ${SOLANA}\n`, ALL_CHAINS).address).toBe(SOLANA);
    expect(detectAddress(`  ${SOLANA}\n`, ALL_CHAINS).candidateChains).toEqual(["solana"]);
  });

  it("separates Solana from a Bitcoin legacy address despite the shared base58 alphabet", () => {
    // Both are base58 and their textual lengths overlap; only the decoded byte
    // length distinguishes them (32 bytes vs 25). Getting this wrong would silently
    // read a user's Bitcoin address on Solana.
    expect(isSolanaAddress(SOLANA)).toBe(true);
    expect(isBitcoinAddress(SOLANA)).toBe(false);
    expect(isBitcoinAddress(BITCOIN_LEGACY)).toBe(true);
    expect(isSolanaAddress(BITCOIN_LEGACY)).toBe(false);
  });

  it("reports no candidates for unrecognizable input", () => {
    for (const junk of ["", "hello world", "0xnothex", "1234567890", "!!!", "0x1234"]) {
      expect(detectAddress(junk, ALL_CHAINS).candidateChains).toEqual([]);
    }
  });

  it("keeps a well-formed address but offers no candidate when its chain is not wired", () => {
    const detection = detectAddress(SOLANA, ["ethereum", "algorand"]);

    expect(detection.formats).toEqual(["solana"]);
    expect(detection.candidateChains).toEqual([]);
  });

  it("never reports the same format twice", () => {
    for (const address of [EVM, ALGORAND, SOLANA, BITCOIN_BECH32, BITCOIN_LEGACY]) {
      const detection = detectAddress(address, ALL_CHAINS);
      expect(new Set(detection.formats).size).toBe(detection.formats.length);
    }
  });
});
