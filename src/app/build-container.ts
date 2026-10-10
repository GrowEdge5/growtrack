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
  APECHAIN_MAINNET_CHAIN_ID,
  ARBITRUM_MAINNET_CHAIN_ID,
  ARC_MAINNET_CHAIN_ID,
  AVALANCHE_MAINNET_CHAIN_ID,
  BASE_MAINNET_CHAIN_ID,
  BERACHAIN_MAINNET_CHAIN_ID,
  BITCOIN_MAINNET_CHAIN_ID,
  BLAST_MAINNET_CHAIN_ID,
  BSC_MAINNET_CHAIN_ID,
  CELO_MAINNET_CHAIN_ID,
  CORE_MAINNET_CHAIN_ID,
  CRONOS_MAINNET_CHAIN_ID,
  CYBER_MAINNET_CHAIN_ID,
  FANTOM_MAINNET_CHAIN_ID,
  FUSE_MAINNET_CHAIN_ID,
  GNOSIS_MAINNET_CHAIN_ID,
  HEMI_MAINNET_CHAIN_ID,
  HYPERLIQUID_EVM_CHAIN_ID,
  IMMUTABLE_MAINNET_CHAIN_ID,
  INK_MAINNET_CHAIN_ID,
  LINEA_MAINNET_CHAIN_ID,
  MANTLE_MAINNET_CHAIN_ID,
  MODE_MAINNET_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
  OPBNB_MAINNET_CHAIN_ID,
  OPTIMISM_MAINNET_CHAIN_ID,
  PLASMA_MAINNET_CHAIN_ID,
  PLUME_MAINNET_CHAIN_ID,
  POLYGON_MAINNET_CHAIN_ID,
  ROBINHOOD_MAINNET_CHAIN_ID,
  SCROLL_MAINNET_CHAIN_ID,
  SEI_MAINNET_CHAIN_ID,
  SOLANA_MAINNET_CHAIN_ID,
  SONIC_MAINNET_CHAIN_ID,
  TAIKO_MAINNET_CHAIN_ID,
  UNICHAIN_MAINNET_CHAIN_ID,
  XLAYER_MAINNET_CHAIN_ID,
  ZETACHAIN_MAINNET_CHAIN_ID,
  ZIRCUIT_MAINNET_CHAIN_ID,
  ZKSYNC_MAINNET_CHAIN_ID,
  ZORA_MAINNET_CHAIN_ID
} from "../modules/chains/infrastructure/chain-ids.js";
import { BitcoinChainDataProvider } from "../modules/chains/infrastructure/bitcoin/bitcoin-chain-data-provider.js";
import { SolanaChainDataProvider } from "../modules/chains/infrastructure/solana/solana-chain-data-provider.js";
import { SolanaTokenMetadataSource } from "../modules/chains/infrastructure/solana/solana-token-metadata.js";
import { ViemChainDataProvider } from "../modules/chains/infrastructure/evm/viem-chain-data-provider.js";
import { DefiPositionService } from "../modules/defi/infrastructure/defi-position-service.js";
import { AnalyzeWallet } from "../modules/wallets/application/analyze-wallet.js";
import { GetPortfolioReport } from "../modules/wallets/application/get-portfolio-report.js";
import { GetWalletIntelligence } from "../modules/wallets/application/get-wallet-intelligence.js";
import { RefreshWalletIntelligence } from "../modules/wallets/application/refresh-wallet-intelligence.js";
import { RequestWalletRefresh } from "../modules/wallets/application/request-wallet-refresh.js";
import { createPaymentBuilders } from "../modules/payments/application/payment-requirements-builder.js";
import type { PaymentRequirementsBuilder } from "../modules/payments/application/payment-requirements-builder.js";
import { GetAlgorandPaymentParams } from "../modules/payments/application/get-algorand-payment-params.js";
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
  // The free/guest read path: an address with no chain hint and no payment, which
  // falls through to a live upstream read when nothing is cached or stored.
  analyzeWallet: AnalyzeWallet;
  requestWalletRefresh: RequestWalletRefresh;
  refreshWalletIntelligence: RefreshWalletIntelligence;
  getPortfolioReport: GetPortfolioReport;
  defiPositionService: DefiPositionService;
  // One x402 requirements builder per priced resource, keyed by resource id. Each
  // route reads its own entry, which is what makes the Composite Entry's endpoints
  // independently priced while all settling to the single merchant payTo.
  // The priced capabilities themselves, not just their builders. Exposed so the
  // agent-facing discovery surfaces (llms.txt, /.well-known/x402) can publish the
  // same prices and descriptions the payment layer enforces.
  paidResources: readonly PaidResourceDefinition[];
  paymentBuilders: ReadonlyMap<PaidResourceId, PaymentRequirementsBuilder>;
  paymentFacilitator: PaymentFacilitator;
  // Suggested params for the network this deployment charges on, handed to browser
  // clients so a signed payment can only ever be built for the priced network.
  getAlgorandPaymentParams: GetAlgorandPaymentParams;
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
  const baseProvider = new ViemChainDataProvider({
    chainId: BASE_MAINNET_CHAIN_ID,
    chainName: "Base",
    chainSlug: "base",
    nativeSymbol: "ETH",
    rpcUrl: "https://mainnet.base.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const arbitrumProvider = new ViemChainDataProvider({
    chainId: ARBITRUM_MAINNET_CHAIN_ID,
    chainName: "Arbitrum",
    chainSlug: "arbitrum",
    nativeSymbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const optimismProvider = new ViemChainDataProvider({
    chainId: OPTIMISM_MAINNET_CHAIN_ID,
    chainName: "Optimism",
    chainSlug: "optimism",
    nativeSymbol: "ETH",
    rpcUrl: "https://mainnet.optimism.io",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const polygonProvider = new ViemChainDataProvider({
    chainId: POLYGON_MAINNET_CHAIN_ID,
    chainName: "Polygon",
    chainSlug: "polygon",
    nativeSymbol: "POL",
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const bscProvider = new ViemChainDataProvider({
    chainId: BSC_MAINNET_CHAIN_ID,
    chainName: "BNB Chain",
    chainSlug: "bsc",
    nativeSymbol: "BNB",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const avalancheProvider = new ViemChainDataProvider({
    chainId: AVALANCHE_MAINNET_CHAIN_ID,
    chainName: "Avalanche",
    chainSlug: "avalanche",
    nativeSymbol: "AVAX",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const lineaProvider = new ViemChainDataProvider({
    chainId: LINEA_MAINNET_CHAIN_ID,
    chainName: "Linea",
    chainSlug: "linea",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.linea.build",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const blastProvider = new ViemChainDataProvider({
    chainId: BLAST_MAINNET_CHAIN_ID,
    chainName: "Blast",
    chainSlug: "blast",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.blast.io",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const scrollProvider = new ViemChainDataProvider({
    chainId: SCROLL_MAINNET_CHAIN_ID,
    chainName: "Scroll",
    chainSlug: "scroll",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.scroll.io",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const inkProvider = new ViemChainDataProvider({
    chainId: INK_MAINNET_CHAIN_ID,
    chainName: "Ink",
    chainSlug: "ink",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc-gel.inkonchain.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const modeProvider = new ViemChainDataProvider({
    chainId: MODE_MAINNET_CHAIN_ID,
    chainName: "Mode",
    chainSlug: "mode",
    nativeSymbol: "ETH",
    rpcUrl: "https://mainnet.mode.network",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const zoraProvider = new ViemChainDataProvider({
    chainId: ZORA_MAINNET_CHAIN_ID,
    chainName: "Zora",
    chainSlug: "zora",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.zora.energy",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const gnosisProvider = new ViemChainDataProvider({
    chainId: GNOSIS_MAINNET_CHAIN_ID,
    chainName: "Gnosis Chain",
    chainSlug: "gnosis",
    nativeSymbol: "xDAI",
    rpcUrl: "https://rpc.gnosischain.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const celoProvider = new ViemChainDataProvider({
    chainId: CELO_MAINNET_CHAIN_ID,
    chainName: "Celo",
    chainSlug: "celo",
    nativeSymbol: "CELO",
    rpcUrl: "https://forno.celo.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const seiProvider = new ViemChainDataProvider({
    chainId: SEI_MAINNET_CHAIN_ID,
    chainName: "Sei",
    chainSlug: "sei",
    nativeSymbol: "SEI",
    rpcUrl: "https://evm-rpc.sei-apis.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const sonicProvider = new ViemChainDataProvider({
    chainId: SONIC_MAINNET_CHAIN_ID,
    chainName: "Sonic",
    chainSlug: "sonic",
    nativeSymbol: "S",
    rpcUrl: "https://rpc.soniclabs.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const opbnbProvider = new ViemChainDataProvider({
    chainId: OPBNB_MAINNET_CHAIN_ID,
    chainName: "opBNB",
    chainSlug: "opbnb",
    nativeSymbol: "BNB",
    rpcUrl: "https://opbnb-mainnet-rpc.bnbchain.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const taikoProvider = new ViemChainDataProvider({
    chainId: TAIKO_MAINNET_CHAIN_ID,
    chainName: "Taiko",
    chainSlug: "taiko",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.mainnet.taiko.xyz",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const apechainProvider = new ViemChainDataProvider({
    chainId: APECHAIN_MAINNET_CHAIN_ID,
    chainName: "ApeChain",
    chainSlug: "apechain",
    nativeSymbol: "APE",
    rpcUrl: "https://apechain.calderachain.xyz/http",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const robinhoodProvider = new ViemChainDataProvider({
    chainId: ROBINHOOD_MAINNET_CHAIN_ID,
    chainName: "Robinhood",
    chainSlug: "robinhood",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const xlayerProvider = new ViemChainDataProvider({
    chainId: XLAYER_MAINNET_CHAIN_ID,
    chainName: "X Layer",
    chainSlug: "xlayer",
    nativeSymbol: "OKB",
    rpcUrl: "https://rpc.xlayer.tech",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const mantleProvider = new ViemChainDataProvider({
    chainId: MANTLE_MAINNET_CHAIN_ID,
    chainName: "Mantle",
    chainSlug: "mantle",
    nativeSymbol: "MNT",
    rpcUrl: "https://rpc.mantle.xyz",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const zksyncProvider = new ViemChainDataProvider({
    chainId: ZKSYNC_MAINNET_CHAIN_ID,
    chainName: "zkSync Era",
    chainSlug: "zksync",
    nativeSymbol: "ETH",
    rpcUrl: "https://mainnet.era.zksync.io",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const cronosProvider = new ViemChainDataProvider({
    chainId: CRONOS_MAINNET_CHAIN_ID,
    chainName: "Cronos",
    chainSlug: "cronos",
    nativeSymbol: "CRO",
    rpcUrl: "https://evm.cronos.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const fantomProvider = new ViemChainDataProvider({
    chainId: FANTOM_MAINNET_CHAIN_ID,
    chainName: "Fantom",
    chainSlug: "fantom",
    nativeSymbol: "FTM",
    rpcUrl: "https://rpc.ftm.tools",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const coreProvider = new ViemChainDataProvider({
    chainId: CORE_MAINNET_CHAIN_ID,
    chainName: "Core DAO",
    chainSlug: "core",
    nativeSymbol: "CORE",
    rpcUrl: "https://rpc.coredao.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const zetachainProvider = new ViemChainDataProvider({
    chainId: ZETACHAIN_MAINNET_CHAIN_ID,
    chainName: "ZetaChain",
    chainSlug: "zetachain",
    nativeSymbol: "ZETA",
    rpcUrl: "https://zetachain-evm.blockpi.network/v1/rpc/public",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const zircuitProvider = new ViemChainDataProvider({
    chainId: ZIRCUIT_MAINNET_CHAIN_ID,
    chainName: "Zircuit",
    chainSlug: "zircuit",
    nativeSymbol: "ETH",
    rpcUrl: "https://zircuit1-mainnet.p2pify.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const berachainProvider = new ViemChainDataProvider({
    chainId: BERACHAIN_MAINNET_CHAIN_ID,
    chainName: "Berachain",
    chainSlug: "berachain",
    nativeSymbol: "BERA",
    rpcUrl: "https://rpc.berachain.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const unichainProvider = new ViemChainDataProvider({
    chainId: UNICHAIN_MAINNET_CHAIN_ID,
    chainName: "Unichain",
    chainSlug: "unichain",
    nativeSymbol: "ETH",
    rpcUrl: "https://mainnet.unichain.org",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const hemiProvider = new ViemChainDataProvider({
    chainId: HEMI_MAINNET_CHAIN_ID,
    chainName: "Hemi",
    chainSlug: "hemi",
    nativeSymbol: "HEMI",
    rpcUrl: "https://rpc.hemi.network/rpc",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const fuseProvider = new ViemChainDataProvider({
    chainId: FUSE_MAINNET_CHAIN_ID,
    chainName: "Fuse",
    chainSlug: "fuse",
    nativeSymbol: "FUSE",
    rpcUrl: "https://rpc.fuse.io",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const cyberProvider = new ViemChainDataProvider({
    chainId: CYBER_MAINNET_CHAIN_ID,
    chainName: "Cyber",
    chainSlug: "cyber",
    nativeSymbol: "ETH",
    rpcUrl: "https://cyber.alt.technology",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const plumeProvider = new ViemChainDataProvider({
    chainId: PLUME_MAINNET_CHAIN_ID,
    chainName: "Plume",
    chainSlug: "plume",
    nativeSymbol: "ETH",
    rpcUrl: "https://phoenix-rpc.plumenetwork.xyz",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const immutableProvider = new ViemChainDataProvider({
    chainId: IMMUTABLE_MAINNET_CHAIN_ID,
    chainName: "Immutable",
    chainSlug: "immutable",
    nativeSymbol: "IMX",
    rpcUrl: "https://rpc.immutable.com",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const monadProvider = new ViemChainDataProvider({
    chainId: MONAD_TESTNET_CHAIN_ID,
    chainName: "Monad",
    chainSlug: "monad",
    nativeSymbol: "MON",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const hyperliquidProvider = new ViemChainDataProvider({
    chainId: HYPERLIQUID_EVM_CHAIN_ID,
    chainName: "Hyperliquid",
    chainSlug: "hyperliquid",
    nativeSymbol: "HYPE",
    rpcUrl: "https://rpc.hyperliquid.xyz/evm",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const arcProvider = new ViemChainDataProvider({
    chainId: ARC_MAINNET_CHAIN_ID,
    chainName: "Arc",
    chainSlug: "arc",
    nativeSymbol: "ARC",
    rpcUrl: "https://rpc.arc.market",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });
  const plasmaProvider = new ViemChainDataProvider({
    chainId: PLASMA_MAINNET_CHAIN_ID,
    chainName: "Plasma",
    chainSlug: "plasma",
    nativeSymbol: "ETH",
    rpcUrl: "https://rpc.plasma.to",
    timeoutMs: env.PROVIDER_TIMEOUT_MS
  });

  const providers = new DefaultChainProviderRegistry([
    provider,
    baseProvider,
    arbitrumProvider,
    optimismProvider,
    polygonProvider,
    bscProvider,
    avalancheProvider,
    lineaProvider,
    blastProvider,
    scrollProvider,
    inkProvider,
    modeProvider,
    zoraProvider,
    gnosisProvider,
    celoProvider,
    seiProvider,
    sonicProvider,
    opbnbProvider,
    taikoProvider,
    apechainProvider,
    robinhoodProvider,
    xlayerProvider,
    mantleProvider,
    zksyncProvider,
    cronosProvider,
    fantomProvider,
    coreProvider,
    zetachainProvider,
    zircuitProvider,
    berachainProvider,
    unichainProvider,
    hemiProvider,
    fuseProvider,
    cyberProvider,
    plumeProvider,
    immutableProvider,
    monadProvider,
    hyperliquidProvider,
    arcProvider,
    plasmaProvider,
    algorandProvider,
    solanaProvider,
    bitcoinProvider
  ]);
  const defiPositionService = new DefiPositionService();
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
  const getWalletIntelligence = new GetWalletIntelligence(
    providers,
    cache,
    repository,
    systemClock
  );

  return {
    env,
    prisma,
    redis,
    refreshQueue,
    chainProviders: providers,
    paidResources,
    getWalletIntelligence,
    analyzeWallet: new AnalyzeWallet(providers, getWalletIntelligence, refreshWalletIntelligence),
    requestWalletRefresh: new RequestWalletRefresh(providers, refreshQueue, systemClock),
    refreshWalletIntelligence,
    // Aggregates the same refresh path across several wallets/chains — the
    // capability the paid portfolio routes sell.
    getPortfolioReport: new GetPortfolioReport(providers, refreshWalletIntelligence, systemClock),
    defiPositionService,
    paymentBuilders,
    paymentFacilitator,
    getAlgorandPaymentParams: new GetAlgorandPaymentParams({
      apiUrl: env.ALGORAND_API_URL,
      timeoutMs: env.PROVIDER_TIMEOUT_MS,
      network: env.X402_NETWORK
    }),
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
