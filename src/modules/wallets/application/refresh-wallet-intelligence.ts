import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import type { Clock } from "../../../shared/application/clock.js";
import type { WalletSnapshot } from "../domain/wallet-snapshot.js";
import type { PriceProvider } from "./ports/price-provider.js";
import type { WalletCache } from "./ports/wallet-cache.js";
import type { WalletRepository } from "./ports/wallet-repository.js";
import { applyUsdPricing } from "./price-snapshot.js";

export class RefreshWalletIntelligence {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly priceProvider: PriceProvider,
    private readonly repository: WalletRepository,
    private readonly cache: WalletCache,
    private readonly clock: Clock,
    private readonly freshnessSeconds: number
  ) {}

  public async execute(chain: string, address: string): Promise<WalletSnapshot> {
    const provider = this.providers.get(chain);
    const wallet = provider.normalizeAddress(address);
    const data = await provider.fetchWalletData(wallet);

    const quote = await this.priceProvider.getUsdPrices({
      chainId: wallet.chain.id,
      nativeSymbol: data.nativeSymbol,
      tokenAddresses: data.holdings.map((holding) => holding.tokenAddress)
    });
    const priced = applyUsdPricing(data, quote);

    const capturedAt = this.clock.now();
    const snapshot: WalletSnapshot = {
      wallet,
      status: priced.status,
      nativeBalance: data.nativeBalance,
      nativeSymbol: data.nativeSymbol,
      provider: data.provider,
      ...(data.blockNumber !== undefined ? { blockNumber: data.blockNumber } : {}),
      ...(priced.nativeValueUsd !== undefined ? { nativeValueUsd: priced.nativeValueUsd } : {}),
      ...(priced.totalValueUsd !== undefined ? { totalValueUsd: priced.totalValueUsd } : {}),
      holdings: priced.holdings,
      transactions: data.transactions,
      positions: data.positions,
      signals: data.signals,
      capturedAt,
      expiresAt: new Date(capturedAt.getTime() + this.freshnessSeconds * 1000)
    };

    await this.repository.save(snapshot);
    await this.cache.set(snapshot);
    return snapshot;
  }
}
