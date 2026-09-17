import { describe, expect, it, vi } from "vitest";

import type {
  ChainDataProvider,
  ChainProviderRegistry
} from "../../../../src/modules/chains/application/ports/chain-data-provider.js";
import type { RefreshWalletIntelligence } from "../../../../src/modules/wallets/application/refresh-wallet-intelligence.js";
import { GetPortfolioReport } from "../../../../src/modules/wallets/application/get-portfolio-report.js";
import type { WalletSnapshot } from "../../../../src/modules/wallets/domain/wallet-snapshot.js";

const now = new Date("2026-09-17T09:30:00.000Z");
const EVM_ADDRESS = "0xd8dA680F17485f5fE14a58674455179eBBfC1F40";

function fakeProvider(slug: string, namespace: string, nativeDecimals: number): ChainDataProvider {
  return {
    chain: { id: 1, slug, namespace, nativeSymbol: slug.toUpperCase() },
    nativeDecimals,
    normalizeAddress: () => {
      throw new Error("normalizeAddress is not exercised by this test");
    },
    fetchWalletData: async () => {
      throw new Error("fetchWalletData is not exercised by this test");
    }
  };
}

function snapshot(
  chainSlug: string,
  namespace: string,
  totalValueUsd: string | undefined,
  holdings: WalletSnapshot["holdings"]
): WalletSnapshot {
  return {
    wallet: {
      chain: { id: 1, slug: chainSlug, namespace, nativeSymbol: "X" },
      canonicalAddress: `addr-${chainSlug}`,
      displayAddress: `addr-${chainSlug}`
    },
    status: "complete",
    nativeBalance: "1000000",
    nativeSymbol: "X",
    provider: "test",
    ...(totalValueUsd !== undefined ? { totalValueUsd } : {}),
    holdings,
    transactions: [],
    positions: [],
    signals: [],
    capturedAt: now,
    expiresAt: now
  };
}

interface Harness {
  service: GetPortfolioReport;
  execute: ReturnType<typeof vi.fn>;
}

function harness(
  responses: Readonly<Record<string, WalletSnapshot | Error>>,
  chains: readonly { slug: string; namespace: string }[] = [
    { slug: "ethereum", namespace: "eip155" },
    { slug: "solana", namespace: "solana" }
  ]
): Harness {
  const providers: ChainProviderRegistry = {
    get: (slug) => {
      const found = chains.find((chain) => chain.slug === slug.toLowerCase());
      if (found === undefined) {
        throw new Error(`unsupported chain ${slug}`);
      }
      return fakeProvider(found.slug, found.namespace, found.slug === "solana" ? 9 : 18);
    },
    list: () => chains.map((chain) => fakeProvider(chain.slug, chain.namespace, 18))
  };

  const execute = vi.fn(async (chain: string, address: string) => {
    const response = responses[`${chain}:${address}`];
    if (response === undefined) {
      throw new Error(`no stub for ${chain}:${address}`);
    }
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });

  return {
    service: new GetPortfolioReport(
      providers,
      { execute } as unknown as RefreshWalletIntelligence,
      { now: () => now }
    ),
    execute
  };
}

const walletA = snapshot("ethereum", "eip155", "10.00000000", [
  {
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    rawAmount: "5000000",
    valueUsd: "5.00000000"
  }
]);

const walletB = snapshot("solana", "solana", "30.00000000", [
  {
    tokenAddress: "mint-a",
    symbol: "USDC",
    name: "USDC",
    decimals: 6,
    rawAmount: "1000000",
    valueUsd: "30.00000000"
  },
  // Unpriced: must be listed as such and must not contribute to the total.
  { tokenAddress: "mint-b", symbol: "BONK", name: "Bonk", decimals: 5, rawAmount: "12345" }
]);

describe("GetPortfolioReport", () => {
  it("sums wallet totals into one portfolio total instead of recomputing them", async () => {
    const { service } = harness({
      "ethereum:addr-ethereum": walletA,
      "solana:addr-solana": walletB
    });

    const report = await service.execute([
      { chain: "ethereum", address: "addr-ethereum" },
      { chain: "solana", address: "addr-solana" }
    ]);

    expect(report.totals.totalValueUsd).toBe("40.00000000");
    expect(report.totals.walletCount).toBe(2);
    expect(report.totals.chainCount).toBe(2);
    expect(report.totals.pricedHoldings).toBe(2);
    expect(report.totals.unpricedHoldings).toBe(1);
  });

  it("reports each holding's share of the whole portfolio, and omits it when unpriced", async () => {
    const { service } = harness({
      "ethereum:addr-ethereum": walletA,
      "solana:addr-solana": walletB
    });

    const report = await service.execute([
      { chain: "ethereum", address: "addr-ethereum" },
      { chain: "solana", address: "addr-solana" }
    ]);

    const ethereum = report.wallets.find((wallet) => wallet.chain === "ethereum");
    expect(ethereum?.allocationPct).toBe("25.00");
    expect(ethereum?.holdings[0]?.allocationPct).toBe("12.50");

    const unpriced = report.wallets.find((wallet) => wallet.chain === "solana")?.holdings[1];
    expect(unpriced?.valueUsd).toBeUndefined();
    expect(unpriced?.allocationPct).toBeUndefined();
    expect(report.unpriced).toHaveLength(1);
    expect(report.unpriced[0]).toMatchObject({ symbol: "BONK", chain: "solana" });
  });

  it("orders chains by value so the largest exposure leads the report", async () => {
    const { service } = harness({
      "ethereum:addr-ethereum": walletA,
      "solana:addr-solana": walletB
    });

    const report = await service.execute([
      { chain: "ethereum", address: "addr-ethereum" },
      { chain: "solana", address: "addr-solana" }
    ]);

    expect(report.chains.map((chain) => chain.chain)).toEqual(["solana", "ethereum"]);
    expect(report.chains[0]?.totalValueUsd).toBe("30.00000000");
    expect(report.chains[0]?.allocationPct).toBe("75.00");
  });

  it("converts a raw native balance to whole units using the chain's own decimals", async () => {
    const { service } = harness({ "solana:addr-solana": walletB });

    const report = await service.execute([{ chain: "solana", address: "addr-solana" }]);

    // 1_000_000 lamports = 0.001 SOL
    expect(report.wallets[0]?.nativeAmount).toBe("0.001");
    expect(report.wallets[0]?.nativeBalance).toBe("1000000");
  });

  it("auto-detects the chain for a bare address", async () => {
    const { service, execute } = harness({
      "ethereum:0xd8dA680F17485f5fE14a58674455179eBBfC1F40": walletA
    });

    await service.execute([{ address: EVM_ADDRESS }]);

    expect(execute).toHaveBeenCalledWith("ethereum", EVM_ADDRESS);
  });

  it("still values the readable wallets and returns a per-target error for the rest", async () => {
    const { service } = harness({
      "ethereum:addr-ethereum": walletA,
      "solana:addr-solana": new Error("upstream exploded")
    });

    const report = await service.execute([
      { chain: "ethereum", address: "addr-ethereum" },
      { chain: "solana", address: "addr-solana" },
      { chain: "dogecoin", address: "D..." },
      { address: "definitely not an address" }
    ]);

    // The caller paid for the report; one bad entry must not void the others.
    expect(report.totals.totalValueUsd).toBe("10.00000000");
    expect(report.wallets).toHaveLength(1);
    expect(report.errors).toHaveLength(3);
    expect(report.errors.map((error) => error.code).sort()).toEqual([
      "PROVIDER_ERROR",
      "UNRECOGNIZED_ADDRESS",
      "UNSUPPORTED_CHAIN"
    ]);
  });

  it("omits a total entirely when nothing could be priced, rather than reporting zero", async () => {
    const { service } = harness({
      "solana:addr-solana": snapshot("solana", "solana", undefined, [])
    });

    const report = await service.execute([{ chain: "solana", address: "addr-solana" }]);

    expect(report.totals.totalValueUsd).toBeUndefined();
    expect(report.wallets[0]?.allocationPct).toBeUndefined();
  });
});
