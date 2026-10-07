export interface Erc20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Curated set of high-capitalization Ethereum mainnet ERC-20 tokens.
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
  },
  {
    address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    symbol: "PEPE",
    name: "Pepe",
    decimals: 18
  },
  {
    address: "0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24",
    symbol: "RENDER",
    name: "Render Token",
    decimals: 18
  },
  {
    address: "0xfaba6f8e4a5e8ab82f62fe7c39859fa577269be3",
    symbol: "ONDO",
    name: "Ondo",
    decimals: 18
  },
  {
    address: "0x57e114b691db790c35207b2e685d4a43181e6061",
    symbol: "ENA",
    name: "Ethena",
    decimals: 18
  },
  {
    address: "0x808507121b80c02388fad14726482e061b8da827",
    symbol: "PENDLE",
    name: "Pendle",
    decimals: 18
  }
];

// Curated Base tokens (Chain ID 8453)
export const BASE_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca",
    symbol: "USDbC",
    name: "USD Base Coin",
    decimals: 6
  },
  {
    address: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
    symbol: "cbBTC",
    name: "Coinbase Wrapped BTC",
    decimals: 8
  },
  {
    address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
    symbol: "AERO",
    name: "Aerodrome Finance",
    decimals: 18
  },
  {
    address: "0x532f27101965dd16442e59d40670faf5ebb142e4",
    symbol: "BRETT",
    name: "Brett",
    decimals: 18
  },
  {
    address: "0x4ed4e862860be51a7536f0d478af43d494ac55f1",
    symbol: "DEGEN",
    name: "Degen",
    decimals: 18
  },
  {
    address: "0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4",
    symbol: "TOSHI",
    name: "Toshi",
    decimals: 18
  },
  {
    address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18
  },
  {
    address: "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b",
    symbol: "VIRTUAL",
    name: "Virtual Protocol",
    decimals: 18
  },
  {
    address: "0x1c7a4804e2f440557834544093a21c69ebb50e29",
    symbol: "SEAM",
    name: "Seamless",
    decimals: 18
  },
  {
    address: "0xa88594d404727625a94370d9874cb4ce938e3e68",
    symbol: "WELL",
    name: "Moonwell",
    decimals: 18
  }
];

// Curated Arbitrum tokens (Chain ID 42161)
export const ARBITRUM_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
    symbol: "ARB",
    name: "Arbitrum",
    decimals: 18
  },
  {
    address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6
  },
  {
    address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8
  },
  {
    address: "0xf97f4df75117a78c1a5a0dbb814af92458539fb0",
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18
  },
  {
    address: "0xfc5a1a6eb13664adc9dee36ddc47c1291770e270",
    symbol: "GMX",
    name: "GMX",
    decimals: 18
  },
  {
    address: "0xfa7f8980b0f1e64a2062791ce3b0e48353320d95",
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18
  },
  {
    address: "0x0c880f67ed5009bc177745d49823ec253e6b7756",
    symbol: "PENDLE",
    name: "Pendle",
    decimals: 18
  },
  {
    address: "0x3082cc23db5508853c44e0a4f5b7a041bf6ce440",
    symbol: "RDNT",
    name: "Radiant",
    decimals: 18
  },
  {
    address: "0x539bde0d7dbd336b79148aa742883198bbf60342",
    symbol: "MAGIC",
    name: "Magic",
    decimals: 18
  },
  {
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18
  }
];

// Curated BNB Smart Chain tokens (Chain ID 56)
export const BSC_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x55d398326f99059ff775485246999027b3197955",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 18
  },
  {
    address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 18
  },
  {
    address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    symbol: "BUSD",
    name: "Binance-Peg BUSD",
    decimals: 18
  },
  {
    address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    symbol: "WBNB",
    name: "Wrapped BNB",
    decimals: 18
  },
  {
    address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
    symbol: "ETH",
    name: "Binance-Peg Ethereum",
    decimals: 18
  },
  {
    address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    symbol: "BTCB",
    name: "Binance-Peg BTCB",
    decimals: 18
  },
  {
    address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
    symbol: "CAKE",
    name: "PancakeSwap Token",
    decimals: 18
  },
  {
    address: "0x4b0f1812e5df2a09796481ff14017e6005508003",
    symbol: "TWT",
    name: "Trust Wallet",
    decimals: 18
  },
  {
    address: "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
    symbol: "ADA",
    name: "Binance-Peg Cardano",
    decimals: 18
  },
  {
    address: "0xba2ae424d960c26247dd6c32edc70b295c744c43",
    symbol: "DOGE",
    name: "Binance-Peg Dogecoin",
    decimals: 8
  },
  {
    address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe",
    symbol: "XRP",
    name: "Binance-Peg XRP",
    decimals: 18
  },
  {
    address: "0xfb5b838b6cfeedc2873ab27866079ac55363d1a3",
    symbol: "FLOKI",
    name: "Floki",
    decimals: 9
  }
];

// Curated Polygon tokens (Chain ID 137)
export const POLYGON_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6
  },
  {
    address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8
  },
  {
    address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
    symbol: "WMATIC",
    name: "Wrapped Matic",
    decimals: 18
  },
  {
    address: "0xb0897686c545045afc77cf20ec7a532e3120e0f1",
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18
  },
  {
    address: "0xb5c064f955d8e7f38fe0460c556a72987494ee17",
    symbol: "QUICK",
    name: "Quickswap",
    decimals: 18
  },
  {
    address: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
    symbol: "AAVE",
    name: "Aave",
    decimals: 18
  },
  {
    address: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18
  }
];

// Curated Optimism tokens (Chain ID 10)
export const OPTIMISM_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x4200000000000000000000000000000000000042",
    symbol: "OP",
    name: "Optimism",
    decimals: 18
  },
  {
    address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6
  },
  {
    address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0x68f180fcce6836688e9084f035309e29bf0a2095",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8
  },
  {
    address: "0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6",
    symbol: "LINK",
    name: "ChainLink Token",
    decimals: 18
  },
  {
    address: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4",
    symbol: "SNX",
    name: "Synthetix Network Token",
    decimals: 18
  },
  {
    address: "0x9560e827af36c94d2ac33a39bce1fe78631088db",
    symbol: "VELO",
    name: "Velodrome",
    decimals: 18
  },
  {
    address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18
  }
];

// Curated Avalanche tokens (Chain ID 43114)
export const AVALANCHE_TOKENS: readonly Erc20Token[] = [
  {
    address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6
  },
  {
    address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    symbol: "WAVAX",
    name: "Wrapped AVAX",
    decimals: 18
  },
  {
    address: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    symbol: "WETH.e",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0x50b7545627a5162f82a992c33b87adc753675850",
    symbol: "WBTC.e",
    name: "Wrapped BTC",
    decimals: 8
  },
  {
    address: "0x6e84a6216ea6dacc71ee5092597392682be50736",
    symbol: "JOE",
    name: "Joe Token",
    decimals: 18
  },
  {
    address: "0x8729438eb15e2c8b576fcc6aecda6a148776c0f5",
    symbol: "QI",
    name: "BENQI",
    decimals: 18
  },
  {
    address: "0x152b9d0fdc40c096757f570a51e494db419386be",
    symbol: "BTC.b",
    name: "Bitcoin Bridged",
    decimals: 8
  }
];

// Curated zkSync Era tokens (Chain ID 324)
export const ZKSYNC_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x493257fD37EDB34451f62EDf8D2a0C418852bA4C",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  },
  {
    address: "0xBBeB516fb02a01611cBBE0453Fe3c580D7281011",
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8
  }
];

// Curated Mantle tokens (Chain ID 5000)
export const MANTLE_TOKENS: readonly Erc20Token[] = [
  {
    address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x201EBa5CC46D216Ce6DC03F6a759e80766E956Ae",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    symbol: "WMNT",
    name: "Wrapped Mantle",
    decimals: 18
  },
  {
    address: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  }
];

// Curated Cronos tokens (Chain ID 25)
export const CRONOS_TOKENS: readonly Erc20Token[] = [
  {
    address: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    address: "0x66e428c3f67a68878562e79A0234c1F83c208770",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  {
    address: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
    symbol: "WCRO",
    name: "Wrapped CRO",
    decimals: 18
  },
  {
    address: "0xe44Fd7fC971CB17d770ceF02b50232233644146e",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18
  }
];

const CURATED_LISTS: Readonly<Record<number, readonly Erc20Token[]>> = {
  1: ETHEREUM_MAINNET_TOKENS,
  8453: BASE_TOKENS,
  42161: ARBITRUM_TOKENS,
  56: BSC_TOKENS,
  137: POLYGON_TOKENS,
  10: OPTIMISM_TOKENS,
  43114: AVALANCHE_TOKENS,
  324: ZKSYNC_TOKENS,
  5000: MANTLE_TOKENS,
  25: CRONOS_TOKENS
};

/**
 * Returns the curated ERC-20 list for a given EVM chain synchronously.
 */
export function getCuratedErc20Tokens(chainId: number): readonly Erc20Token[] {
  return CURATED_LISTS[chainId] ?? [];
}

// In-memory cache for dynamic 1inch token list enrichment (TTL: 1 hour)
interface CacheEntry {
  expiresAt: number;
  tokens: readonly Erc20Token[];
}

const TOKEN_CACHE: Map<number, CacheEntry> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns the token list for a given EVM chain.
 * Seeds with curated tokens, dynamically enriches with top tokens from 1inch's open API,
 * and caches results in memory. Falls back safely to curated tokens on any network issue.
 */
export async function getErc20TokenList(chainId: number): Promise<readonly Erc20Token[]> {
  const curated = getCuratedErc20Tokens(chainId);
  if (curated.length === 0) {
    return [];
  }

  const cached = TOKEN_CACHE.get(chainId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.tokens;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://tokens.1inch.io/v1.2/${chainId}`, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as Record<
        string,
        { address?: string; symbol?: string; name?: string; decimals?: number }
      >;
      const seen = new Set<string>(curated.map((t) => t.address.toLowerCase()));
      const merged: Erc20Token[] = [...curated];

      for (const item of Object.values(data)) {
        if (!item.address || !item.symbol || !item.decimals) continue;
        const lower = item.address.toLowerCase();
        if (lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") continue;
        if (seen.has(lower)) continue;

        seen.add(lower);
        merged.push({
          address: lower,
          symbol: item.symbol,
          name: item.name ?? item.symbol,
          decimals: item.decimals
        });

        // Cap to 40 tokens per chain to keep multicall fast and within keyless RPC limits
        if (merged.length >= 40) {
          break;
        }
      }

      TOKEN_CACHE.set(chainId, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        tokens: merged
      });
      return merged;
    }
  } catch {
    // Graceful fallback to curated list
  }

  // Fallback to static curated list
  return curated;
}
