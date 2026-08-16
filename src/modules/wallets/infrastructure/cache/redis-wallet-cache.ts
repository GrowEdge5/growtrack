import type { Redis } from "ioredis";

import type { WalletIdentity } from "../../../chains/domain/chain.js";
import type { WalletCache } from "../../application/ports/wallet-cache.js";
import type { WalletSnapshot } from "../../domain/wallet-snapshot.js";

type SerializedSnapshot = Omit<WalletSnapshot, "capturedAt" | "expiresAt"> & {
  capturedAt: string;
  expiresAt: string;
};

export class RedisWalletCache implements WalletCache {
  public constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number
  ) {}

  public async get(identity: WalletIdentity): Promise<WalletSnapshot | null> {
    const raw = await this.redis.get(this.key(identity));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SerializedSnapshot;
    return {
      ...parsed,
      capturedAt: new Date(parsed.capturedAt),
      expiresAt: new Date(parsed.expiresAt)
    };
  }

  public async set(snapshot: WalletSnapshot): Promise<void> {
    const value: SerializedSnapshot = {
      ...snapshot,
      capturedAt: snapshot.capturedAt.toISOString(),
      expiresAt: snapshot.expiresAt.toISOString()
    };
    await this.redis.set(this.key(snapshot.wallet), JSON.stringify(value), "EX", this.ttlSeconds);
  }

  private key(identity: WalletIdentity): string {
    return `growtrack:wallet:${identity.chain.slug}:${identity.canonicalAddress}`;
  }
}
