import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import type { Clock } from "../../../shared/application/clock.js";
import type { WalletSnapshot } from "../domain/wallet-snapshot.js";
import type { WalletCache } from "./ports/wallet-cache.js";
import type { WalletRepository } from "./ports/wallet-repository.js";

export class RefreshWalletIntelligence {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly repository: WalletRepository,
    private readonly cache: WalletCache,
    private readonly clock: Clock,
    private readonly freshnessSeconds: number
  ) {}

  public async execute(chain: string, address: string): Promise<WalletSnapshot> {
    const provider = this.providers.get(chain);
    const wallet = provider.normalizeAddress(address);
    const data = await provider.fetchWalletData(wallet);
    const capturedAt = this.clock.now();
    const snapshot: WalletSnapshot = {
      wallet,
      ...data,
      capturedAt,
      expiresAt: new Date(capturedAt.getTime() + this.freshnessSeconds * 1000)
    };

    await this.repository.save(snapshot);
    await this.cache.set(snapshot);
    return snapshot;
  }
}
