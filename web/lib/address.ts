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
  bitcoin: { url: "https://mempool.space/address/{address}", name: "mempool.space" },
  base: { url: "https://basescan.org/address/{address}", name: "Basescan" },
  arbitrum: { url: "https://arbiscan.io/address/{address}", name: "Arbiscan" },
  optimism: { url: "https://optimistic.etherscan.io/address/{address}", name: "OP Etherscan" },
  polygon: { url: "https://polygonscan.com/address/{address}", name: "Polygonscan" },
  bsc: { url: "https://bscscan.com/address/{address}", name: "BscScan" },
  avalanche: { url: "https://snowtrace.io/address/{address}", name: "Snowtrace" },
  linea: { url: "https://lineascan.build/address/{address}", name: "Lineascan" },
  blast: { url: "https://blastscan.io/address/{address}", name: "Blastscan" },
  scroll: { url: "https://scrollscan.com/address/{address}", name: "Scrollscan" },
  zksync: { url: "https://explorer.zksync.io/address/{address}", name: "zkSync Explorer" },
  ink: { url: "https://explorer.inkonchain.com/address/{address}", name: "Ink Explorer" },
  mode: { url: "https://explorer.mode.network/address/{address}", name: "Mode Explorer" },
  zora: { url: "https://explorer.zora.energy/address/{address}", name: "Zora Explorer" },
  gnosis: { url: "https://gnosisscan.io/address/{address}", name: "Gnosisscan" },
  celo: { url: "https://celoscan.io/address/{address}", name: "Celoscan" },
  sei: { url: "https://seitrace.com/address/{address}", name: "Seitrace" },
  sonic: { url: "https://sonicscan.org/address/{address}", name: "Sonicscan" },
  opbnb: { url: "https://opbnbscan.com/address/{address}", name: "opBNBScan" },
  taiko: { url: "https://taikoscan.io/address/{address}", name: "Taikoscan" },
  apechain: { url: "https://apescan.io/address/{address}", name: "Apescan" },
  mantle: { url: "https://mantlescan.xyz/address/{address}", name: "Mantlescan" },
  fantom: { url: "https://ftmscan.com/address/{address}", name: "FTMScan" },
  cronos: { url: "https://cronoscan.com/address/{address}", name: "Cronoscan" },
  hyperliquid: {
    url: "https://app.hyperliquid.xyz/explorer/address/{address}",
    name: "Hyperliquid"
  },
  core: { url: "https://scan.coredao.org/address/{address}", name: "Core Scan" },
  monad: { url: "https://monadexplorer.com/address/{address}", name: "Monad Explorer" },
  xlayer: {
    url: "https://www.okx.com/web3/explorer/xlayer/address/{address}",
    name: "OKX Explorer"
  },
  unichain: { url: "https://unichain.org/explorer/address/{address}", name: "Unichain Explorer" },
  berachain: { url: "https://berascan.com/address/{address}", name: "Berascan" },
  zetachain: { url: "https://zetachain.blockscout.com/address/{address}", name: "ZetaScan" },
  robinhood: {
    url: "https://robinhoodchain.blockscout.com/address/{address}",
    name: "Robinhood Explorer"
  },
  hood: {
    url: "https://robinhoodchain.blockscout.com/address/{address}",
    name: "Robinhood Explorer"
  },
  hemi: { url: "https://explorer.hemi.xyz/address/{address}", name: "Hemi Explorer" },
  fuse: { url: "https://explorer.fuse.io/address/{address}", name: "Fuse Explorer" },
  plume: { url: "https://explorer.plumenetwork.xyz/address/{address}", name: "Plume Explorer" },
  arc: { url: "https://arcscan.io/address/{address}", name: "Arc Explorer" },
  cyber: { url: "https://cyberscan.co/address/{address}", name: "Cyberscan" },
  plasma: { url: "https://plasmascan.to/address/{address}", name: "Plasma Explorer" },
  immutable: { url: "https://explorer.immutable.com/address/{address}", name: "Immutable Explorer" }
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

/** Per-chain transaction explorer link. */
export function transactionUrl(chainSlug: string, txId: string): string | null {
  const slug = chainSlug.toLowerCase();
  const encoded = encodeURIComponent(txId);
  switch (slug) {
    case "algorand":
      return `https://lora.algokit.io/mainnet/transaction/${encoded}`;
    case "ethereum":
      return `https://etherscan.io/tx/${encoded}`;
    case "bitcoin":
      return `https://blockstream.info/tx/${encoded}`;
    case "solana":
      return `https://solscan.io/tx/${encoded}`;
    case "base":
      return `https://basescan.org/tx/${encoded}`;
    case "arbitrum":
      return `https://arbiscan.io/tx/${encoded}`;
    case "optimism":
      return `https://optimistic.etherscan.io/tx/${encoded}`;
    case "polygon":
      return `https://polygonscan.com/tx/${encoded}`;
    case "bsc":
      return `https://bscscan.com/tx/${encoded}`;
    case "avalanche":
      return `https://snowtrace.io/tx/${encoded}`;
    case "linea":
      return `https://lineascan.build/tx/${encoded}`;
    case "blast":
      return `https://blastscan.io/tx/${encoded}`;
    case "scroll":
      return `https://scrollscan.com/tx/${encoded}`;
    case "zksync":
      return `https://explorer.zksync.io/tx/${encoded}`;
    case "ink":
      return `https://explorer.inkonchain.com/tx/${encoded}`;
    case "mode":
      return `https://explorer.mode.network/tx/${encoded}`;
    case "zora":
      return `https://explorer.zora.energy/tx/${encoded}`;
    case "gnosis":
      return `https://gnosisscan.io/tx/${encoded}`;
    case "celo":
      return `https://celoscan.io/tx/${encoded}`;
    case "sei":
      return `https://seitrace.com/tx/${encoded}`;
    case "sonic":
      return `https://sonicscan.org/tx/${encoded}`;
    case "opbnb":
      return `https://opbnbscan.com/tx/${encoded}`;
    case "taiko":
      return `https://taikoscan.io/tx/${encoded}`;
    case "apechain":
      return `https://apescan.io/tx/${encoded}`;
    case "mantle":
      return `https://mantlescan.xyz/tx/${encoded}`;
    case "fantom":
      return `https://ftmscan.com/tx/${encoded}`;
    case "cronos":
      return `https://cronoscan.com/tx/${encoded}`;
    case "hyperliquid":
      return `https://app.hyperliquid.xyz/explorer/tx/${encoded}`;
    case "berachain":
      return `https://berascan.com/tx/${encoded}`;
    case "robinhood":
    case "hood":
      return `https://robinhoodchain.blockscout.com/tx/${encoded}`;
    default:
      return null;
  }
}

const CHAIN_LABELS: Readonly<Record<string, string>> = {
  algorand: "Algorand",
  ethereum: "Ethereum",
  solana: "Solana",
  bitcoin: "Bitcoin",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  polygon: "Polygon",
  bsc: "BNB Chain",
  avalanche: "Avalanche",
  linea: "Linea",
  blast: "Blast",
  scroll: "Scroll",
  zksync: "zkSync Era",
  ink: "Ink",
  mode: "Mode",
  zora: "Zora",
  gnosis: "Gnosis",
  celo: "Celo",
  sei: "Sei",
  sonic: "Sonic",
  opbnb: "opBNB",
  taiko: "Taiko",
  apechain: "ApeChain",
  mantle: "Mantle",
  fantom: "Fantom",
  cronos: "Cronos",
  hyperliquid: "Hyperliquid",
  core: "Core DAO",
  monad: "Monad",
  xlayer: "X Layer",
  unichain: "Unichain",
  berachain: "Berachain",
  zetachain: "ZetaChain",
  zircuit: "Zircuit",
  robinhood: "Robinhood",
  hood: "Robinhood",
  hemi: "Hemi",
  fuse: "Fuse",
  plume: "Plume",
  arc: "Arc",
  cyber: "Cyber",
  plasma: "Plasma",
  immutable: "Immutable"
};

export function chainLabel(slug: string): string {
  return CHAIN_LABELS[slug.toLowerCase()] ?? slug;
}

const CHAIN_LOGOS: Readonly<Record<string, string>> = {
  algorand: "/assets/coins/algorand.png",
  algo: "/assets/coins/algorand.png",
  ethereum: "/assets/coins/ethereum.png",
  eth: "/assets/coins/ethereum.png",
  solana: "/assets/coins/solana.png",
  sol: "/assets/coins/solana.png",
  bitcoin: "/assets/coins/bitcoin.svg",
  btc: "/assets/coins/bitcoin.svg",
  base: "/assets/coins/base.png",
  arbitrum: "/assets/coins/arbitrum.png",
  arb: "/assets/coins/arbitrum.png",
  optimism: "/assets/coins/optimism.png",
  op: "/assets/coins/optimism.png",
  polygon: "/assets/coins/polygon.png",
  pol: "/assets/coins/polygon.png",
  matic: "/assets/coins/polygon.png",
  bsc: "/assets/coins/bnb.png",
  bnb: "/assets/coins/bnb.png",
  avalanche: "/assets/coins/avalanche.png",
  avax: "/assets/coins/avalanche.png",
  linea: "/assets/coins/linea.png",
  blast: "/assets/coins/blast.png",
  scroll: "/assets/coins/scroll.png",
  zksync: "/assets/coins/zksync.png",
  ink: "/assets/coins/ink.png",
  mode: "/assets/coins/mode.png",
  zora: "/assets/coins/zora.png",
  gnosis: "/assets/coins/gnosis.png",
  celo: "/assets/coins/celo.png",
  sei: "/assets/coins/sei.png",
  sonic: "/assets/coins/sonic.png",
  opbnb: "/assets/coins/opbnb.png",
  taiko: "/assets/coins/taiko.png",
  apechain: "/assets/coins/apechain.png",
  mantle: "/assets/coins/mantle.png",
  fantom: "/assets/coins/fantom.png",
  cronos: "/assets/coins/cronos.png",
  hyperliquid: "/assets/coins/hyperliquid.svg",
  core: "/assets/coins/core.png",
  monad: "/assets/coins/monad.png",
  xlayer: "/assets/coins/xlayer.png",
  unichain: "/assets/coins/unichain.png",
  berachain: "/assets/coins/berachain.png",
  zetachain: "/assets/coins/zetachain.png",
  zircuit: "/assets/coins/zircuit.png",
  robinhood: "/assets/coins/robinhood.png",
  hood: "/assets/coins/robinhood.png",
  hemi: "/assets/coins/hemi.png",
  fuse: "/assets/coins/fuse.png",
  plume: "/assets/coins/plume.png",
  arc: "/assets/coins/arc.png",
  cyber: "/assets/coins/cyber.png",
  plasma: "/assets/coins/plasma.png",
  immutable: "/assets/coins/immutable.png",
  polymarket: "/assets/coins/polymarket.png",
  pendle: "/assets/coins/pendle.png",
  uniswap: "/assets/coins/uni.png",
  velodrome: "/assets/coins/velodrome.png",
  pancakeswap: "/assets/coins/pancakeswap.png",
  aave: "/assets/coins/aave.png",
  lighter: "/assets/coins/lighter.png",
  variational: "/assets/coins/variational.png"
};

export function getChainLogoSrc(slug?: string): string {
  if (!slug) return "/assets/coins/ethereum.png";
  return CHAIN_LOGOS[slug.toLowerCase()] ?? "/assets/coins/ethereum.png";
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
    wbtc: "wbtc",
    btcb: "wbtc",
    sol: "solana",
    bnb: "bsc",
    wbnb: "bsc",
    pol: "polygon",
    matic: "polygon",
    wmatic: "polygon",
    avax: "avalanche",
    wavax: "avalanche",
    arb: "arbitrum",
    op: "optimism",
    usdc: "usdc",
    usdt: "usdt",
    usdbc: "usdc",
    axlusdc: "usdc",
    axlusdt: "usdt",
    dai: "dai",
    link: "link",
    uni: "uni",
    aave: "aave",
    pepe: "pepe",
    cake: "cake",
    shib: "shib"
  };
  return aliases[normalized] ?? normalized;
}
