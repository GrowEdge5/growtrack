// Client-side address recognition and per-chain explorer links.
//
// Detection here is a *hint* used to give immediate feedback while typing and to
// pick an explorer URL. It is deliberately NOT the authority on which chain an
// address belongs to — the API routes by syntax server-side (and rejects genuinely
// ambiguous base58 input), so the two can never disagree about what was read.

export type AddressFamily = "evm" | "algorand" | "solana" | "bitcoin" | "unknown";

export interface AddressFormatHint {
  family: AddressFamily;
  label: string;
  /** Whether the input is complete enough to submit. */
  isValid: boolean;
  hint: string;
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BITCOIN_BECH32 = /^(bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{8,87}$/i;
const BITCOIN_LEGACY = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ALGORAND_SHAPE = /^[A-Z2-7]{58}$/;

const EMPTY: AddressFormatHint = {
  family: "unknown",
  label: "Awaiting input",
  isValid: false,
  hint: "Enter an EVM (0x…), Algorand, Solana or Bitcoin address"
};

/**
 * Shape-only recognition. An Algorand address is additionally checksum-verified by
 * the API before any read happens, so this never claims more confidence than it has.
 */
export function detectAddressFormat(raw: string): AddressFormatHint {
  const query = raw.trim();

  if (query.length === 0) {
    return EMPTY;
  }

  if (EVM_ADDRESS.test(query)) {
    return {
      family: "evm",
      label: "Ethereum (EVM)",
      isValid: true,
      hint: "Valid EVM address — Ethereum mainnet reads are supported"
    };
  }
  if (query.startsWith("0x")) {
    return {
      family: "evm",
      label: `EVM (${query.length - 2}/40 hex)`,
      isValid: false,
      hint: "An EVM address needs exactly 40 hex characters after 0x"
    };
  }

  if (ALGORAND_SHAPE.test(query)) {
    return {
      family: "algorand",
      label: "Algorand",
      isValid: true,
      hint: "58-character Algorand address"
    };
  }

  if (BITCOIN_BECH32.test(query)) {
    return {
      family: "bitcoin",
      label: "Bitcoin",
      isValid: true,
      hint: "Bitcoin address — balance and UTXO value reads are supported"
    };
  }

  if (BITCOIN_LEGACY.test(query)) {
    return {
      family: "bitcoin",
      label: "Bitcoin (legacy)",
      isValid: true,
      hint: "Legacy Bitcoin address — supported"
    };
  }

  if (BASE58.test(query)) {
    // Solana and legacy Bitcoin share the base58 alphabet; the API resolves the
    // byte length, so this only needs to avoid claiming the wrong chain.
    return {
      family: "solana",
      label: "Solana or Bitcoin",
      isValid: true,
      hint: "Base58 address — the API will resolve which chain it belongs to"
    };
  }

  return {
    family: "unknown",
    label: "Unrecognized",
    isValid: false,
    hint: "Not a recognizable EVM, Algorand, Solana or Bitcoin address"
  };
}

interface ExplorerConfig {
  /** `{address}` is replaced with the raw address. */
  url: string;
  name: string;
}

const EXPLORERS: Readonly<Record<string, ExplorerConfig>> = {
  algorand: { url: "https://lora.algokit.io/mainnet/account/{address}", name: "Lora" },
  ethereum: { url: "https://etherscan.io/address/{address}", name: "Etherscan" },
  solana: { url: "https://solscan.io/account/{address}", name: "Solscan" },
  bitcoin: { url: "https://mempool.space/address/{address}", name: "mempool.space" }
};

/**
 * Explorer URL for a resolved chain slug. Returns null rather than a guessed
 * explorer: linking an address to the wrong chain's explorer sends the user to a
 * "not found" page and looks like the product is broken.
 */
export function explorerUrl(chainSlug: string, address: string): string | null {
  const explorer = EXPLORERS[chainSlug.toLowerCase()];
  if (explorer === undefined) {
    return null;
  }
  return explorer.url.replace("{address}", encodeURIComponent(address));
}

export function explorerName(chainSlug: string): string | null {
  return EXPLORERS[chainSlug.toLowerCase()]?.name ?? null;
}

/** Per-chain transaction explorer link, used for x402 settlement receipts. */
export function transactionUrl(chainSlug: string, txId: string): string | null {
  if (chainSlug.toLowerCase() !== "algorand") {
    return null;
  }
  return `https://lora.algokit.io/mainnet/transaction/${encodeURIComponent(txId)}`;
}

const CHAIN_LABELS: Readonly<Record<string, string>> = {
  algorand: "Algorand",
  ethereum: "Ethereum",
  solana: "Solana",
  bitcoin: "Bitcoin"
};

export function chainLabel(slug: string): string {
  return CHAIN_LABELS[slug.toLowerCase()] ?? slug;
}

/**
 * A stable, dependency-free key for the token icon lookup. Native symbols map to
 * their chain's mark; everything else falls back to a monogram tile in the UI
 * rather than borrowing an unrelated logo.
 */
export function coinKeyForSymbol(symbol: string): string {
  const normalized = symbol.toLowerCase();
  const aliases: Readonly<Record<string, string>> = {
    algo: "algorand",
    eth: "ethereum",
    weth: "ethereum",
    btc: "bitcoin",
    sol: "solana",
    usdc: "usdc",
    usdt: "usdt"
  };
  return aliases[normalized] ?? normalized;
}
