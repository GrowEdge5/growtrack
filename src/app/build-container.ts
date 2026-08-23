import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

import type { Environment } from "../config/env.js";
import { createPrismaClient } from "../infrastructure/database/prisma.js";
import { BullMqWalletRefreshQueue } from "../infrastructure/queue/bullmq-wallet-refresh-queue.js";
import { createRedisClient } from "../infrastructure/redis/redis.js";
import { DefaultChainProviderRegistry } from "../modules/chains/infrastructure/chain-provider-registry.js";
import { AlgorandChainDataProvider } from "../modules/chains/infrastructure/algorand/algorand-chain-data-provider.js";
import { ALGORAND_MAINNET_CHAIN_ID } from "../modules/chains/infrastructure/algorand/algorand-asset-list.js";
import { ViemChainDataProvider } from "../modules/chains/infrastructure/evm/viem-chain-data-provider.js";
import { GetWalletIntelligence } from "../modules/wallets/application/get-wallet-intelligence.js";
import { RefreshWalletIntelligence } from "../modules/wallets/application/refresh-wallet-intelligence.js";
import { RequestWalletRefresh } from "../modules/wallets/application/request-wallet-refresh.js";
import { RedisWalletCache } from "../modules/wallets/infrastructure/cache/redis-wallet-cache.js";
import { PrismaWalletRepository } from "../modules/wallets/infrastructure/persistence/prisma-wallet-repository.js";
import { DefiLlamaPriceProvider } from "../modules/wallets/infrastructure/pricing/defillama-price-provider.js";
import { systemClock } from "../shared/application/clock.js";

export interface ApplicationContainer {
  env: Environment;
  prisma: PrismaClient;
  redis: Redis;
  refreshQueue: BullMqWalletRefreshQueue;
  getWalletIntelligence: GetWalletIntelligence;
  requestWalletRefresh: RequestWalletRefresh;
  refreshWalletIntelligence: RefreshWalletIntelligence;
  connect(): Promise<void>;
  close(): Promise<void>;
}

export function buildContainer(env: Environment): ApplicationContainer {
  const prisma = createPrismaClient();
  const redis = createRedisClient(env.REDIS_URL);
  const provider = new ViemChainDataProvider({
    chainId: env.EVM_CHAIN_ID,
    chainName: env.EVM_CHAIN_NAME,
    nativeSymbol: "ETH",
    rpcUrl: env.EVM_RPC_URL,
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const algorandProvider = new AlgorandChainDataProvider({
    chainId: ALGORAND_MAINNET_CHAIN_ID,
    chainName: env.ALGORAND_CHAIN_NAME,
    apiUrl: env.ALGORAND_API_URL,
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const providers = new DefaultChainProviderRegistry([provider, algorandProvider]);
  const priceProvider = new DefiLlamaPriceProvider({
    baseUrl: env.PRICE_API_BASE_URL,
    timeoutMs: env.PRICE_TIMEOUT_MS
  });
  const repository = new PrismaWalletRepository(prisma);
  const cache = new RedisWalletCache(redis, env.CACHE_TTL_SECONDS);
  const refreshQueue = new BullMqWalletRefreshQueue(redis);

  return {
    env,
    prisma,
    redis,
    refreshQueue,
    getWalletIntelligence: new GetWalletIntelligence(providers, cache, repository, systemClock),
    requestWalletRefresh: new RequestWalletRefresh(providers, refreshQueue, systemClock),
    refreshWalletIntelligence: new RefreshWalletIntelligence(
      providers,
      priceProvider,
      repository,
      cache,
      systemClock,
      env.WALLET_FRESHNESS_SECONDS
    ),
    async connect() {
      // BullMQ shares this ioredis client and eagerly initiates its connection during
      // Queue construction, so an unconditional redis.connect() here throws
      // "Redis is already connecting/connected". Only trigger the connection when the
      // client is still idle, and tolerate losing the race to BullMQ.
      const redisAlreadyLive =
        redis.status === "connecting" || redis.status === "connect" || redis.status === "ready";
      const connectRedis = redisAlreadyLive
        ? Promise.resolve()
        : redis.connect().catch((error: unknown) => {
            if (error instanceof Error && /already connect/i.test(error.message)) {
              return;
            }
            throw error;
          });
      await Promise.all([prisma.$connect(), connectRedis]);
    },
    async close() {
      await Promise.allSettled([refreshQueue.queue.close(), redis.quit(), prisma.$disconnect()]);
    }
  };
}
