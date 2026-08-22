export interface Erc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Curated set of high-capitalization Ethereum mainnet ERC-20 tokens.
//
// Addresses are stored lowercase and checksummed at read time via viem's
// getAddress(), so there is no checksum-casing risk in this file. The list is
// intentionally finite: the keyless RPC path reports balances for THESE tokens
// only. Full long-tail token discovery requires an external indexer (e.g.
// Alchemy) and is deliberately out of scope for the no-API-key provider — a
// documented coverage limit, not fabricated data.
export const ETHEREUM_MAINNET_TOKENS: readonly Erc20Token[] = [
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18
  },
  {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8
  },
  {
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18
  },
  {
    address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18
  },
  {
    address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    symbol: "AAVE",
    name: "Aave Token",
    decimals: 18
  },
  {
    address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    symbol: "stETH",
    name: "Lido Staked Ether",
    decimals: 18
  },
  {
    address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    symbol: "MKR",
    name: "Maker",
    decimals: 18
  },
  {
    address: "0xd533a949740bb3306d119cc777fa900ba034cd52",
    symbol: "CRV",
    name: "Curve DAO Token",
    decimals: 18
  },
  {
    address: "0x5a98fcbea516cf06857215779fd812ca3bef1b32",
    symbol: "LDO",
    name: "Lido DAO Token",
    decimals: 18
  },
  {
    address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
    symbol: "SHIB",
    name: "Shiba Inu",
    decimals: 18
  }
];

// Returns the curated ERC-20 list for a given EVM chain. Only Ethereum mainnet
// (chainId 1) is covered today; any other chain returns an empty list rather
// than applying mainnet token addresses to a chain where they are meaningless.
export function getErc20TokenList(chainId: number): readonly Erc20Token[] {
  return chainId === 1 ? ETHEREUM_MAINNET_TOKENS : [];
}
