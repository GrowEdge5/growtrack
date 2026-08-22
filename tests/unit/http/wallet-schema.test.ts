import { describe, expect, it } from "vitest";

import { walletResponseSchema } from "../../../src/http/routes/v1/wallet.schemas.js";

// The Fastify response serializer runs this schema over the outgoing payload, and
// zod strips any field the schema does not declare. These tests lock in that the
// USD fields survive serialization — the exact regression M3 fixes, where
// totalValueUsd was previously dropped and holdings were untyped.
const baseData = {
  wallet: {
    chain: { id: 1, slug: "ethereum", namespace: "eip155", nativeSymbol: "ETH" },
    canonicalAddress: "0x0000000000000000000000000000000000000001",
    displayAddress: "0x0000000000000000000000000000000000000001"
  },
  status: "complete" as const,
  nativeBalance: "1500000000000000000",
  nativeSymbol: "ETH",
  provider: "viem-rpc",
  capturedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-01T00:15:00.000Z",
  transactions: [],
  positions: [],
  signals: []
};

const meta = { source: "database" as const, stale: false };

describe("walletResponseSchema", () => {
  it("preserves totalValueUsd and per-holding valueUsd through serialization", () => {
    const parsed = walletResponseSchema.parse({
      data: {
        ...baseData,
        totalValueUsd: "4037.00000000",
        holdings: [
          {
            tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            rawAmount: "37000000",
            valueUsd: "37.00000000"
          }
        ]
      },
      meta
    });

    expect(parsed.data.totalValueUsd).toBe("4037.00000000");
    expect(parsed.data.holdings[0]?.valueUsd).toBe("37.00000000");
  });

  it("omits totalValueUsd and valueUsd when they are absent, without inventing zeros", () => {
    const parsed = walletResponseSchema.parse({
      data: {
        ...baseData,
        status: "partial" as const,
        holdings: [
          {
            tokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
            rawAmount: "500000000000000000"
          }
        ]
      },
      meta
    });

    expect(parsed.data.totalValueUsd).toBeUndefined();
    expect(parsed.data.holdings[0]?.valueUsd).toBeUndefined();
  });
});
