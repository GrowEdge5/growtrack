import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import type { Clock } from "../../../shared/application/clock.js";
import type { EnqueuedRefresh, WalletRefreshQueue } from "./ports/wallet-refresh-queue.js";

export class RequestWalletRefresh {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly queue: WalletRefreshQueue,
    private readonly clock: Clock
  ) {}

  public async execute(chain: string, address: string): Promise<EnqueuedRefresh> {
    const identity = this.providers.get(chain).normalizeAddress(address);

    return this.queue.enqueue({
      version: 1,
      chain: identity.chain.slug,
      address: identity.canonicalAddress,
      requestedAt: this.clock.now().toISOString()
    });
  }
}
