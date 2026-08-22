import { describe, expect, it, vi } from "vitest";

import type { ChainProviderRegistry } from "../../../../src/modules/chains/application/ports/chain-data-provider.js";
import type { WalletIdentity } from "../../../../src/modules/chains/domain/chain.js";
import { GetWalletIntelligence } from "../../../../src/modules/wallets/application/get-wallet-intelligence.js";
import { RefreshWalletIntelligence } from "../../../../src/modules/wallets/application/refresh-wallet-intelligence.js";
import { RequestWalletRefresh } from "../../../../src/modules/wallets/application/request-wallet-refresh.js";
import type { WalletCache } from "../../../../src/modules/wallets/application/ports/wallet-cache.js";
import type { WalletRefreshQueue } from "../../../../src/modules/wallets/application/ports/wallet-refresh-queue.js";
import type { WalletRepository } from "../../../../src/modules/wallets/application/ports/wallet-repository.js";
import type { PriceProvider } from "../../../../src/modules/wallets/application/ports/price-provider.js";
import type { WalletSnapshot } from "../../../../src/modules/wallets/domain/wallet-snapshot.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const identity: WalletIdentity = {
  chain: { id: 1, slug: "ethereum", namespace: "eip155", nativeSymbol: "ETH" },
  canonicalAddress: "0x0000000000000000000000000000000000000001",
  displayAddress: "0x0000000000000000000000000000000000000001"
};

function snapshot(expiresAt = new Date("2026-01-01T00:15:00.000Z")): WalletSnapshot {
  return {
    wallet: identity,
    status: "complete",
    nativeBalance: "42",
    nativeSymbol: "ETH",
    provider: "test",
    capturedAt: now,
    expiresAt,
    holdings: [],
    transactions: [],
    positions: [],
    signals: []
  };
}

function dependencies() {
  const provider = {
    chain: identity.chain,
    normalizeAddress: vi.fn(() => identity),
    fetchWalletData: vi.fn(async () => ({
      nativeBalance: "42",
      nativeSymbol: "ETH",
      provider: "test",
      holdings: [],
      transactions: [],
      positions: [],
      signals: []
    }))
  };
  const providers: ChainProviderRegistry = { get: vi.fn(() => provider) };
  const cache: WalletCache = { get: vi.fn(async () => null), set: vi.fn(async () => undefined) };
  const repository: WalletRepository = {
    findLatest: vi.fn(async () => null),
    save: vi.fn(async () => undefined)
  };
  const queue: WalletRefreshQueue = {
    enqueue: vi.fn(async () => ({ jobId: "refresh-1" }))
  };
  const priceProvider: PriceProvider = {
    getUsdPrices: vi.fn(async () => ({ tokenUsd: {} }))
  };

  return { provider, providers, cache, repository, queue, priceProvider };
}

describe("wallet intelligence application services", () => {
  it("returns cached data and reports staleness", async () => {
    const deps = dependencies();
    vi.mocked(deps.cache.get).mockResolvedValue(snapshot(new Date("2025-12-31T23:59:00.000Z")));
    const service = new GetWalletIntelligence(deps.providers, deps.cache, deps.repository, {
      now: () => now
    });

    const result = await service.execute("ethereum", identity.displayAddress);

    expect(result.source).toBe("cache");
    expect(result.stale).toBe(true);
    expect(deps.repository.findLatest).not.toHaveBeenCalled();
  });

  it("normalizes and enqueues a versioned refresh request", async () => {
    const deps = dependencies();
    const service = new RequestWalletRefresh(deps.providers, deps.queue, { now: () => now });

    await expect(service.execute("ethereum", identity.displayAddress)).resolves.toEqual({
      jobId: "refresh-1"
    });
    expect(deps.queue.enqueue).toHaveBeenCalledWith({
      version: 1,
      chain: "ethereum",
      address: identity.canonicalAddress,
      requestedAt: now.toISOString()
    });
  });

  it("persists and caches a provider snapshot", async () => {
    const deps = dependencies();
    const service = new RefreshWalletIntelligence(
      deps.providers,
      deps.priceProvider,
      deps.repository,
      deps.cache,
      { now: () => now },
      900
    );

    const result = await service.execute("ethereum", identity.displayAddress);

    expect(result.expiresAt.toISOString()).toBe("2026-01-01T00:15:00.000Z");
    expect(deps.repository.save).toHaveBeenCalledWith(result);
    expect(deps.cache.set).toHaveBeenCalledWith(result);
  });
});
