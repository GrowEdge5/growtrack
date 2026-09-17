import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

import type { Environment } from "../config/env.js";
import { createPrismaClient } from "../infrastructure/database/prisma.js";
import { BullMqWalletRefreshQueue } from "../infrastructure/queue/bullmq-wallet-refresh-queue.js";
import { createRedisClient } from "../infrastructure/redis/redis.js";
import { DefaultChainProviderRegistry } from "../modules/chains/infrastructure/chain-provider-registry.js";
import type { ChainProviderRegistry } from "../modules/chains/application/ports/chain-data-provider.js";
import { AlgorandChainDataProvider } from "../modules/chains/infrastructure/algorand/algorand-chain-data-provider.js";
import { ALGORAND_MAINNET_CHAIN_ID } from "../modules/chains/infrastructure/algorand/algorand-asset-list.js";
import {
  BITCOIN_MAINNET_CHAIN_ID,
  SOLANA_MAINNET_CHAIN_ID
} from "../modules/chains/infrastructure/chain-ids.js";
import { BitcoinChainDataProvider } from "../modules/chains/infrastructure/bitcoin/bitcoin-chain-data-provider.js";
import { SolanaChainDataProvider } from "../modules/chains/infrastructure/solana/solana-chain-data-provider.js";
import { SolanaTokenMetadataSource } from "../modules/chains/infrastructure/solana/solana-token-metadata.js";
import { ViemChainDataProvider } from "../modules/chains/infrastructure/evm/viem-chain-data-provider.js";
import { GetPortfolioReport } from "../modules/wallets/application/get-portfolio-report.js";
import { GetWalletIntelligence } from "../modules/wallets/application/get-wallet-intelligence.js";
import { RefreshWalletIntelligence } from "../modules/wallets/application/refresh-wallet-intelligence.js";
import { RequestWalletRefresh } from "../modules/wallets/application/request-wallet-refresh.js";
import { createPaymentBuilders } from "../modules/payments/application/payment-requirements-builder.js";
import type { PaymentRequirementsBuilder } from "../modules/payments/application/payment-requirements-builder.js";
import {
  buildPaidResources,
  type PaidResourceDefinition,
  type PaidResourceId
} from "../modules/payments/domain/paid-resource.js";
import type { PaymentFacilitator } from "../modules/payments/application/ports/payment-facilitator.js";
import { HttpPaymentFacilitator } from "../modules/payments/infrastructure/http-payment-facilitator.js";
import { RedisWalletCache } from "../modules/wallets/infrastructure/cache/redis-wallet-cache.js";
import { PrismaWalletRepository } from "../modules/wallets/infrastructure/persistence/prisma-wallet-repository.js";
import { DefiLlamaPriceProvider } from "../modules/wallets/infrastructure/pricing/defillama-price-provider.js";
import { systemClock } from "../shared/application/clock.js";

export interface ApplicationContainer {
  env: Environment;
  prisma: PrismaClient;
  redis: Redis;
  refreshQueue: BullMqWalletRefreshQueue;
  // The wired read providers. Exposed so discovery routes can enumerate what this
  // deployment actually supports instead of hardcoding a chain list.
  chainProviders: ChainProviderRegistry;
  getWalletIntelligence: GetWalletIntelligence;
  requestWalletRefresh: RequestWalletRefresh;
  refreshWalletIntelligence: RefreshWalletIntelligence;
  getPortfolioReport: GetPortfolioReport;
  // One x402 requirements builder per priced resource, keyed by resource id. Each
  // route reads its own entry, which is what makes the Composite Entry's endpoints
  // independently priced while all settling to the single merchant payTo.
  // The priced capabilities themselves, not just their builders. Exposed so the
  // agent-facing discovery surfaces (llms.txt, /.well-known/x402) can publish the
  // same prices and descriptions the payment layer enforces.
  paidResources: readonly PaidResourceDefinition[];
  paymentBuilders: ReadonlyMap<PaidResourceId, PaymentRequirementsBuilder>;
  paymentFacilitator: PaymentFacilitator;
  connect(): Promise<void>;
  close(): Promise<void>;
}

// The priced resources a deploy must be able to charge for. Checked at startup so a
// missing builder fails loudly at boot instead of silently serving a paid route
// ungated — the one failure mode that would cost real money.
const REQUIRED_PAID_RESOURCE_IDS: readonly PaidResourceId[] = [
  "wallet-live",
  "portfolio-snapshot",
  "portfolio-report"
];

// Resolves the builder for one priced route. Throws rather than returning
// undefined so no route can accidentally install a guard with nothing to charge.
export function paidResourceBuilder(
  container: ApplicationContainer,
  id: PaidResourceId
): PaymentRequirementsBuilder {
  const builder = container.paymentBuilders.get(id);
  if (builder === undefined) {
    throw new Error(`No x402 payment requirements builder registered for resource '${id}'`);
  }
  return builder;
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
  const solanaProvider = new SolanaChainDataProvider({
    chainId: SOLANA_MAINNET_CHAIN_ID,
    chainName: env.SOLANA_CHAIN_NAME,
    rpcUrl: env.SOLANA_RPC_URL,
    timeoutMs: env.PROVIDER_TIMEOUT_MS,
    tokenMetadata: new SolanaTokenMetadataSource({ tokenListUrl: env.SOLANA_TOKEN_LIST_URL })
  });
  const bitcoinProvider = new BitcoinChainDataProvider({
    chainId: BITCOIN_MAINNET_CHAIN_ID,
    chainName: env.BITCOIN_CHAIN_NAME,
    apiUrl: env.BITCOIN_API_URL,
    timeoutMs: env.PROVIDER_TIMEOUT_MS,
    ...(env.BITCOIN_FALLBACK_API_URL !== undefined
      ? { fallbackApiUrl: env.BITCOIN_FALLBACK_API_URL }
      : {})
  });
  const providers = new DefaultChainProviderRegistry([
    provider,
    algorandProvider,
    solanaProvider,
    bitcoinProvider
  ]);
  const priceProvider = new DefiLlamaPriceProvider({
    baseUrl: env.PRICE_API_BASE_URL,
    timeoutMs: env.PRICE_TIMEOUT_MS
  });
  const repository = new PrismaWalletRepository(prisma);
  const cache = new RedisWalletCache(redis, env.CACHE_TTL_SECONDS);
  const refreshQueue = new BullMqWalletRefreshQueue(redis);
  // The advertised chain vocabulary comes from the wired providers, so the
  // discovery schema can never list a chain the process cannot actually read.
  const paidResources = buildPaidResources({
    chainSlugs: providers.list().map((entry) => entry.chain.slug)
  });
  // Merchant-level x402 config: everything shared by every priced resource. Prices
  // and Bazaar descriptions are NOT here — they belong to each resource definition,
  // so this config stays identical across the composite's endpoints (which is what
  // keeps them rolled up under one merchant).
  const paymentBuilders = createPaymentBuilders(
    {
      network: env.X402_NETWORK,
      asset: env.X402_ASSET_ID,
      assetDecimals: env.X402_ASSET_DECIMALS,
      // env's superRefine guarantees X402_PAY_TO is present when enabled; this ""
      // fallback only applies while x402 is disabled (the guard never builds
      // requirements in that state), so an empty payTo can never reach a client.
      payTo: env.X402_PAY_TO ?? "",
      feePayer: env.X402_FEE_PAYER,
      maxTimeoutSeconds: env.X402_MAX_TIMEOUT_SECONDS,
      tag: env.X402_TAG,
      assetName: env.X402_ASSET_NAME,
      // Optional (exactOptionalPropertyTypes): only pass when configured so the
      // builders can omit `resource` where no public URL exists.
      ...(env.X402_PUBLIC_BASE_URL !== undefined
        ? { publicBaseUrl: env.X402_PUBLIC_BASE_URL }
        : {}),
      ...(env.X402_RESOURCE_URL !== undefined ? { legacyResourceUrl: env.X402_RESOURCE_URL } : {})
    },
    paidResources
  );

  for (const id of REQUIRED_PAID_RESOURCE_IDS) {
    if (!paymentBuilders.has(id)) {
      throw new Error(
        `Paid resource '${id}' is required but was not registered by buildPaidResources()`
      );
    }
  }
  // HTTP client for the official GoPlausible facilitator (verify + settle). Wired
  // into the x402 guard so a supplied PAYMENT-SIGNATURE can be validated and
  // broadcast. Reuses the shared provider timeout for its calls.
  const paymentFacilitator = new HttpPaymentFacilitator({
    facilitatorUrl: env.X402_FACILITATOR_URL,
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });

  const refreshWalletIntelligence = new RefreshWalletIntelligence(
    providers,
    priceProvider,
    repository,
    cache,
    systemClock,
    env.WALLET_FRESHNESS_SECONDS
  );

  return {
    env,
    prisma,
    redis,
    refreshQueue,
    chainProviders: providers,
    paidResources,
    getWalletIntelligence: new GetWalletIntelligence(providers, cache, repository, systemClock),
    requestWalletRefresh: new RequestWalletRefresh(providers, refreshQueue, systemClock),
    refreshWalletIntelligence,
    // Aggregates the same refresh path across several wallets/chains — the
    // capability the paid portfolio routes sell.
    getPortfolioReport: new GetPortfolioReport(providers, refreshWalletIntelligence, systemClock),
    paymentBuilders,
    paymentFacilitator,
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
