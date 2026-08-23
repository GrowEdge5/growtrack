// Growtrack-internal registry id for the Algorand mainnet chain. This is NOT an
// EIP-155 chainId — Algorand has no such concept. The provider registry keys by
// slug ("algorand" vs "ethereum"), so this integer only needs to be unique among
// Growtrack's configured chains; mainnet EVM already occupies id 1, so 2 is free.
export const ALGORAND_MAINNET_CHAIN_ID = 2;

export interface AsaToken {
  assetId: number;
  symbol: string;
  name: string;
  decimals: number;
}

// Curated set of Algorand Standard Assets (ASAs) on mainnet.
//
// The keyless algod REST path reports balances for THESE assets only, mirroring
// the EVM curated-token-list approach. An account may hold other ASAs; those are
// simply not reported here (a documented coverage limit, not fabricated data).
// Both entries are x402-relevant stablecoins that DeFiLlama prices reliably via
// the `algorand:<assetId>` key, so they carry USD values once pricing is enabled.
export const ALGORAND_MAINNET_ASSETS: readonly AsaToken[] = [
  {
    assetId: 31566704,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    assetId: 312769,
    symbol: "USDt",
    name: "Tether USDt",
    decimals: 6
  }
];

// Returns the curated ASA list for a given Growtrack chain id. Only Algorand
// mainnet (id 2) is covered today; any other id returns an empty list rather
// than applying mainnet asset ids to a chain where they are meaningless.
export function getAsaTokenList(chainId: number): readonly AsaToken[] {
  return chainId === ALGORAND_MAINNET_CHAIN_ID ? ALGORAND_MAINNET_ASSETS : [];
}
