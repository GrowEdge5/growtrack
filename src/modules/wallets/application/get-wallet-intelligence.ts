import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import type { Clock } from "../../../shared/application/clock.js";
import { WalletNotFoundError } from "../../../shared/domain/errors.js";
import type { WalletSnapshot } from "../domain/wallet-snapshot.js";
import type { WalletCache } from "./ports/wallet-cache.js";
import type { WalletRepository } from "./ports/wallet-repository.js";

export interface WalletIntelligenceResult {
  snapshot: WalletSnapshot;
  source: "cache" | "database";
  stale: boolean;
}

export class GetWalletIntelligence {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly cache: WalletCache,
    private readonly repository: WalletRepository,
    private readonly clock: Clock
  ) {}

  public async execute(chain: string, address: string): Promise<WalletIntelligenceResult> {
    const identity = this.providers.get(chain).normalizeAddress(address);
    const cached = await this.cache.get(identity);

    if (cached) {
      return { snapshot: cached, source: "cache", stale: this.isStale(cached) };
    }

    const stored = await this.repository.findLatest(identity);
    if (!stored) {
      throw new WalletNotFoundError(chain, address);
    }

    await this.cache.set(stored);
    return { snapshot: stored, source: "database", stale: this.isStale(stored) };
  }

  private isStale(snapshot: WalletSnapshot): boolean {
    return snapshot.expiresAt.getTime() <= this.clock.now().getTime();
  }
}
