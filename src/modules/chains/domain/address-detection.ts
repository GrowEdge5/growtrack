import algosdk from "algosdk";

// Rough address format families Growtrack can read. These are NOT chain slugs:
// one format can back several deployments (every EIP-155 chain shares "evm").
export type AddressFormat = "evm" | "algorand" | "solana" | "bitcoin";

// The chain slug each format resolves to by default. A deployment that reads
// several EVM chains would need to extend this, which is why resolution is
// validated against the running registry before it is trusted.
const DEFAULT_SLUG_BY_FORMAT: Readonly<Record<AddressFormat, string>> = {
  evm: "ethereum",
  algorand: "algorand",
  solana: "solana",
  bitcoin: "bitcoin"
};

export interface AddressDetection {
  // The address exactly as supplied, trimmed.
  address: string;
  // Formats whose syntax this address satisfies. Empty means unrecognized.
  formats: readonly AddressFormat[];
  // Chain slugs for those formats, filtered to the chains this process actually
  // reads. Empty means the address is well-formed but on an unread chain, or is
  // simply not a recognizable address.
  candidateChains: readonly string[];
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]));

// Bytes a base58 payload implies, which is what separates the two base58 families:
// a Solana public key is exactly 32 bytes, while a Bitcoin legacy address is a
// 1-byte version + 20-byte hash (+ 4-byte checksum) = 25 bytes for P2PKH and 23 for
// P2SH. Length alone therefore disambiguates, with no network probe and no guessing.
const SOLANA_PUBKEY_BYTES = 32;
const BITCOIN_LEGACY_BYTES = new Set([23, 25]);

// Bech32/bech32m Bitcoin addresses. Full checksum validation belongs to the chain
// provider; this identifies the family so a paste can be routed.
const BITCOIN_BECH32 = /^(bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{8,87}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Detects which chain families a pasted address could belong to, using syntax only.
//
// This is deliberately offline: no RPC probe, no API call. The base58 split is the
// one genuinely ambiguous case in a multichain tracker — Solana and Bitcoin legacy
// addresses share an alphabet and their textual lengths overlap — and it is resolved
// by decoded byte length rather than by a heuristic guess, so a paste is never
// silently attributed to the wrong chain.
export function detectAddress(
  rawAddress: string,
  knownChainSlugs: readonly string[]
): AddressDetection {
  const address = rawAddress.trim();
  const formats = formatsFor(address);
  const known = new Set(knownChainSlugs.map((slug) => slug.toLowerCase()));
  const candidateChains = formats
    .map((format) => DEFAULT_SLUG_BY_FORMAT[format])
    .filter((slug) => known.has(slug));

  return { address, formats, candidateChains };
}

// Whether `address` is a well-formed Bitcoin address of a family Growtrack reads
// (bech32/bech32m, or legacy/P2SH base58). The chain provider calls this so address
// validation and paste-routing share one definition instead of drifting apart.
export function isBitcoinAddress(address: string): boolean {
  return formatsFor(address.trim()).includes("bitcoin");
}

// Whether `address` is a well-formed Solana public key (32 decoded bytes).
export function isSolanaAddress(address: string): boolean {
  return formatsFor(address.trim()).includes("solana");
}

function formatsFor(address: string): AddressFormat[] {
  if (EVM_ADDRESS.test(address)) {
    return ["evm"];
  }
  if (BITCOIN_BECH32.test(address.toLowerCase())) {
    return ["bitcoin"];
  }
  // Algorand before base58: its alphabet overlaps base58's but the 58-character
  // length and checksum make isValidAddress exact (and it never throws).
  if (algosdk.isValidAddress(address)) {
    return ["algorand"];
  }

  const decodedBytes = base58ByteLength(address);
  if (decodedBytes === SOLANA_PUBKEY_BYTES) {
    return ["solana"];
  }
  if (decodedBytes !== undefined && BITCOIN_LEGACY_BYTES.has(decodedBytes)) {
    return ["bitcoin"];
  }

  return [];
}

// Decoded byte length of a base58 string, or undefined when it is not base58 at all.
// Leading '1's are zero bytes in base58 and must be counted separately.
function base58ByteLength(value: string): number | undefined {
  if (value.length === 0) {
    return undefined;
  }

  let zeros = 0;
  while (zeros < value.length && value[zeros] === "1") {
    zeros += 1;
  }

  let accumulator = 0n;
  for (const char of value.slice(zeros)) {
    const digit = BASE58_INDEX.get(char);
    if (digit === undefined) {
      return undefined;
    }
    accumulator = accumulator * 58n + BigInt(digit);
  }

  let significantBytes = 0;
  while (accumulator > 0n) {
    accumulator >>= 8n;
    significantBytes += 1;
  }

  return zeros + significantBytes;
}
