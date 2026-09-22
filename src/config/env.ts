import { z } from "zod";

// Env vars arrive as strings; accept only explicit "true"/"false" for booleans so
// a stray value can never silently enable a paid path (z.coerce.boolean() would
// treat "false" as true).
const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    // Comma-separated list of allowed browser origins. A list (not a single origin)
    // because a deploy serves the SPA and the API from one root domain while local
    // development calls the same API from localhost.
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    // Separate, tighter budget for the free guest analysis route. A cache miss there
    // performs a live upstream read against keyless public endpoints, which are
    // shared infrastructure — the default API budget is too generous for that.
    ANALYZE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    WALLET_FRESHNESS_SECONDS: z.coerce.number().int().positive().default(900),
    PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    EVM_RPC_URL: z.string().url(),
    EVM_CHAIN_ID: z.coerce.number().int().positive().default(1),
    EVM_CHAIN_NAME: z.string().min(1).default("ethereum"),
    ALGORAND_API_URL: z.string().url().default("https://mainnet-api.algonode.cloud"),
    ALGORAND_CHAIN_NAME: z.string().min(1).default("algorand"),
    // Solana JSON-RPC endpoint. The public mainnet RPC needs no key; point this at
    // a dedicated provider if rate limits become the bottleneck for report traffic.
    SOLANA_RPC_URL: z.string().url().default("https://api.mainnet-beta.solana.com"),
    SOLANA_CHAIN_NAME: z.string().min(1).default("solana"),
    // SPL token metadata (symbol/name) source. Solana has no on-chain ticker, so
    // names come from this list; balances never depend on it.
    SOLANA_TOKEN_LIST_URL: z
      .string()
      .url()
      .default("https://lite-api.jup.ag/tokens/v2/tag?query=verified"),
    // Esplora-compatible Bitcoin REST base. blockstream.info is the verified-working
    // default; mempool.space is configurable as the fallback.
    BITCOIN_API_URL: z.string().url().default("https://blockstream.info/api"),
    BITCOIN_FALLBACK_API_URL: z.string().url().optional(),
    BITCOIN_CHAIN_NAME: z.string().min(1).default("bitcoin"),
    PRICE_API_BASE_URL: z.string().url().default("https://coins.llama.fi"),
    PRICE_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),

    // --- x402 micropayments (GoPlausible facilitator) ---------------------------
    // Master switch. Defaults OFF so dev/test/CI run the free path; a deploy opts
    // in explicitly. When ON, X402_PAY_TO is required (see refine below).
    X402_ENABLED: booleanFromString,
    X402_FACILITATOR_URL: z.string().url().default("https://facilitator.goplausible.xyz"),
    // CAIP-2 network id. Defaults to Algorand TESTNET (testnet-first rollout).
    X402_NETWORK: z
      .string()
      .min(1)
      .default("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="),
    // USDC ASA id (string). Default = testnet USDC.
    X402_ASSET_ID: z.string().min(1).default("10458941"),
    X402_ASSET_DECIMALS: z.coerce.number().int().nonnegative().default(6),
    // Human-readable asset name advertised in the 402 accept's extra.name (Bazaar).
    X402_ASSET_NAME: z.string().min(1).default("USDC"),
    // PUBLIC recipient address. Required only when X402_ENABLED=true; never a key.
    X402_PAY_TO: z.string().min(1).optional(),
    // Facilitator's PUBLIC fee-payer key (gasless settlement). Overridable per env.
    X402_FEE_PAYER: z
      .string()
      .min(1)
      .default("ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA"),
    X402_MAX_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300),
    X402_TAG: z.string().min(1).default("x402-global-challenge"),
    // Canonical PUBLIC origin of the deployment (e.g. "https://growtrack.xyz"),
    // without a path. Every priced resource's Bazaar listing URL is derived as
    // origin + the resource's own path template, so all endpoints of the Composite
    // Entry advertise the ONE root domain the merchant is registered against — the
    // facilitator groups endpoints by merchant and forbids splitting one payTo
    // across domains. Leave unset locally (the 402 then carries no resource).
    X402_PUBLIC_BASE_URL: z.string().url().optional(),
    // Legacy single-resource URL (the pre-Composite deploy set the full /live URL
    // here). Accepted so an already-provisioned deployment keeps cataloging without
    // an env change; only its origin is used, and X402_PUBLIC_BASE_URL wins when both
    // are set.
    X402_RESOURCE_URL: z.string().url().optional()
  })
  .superRefine((env, ctx) => {
    // Fail fast at startup rather than shipping a 402 that advertises an empty payTo.
    if (env.X402_ENABLED && (env.X402_PAY_TO === undefined || env.X402_PAY_TO.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["X402_PAY_TO"],
        message: "X402_PAY_TO is required when X402_ENABLED=true"
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
  }

  return result.data;
}
