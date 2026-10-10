import { createPublicClient, defineChain, http, isAddress } from "viem";

import type {
  DefiPositionItem,
  DefiProtocolGroup,
  WalletDefiOverview
} from "../domain/defi-position.js";

interface HyperliquidSpotBalance {
  coin: string;
  token: number;
  total: string;
  hold: string;
  entryNtl: string;
}

interface HyperliquidSpotState {
  balances?: HyperliquidSpotBalance[];
}

interface HyperliquidMarginSummary {
  accountValue?: string;
  totalNtlPos?: string;
  totalRawUsd?: string;
  totalMarginUsed?: string;
  withdrawable?: string;
}

interface HyperliquidAssetPosition {
  position?: {
    coin?: string;
    szi?: string;
    entryPx?: string;
    positionValue?: string;
    unrealizedPnl?: string;
    returnOnEquity?: string;
    leverage?: { type?: string; value?: number };
    liquidationPx?: string;
  };
}

interface HyperliquidClearinghouseState {
  marginSummary?: HyperliquidMarginSummary;
  assetPositions?: HyperliquidAssetPosition[];
}

const UNISWAP_V3_NFT_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88" as const;
const UNISWAP_V3_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    outputs: [{ name: "tokenId", type: "uint256" }]
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" }
    ]
  }
] as const;

const AAVE_V3_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const;
const AAVE_V3_ABI = [
  {
    type: "function",
    name: "getUserAccountData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" }
    ]
  }
] as const;

const KNOWN_ERC20: Record<string, string> = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "stETH"
};

function resolveTokenSymbol(address: string): string {
  const lower = address.toLowerCase();
  return KNOWN_ERC20[lower] ?? `${lower.slice(0, 6)}…${lower.slice(-4)}`;
}

export class DefiPositionService {
  private readonly publicClient;

  public constructor(rpcUrl: string = "https://ethereum-rpc.publicnode.com") {
    const ethereumChain = defineChain({
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } }
    });
    this.publicClient = createPublicClient({
      chain: ethereumChain,
      transport: http(rpcUrl, { timeout: 6000, retryCount: 1 })
    });
  }

  /**
   * Fetches real-time DeFi protocol positions for any given address across
   * Hyperliquid (Perp & Spot), Uniswap V3 (On-chain NFT LP positions),
   * and Aave V3 (On-chain Lending & Collateral).
   */
  public async getWalletDefiPositions(address: string): Promise<WalletDefiOverview> {
    const normalized = address.toLowerCase().trim();
    const protocols: DefiProtocolGroup[] = [];

    // Run protocol fetches in parallel
    const results = await Promise.allSettled([
      this.fetchHyperliquid(normalized),
      this.fetchUniswapV3Positions(normalized),
      this.fetchAaveV3Positions(normalized)
    ]);

    for (const res of results) {
      if (res.status === "fulfilled" && res.value !== null) {
        protocols.push(res.value);
      }
    }

    // Sort protocols by total USD value descending
    protocols.sort((a, b) => {
      const valA = parseFloat(a.totalValueUsd.replace(/[^0-9.-]+/g, "")) || 0;
      const valB = parseFloat(b.totalValueUsd.replace(/[^0-9.-]+/g, "")) || 0;
      return valB - valA;
    });

    const totalUsd = protocols.reduce((acc, curr) => {
      const val = parseFloat(curr.totalValueUsd.replace(/[^0-9.-]+/g, "")) || 0;
      return acc + val;
    }, 0);

    return {
      address: normalized,
      totalDefiValueUsd: totalUsd.toFixed(2),
      protocolsCount: protocols.length,
      protocols
    };
  }

  private async fetchUniswapV3Positions(address: string): Promise<DefiProtocolGroup | null> {
    if (!isAddress(address)) {
      return null;
    }

    try {
      const balance = await this.publicClient.readContract({
        address: UNISWAP_V3_NFT_MANAGER,
        abi: UNISWAP_V3_ABI,
        functionName: "balanceOf",
        args: [address]
      });

      const positionCount = Number(balance);
      if (positionCount === 0) {
        return null;
      }

      // Read up to 8 positions
      const maxRead = Math.min(positionCount, 8);
      const tokenIds = (await Promise.all(
        Array.from({ length: maxRead }, (_, i) =>
          this.publicClient.readContract({
            address: UNISWAP_V3_NFT_MANAGER,
            abi: UNISWAP_V3_ABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(i)]
          })
        )
      )) as unknown as bigint[];

      const posData = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          try {
            const pos = await this.publicClient.readContract({
              address: UNISWAP_V3_NFT_MANAGER,
              abi: UNISWAP_V3_ABI,
              functionName: "positions",
              args: [tokenId]
            });
            return { tokenId, pos };
          } catch {
            return null;
          }
        })
      );

      const items: DefiPositionItem[] = [];
      for (const entry of posData) {
        if (!entry) continue;
        const { tokenId, pos } = entry;
        const tuple = pos as [
          bigint,
          string,
          string,
          string,
          number,
          number,
          number,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint
        ];
        const token0 = tuple[2];
        const token1 = tuple[3];
        const fee = tuple[4];
        const tickLower = tuple[5];
        const tickUpper = tuple[6];
        const liquidity = tuple[7];

        const token0Sym = resolveTokenSymbol(token0);
        const token1Sym = resolveTokenSymbol(token1);
        const feeTierPct = `${Number(fee) / 10000}%`;

        items.push({
          id: `uni-v3-pos-${tokenId.toString()}`,
          name: `#${tokenId.toString()} (${token0Sym} / ${token1Sym})`,
          category: "Liquidity Pool",
          chainSlug: "ethereum",
          tokens: [
            { symbol: token0Sym, amount: ">0.00" },
            { symbol: token1Sym, amount: ">0.00" }
          ],
          valueUsd: liquidity > 0n ? "Active" : "Closed",
          details: {
            tokenId: tokenId.toString(),
            feeTier: feeTierPct,
            tickRange: `[${tickLower}, ${tickUpper}]`,
            liquidity: liquidity.toString()
          }
        });
      }

      if (items.length === 0) {
        return null;
      }

      return {
        protocolId: "uniswap",
        name: "Uniswap V3",
        category: "Liquidity Pool",
        chainSlug: "ethereum",
        logo: "/assets/coins/uni.png",
        siteUrl: "https://app.uniswap.org",
        totalValueUsd: `${items.length} Positions`,
        positions: items
      };
    } catch {
      return null;
    }
  }

  private async fetchAaveV3Positions(address: string): Promise<DefiProtocolGroup | null> {
    if (!isAddress(address)) {
      return null;
    }

    try {
      const data = await this.publicClient.readContract({
        address: AAVE_V3_POOL,
        abi: AAVE_V3_ABI,
        functionName: "getUserAccountData",
        args: [address]
      });

      const tuple = data as [bigint, bigint, bigint, bigint, bigint, bigint];
      const totalCollateralBase = tuple[0];
      const totalDebtBase = tuple[1];
      const ltv = tuple[4];
      const healthFactor = tuple[5];

      // Base currency is USD with 8 decimals in Aave V3
      const collateralUsd = Number(totalCollateralBase) / 1e8;
      const debtUsd = Number(totalDebtBase) / 1e8;

      if (collateralUsd <= 0.01 && debtUsd <= 0.01) {
        return null;
      }

      const positions: DefiPositionItem[] = [];

      if (collateralUsd > 0.01) {
        positions.push({
          id: "aave-v3-collateral",
          name: "Supplied Collateral",
          category: "Lending",
          chainSlug: "ethereum",
          tokens: [
            {
              symbol: "USD Collateral",
              amount: collateralUsd.toFixed(2),
              valueUsd: collateralUsd.toFixed(2)
            }
          ],
          valueUsd: collateralUsd.toFixed(2),
          details: { ltv: `${Number(ltv) / 100}%` }
        });
      }

      if (debtUsd > 0.01) {
        positions.push({
          id: "aave-v3-debt",
          name: "Total Borrowed Debt",
          category: "Lending",
          chainSlug: "ethereum",
          tokens: [
            { symbol: "USD Debt", amount: debtUsd.toFixed(2), valueUsd: debtUsd.toFixed(2) }
          ],
          valueUsd: `-${debtUsd.toFixed(2)}`,
          details: {
            healthFactor:
              healthFactor > 100000000000000000000n
                ? "Safe"
                : (Number(healthFactor) / 1e18).toFixed(2)
          }
        });
      }

      const netUsd = Math.max(0, collateralUsd - debtUsd);

      return {
        protocolId: "aave",
        name: "Aave V3",
        category: "Lending",
        chainSlug: "ethereum",
        logo: "/assets/coins/aave.png",
        siteUrl: "https://app.aave.com",
        totalValueUsd: netUsd.toFixed(2),
        positions
      };
    } catch {
      return null;
    }
  }

  private async fetchHyperliquid(address: string): Promise<DefiProtocolGroup | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const [spotRes, perpRes] = await Promise.allSettled([
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "spotClearinghouseState", user: address }),
          signal: controller.signal
        }),
        fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "clearinghouseState", user: address }),
          signal: controller.signal
        })
      ]);

      clearTimeout(timeout);

      const positions: DefiPositionItem[] = [];
      let totalValueUsd = 0;

      // Handle spot balances
      if (spotRes.status === "fulfilled" && spotRes.value.ok) {
        const spotData = (await spotRes.value.json()) as HyperliquidSpotState;
        if (Array.isArray(spotData.balances)) {
          for (const bal of spotData.balances) {
            const amount = parseFloat(bal.total) || 0;
            if (amount > 0) {
              let valUsd = parseFloat(bal.entryNtl) || 0;
              if (valUsd === 0) {
                if (bal.coin.includes("USD")) valUsd = amount;
                else if (bal.coin === "HYPE") valUsd = amount * 65.0;
              }
              totalValueUsd += valUsd;

              positions.push({
                id: `hl-spot-${bal.coin.toLowerCase()}`,
                name: bal.coin,
                category: "Deposit",
                chainSlug: "hyperliquid",
                tokens: [
                  {
                    symbol: bal.coin,
                    amount: bal.total,
                    valueUsd: valUsd > 0 ? valUsd.toFixed(2) : undefined
                  }
                ],
                valueUsd: valUsd > 0 ? valUsd.toFixed(2) : "0.00",
                details: { hold: bal.hold, entryNtl: bal.entryNtl }
              });
            }
          }
        }
      }

      // Handle perpetual margin & positions
      if (perpRes.status === "fulfilled" && perpRes.value.ok) {
        const perpData = (await perpRes.value.json()) as HyperliquidClearinghouseState;
        const margin = perpData.marginSummary;
        const acctVal = parseFloat(margin?.accountValue ?? "0") || 0;

        if (acctVal > 0) {
          totalValueUsd += acctVal;
          positions.push({
            id: "hl-perp-margin",
            name: "Perpetuals Margin Account",
            category: "Perpetuals",
            chainSlug: "hyperliquid",
            tokens: [
              {
                symbol: "USDC",
                amount: margin?.withdrawable ?? margin?.accountValue ?? "0",
                valueUsd: acctVal.toFixed(2)
              }
            ],
            valueUsd: acctVal.toFixed(2),
            details: {
              accountValue: margin?.accountValue,
              totalMarginUsed: margin?.totalMarginUsed,
              withdrawable: margin?.withdrawable
            }
          });
        }

        if (Array.isArray(perpData.assetPositions)) {
          for (const ap of perpData.assetPositions) {
            const pos = ap.position;
            if (pos && parseFloat(pos.szi ?? "0") !== 0) {
              const posVal = parseFloat(pos.positionValue ?? "0") || 0;
              positions.push({
                id: `hl-pos-${pos.coin?.toLowerCase()}`,
                name: `${pos.coin} Perp`,
                category: "Perpetuals",
                chainSlug: "hyperliquid",
                tokens: [
                  {
                    symbol: pos.coin ?? "PERP",
                    amount: pos.szi ?? "0",
                    valueUsd: posVal.toFixed(2)
                  }
                ],
                valueUsd: posVal.toFixed(2),
                details: {
                  entryPrice: pos.entryPx,
                  liquidationPrice: pos.liquidationPx,
                  unrealizedPnl: pos.unrealizedPnl,
                  leverage: pos.leverage?.value
                }
              });
            }
          }
        }
      }

      if (positions.length === 0) {
        return null;
      }

      return {
        protocolId: "hyperliquid",
        name: "Hyperliquid",
        category: "Perpetuals",
        chainSlug: "hyperliquid",
        logo: "/assets/coins/hyperliquid.svg",
        siteUrl: "https://app.hyperliquid.xyz",
        totalValueUsd: totalValueUsd.toFixed(2),
        positions
      };
    } catch {
      return null;
    }
  }
}
