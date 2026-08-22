import { describe, expect, it } from "vitest";

import type { PriceQuote } from "../../../../src/modules/wallets/application/ports/price-provider.js";
import { applyUsdPricing } from "../../../../src/modules/wallets/application/price-snapshot.js";
import type { TokenHolding } from "../../../../src/modules/wallets/domain/wallet-snapshot.js";

const USDC: TokenHolding = {
  tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  rawAmount: "37000000" // 37 USDC
};

const WETH: TokenHolding = {
  tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  symbol: "WETH",
  name: "Wrapped Ether",
  decimals: 18,
  rawAmount: "500000000000000000" // 0.5 WETH
};

const wallet = {
  nativeBalance: "1500000000000000000", // 1.5 ETH
  holdings: [USDC, WETH]
};

describe("applyUsdPricing", () => {
  it("values native currency and every priced holding, then totals them", () => {
    const quote: PriceQuote = {
      nativeUsd: 2000,
      tokenUsd: {
        [USDC.tokenAddress]: 1,
        [WETH.tokenAddress]: 2000
      }
    };

    const result = applyUsdPricing(wallet, quote);

    expect(result.holdings[0]?.valueUsd).toBe("37.00000000");
    expect(result.holdings[1]?.valueUsd).toBe("1000.00000000");
    // 1.5 ETH * 2000 + 37 USDC + 0.5 WETH * 2000 = 4037
    expect(result.totalValueUsd).toBe("4037.00000000");
    // native + every holding priced => complete
    expect(result.status).toBe("complete");
  });

  it("never fabricates a missing price and excludes it from the total", () => {
    const quote: PriceQuote = {
      nativeUsd: 2000,
      tokenUsd: {
        [USDC.tokenAddress]: 1
        // WETH intentionally left unpriced
      }
    };

    const result = applyUsdPricing(wallet, quote);

    expect(result.holdings[0]?.valueUsd).toBe("37.00000000");
    expect(result.holdings[1]?.valueUsd).toBeUndefined();
    // 1.5 ETH * 2000 + 37 USDC = 3037 (WETH excluded, not zero-filled)
    expect(result.totalValueUsd).toBe("3037.00000000");
    // a holding without a price => partial
    expect(result.status).toBe("partial");
  });

  it("returns no total when nothing can be priced", () => {
    const result = applyUsdPricing(wallet, { tokenUsd: {} });

    expect(result.holdings[0]?.valueUsd).toBeUndefined();
    expect(result.holdings[1]?.valueUsd).toBeUndefined();
    expect(result.totalValueUsd).toBeUndefined();
    expect(result.status).toBe("partial");
  });

  it("reports partial when the native price is missing even if all tokens are priced", () => {
    const quote: PriceQuote = {
      // nativeUsd intentionally absent
      tokenUsd: {
        [USDC.tokenAddress]: 1,
        [WETH.tokenAddress]: 2000
      }
    };

    const result = applyUsdPricing(wallet, quote);

    expect(result.holdings[0]?.valueUsd).toBe("37.00000000");
    expect(result.holdings[1]?.valueUsd).toBe("1000.00000000");
    // native excluded from the total, and its absence downgrades status
    expect(result.totalValueUsd).toBe("1037.00000000");
    expect(result.status).toBe("partial");
  });

  it("is complete for a token-less wallet once the native balance is priced", () => {
    const nativeOnly = { nativeBalance: "1500000000000000000", holdings: [] };

    const result = applyUsdPricing(nativeOnly, { nativeUsd: 2000, tokenUsd: {} });

    expect(result.totalValueUsd).toBe("3000.00000000");
    expect(result.status).toBe("complete");
  });
});
