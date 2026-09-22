// Growtrack-internal registry ids for the non-EVM chains.
//
// These are NOT EIP-155 chainIds — neither Solana nor Bitcoin has such a concept.
// The provider registry keys by slug, so these integers only need to be unique
// among Growtrack's configured chains and must never collide with an EIP-155 id
// (mainnet EVM occupies id 1, Algorand mainnet id 2).
export const SOLANA_MAINNET_CHAIN_ID = 3;
export const BITCOIN_MAINNET_CHAIN_ID = 4;
export const BASE_MAINNET_CHAIN_ID = 8453;
export const ARBITRUM_MAINNET_CHAIN_ID = 42161;
export const OPTIMISM_MAINNET_CHAIN_ID = 10;
export const POLYGON_MAINNET_CHAIN_ID = 137;
export const BSC_MAINNET_CHAIN_ID = 56;
export const AVALANCHE_MAINNET_CHAIN_ID = 43114;
