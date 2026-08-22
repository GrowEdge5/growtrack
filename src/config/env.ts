import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  WALLET_FRESHNESS_SECONDS: z.coerce.number().int().positive().default(900),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  EVM_RPC_URL: z.string().url(),
  EVM_CHAIN_ID: z.coerce.number().int().positive().default(1),
  EVM_CHAIN_NAME: z.string().min(1).default("ethereum"),
  PRICE_API_BASE_URL: z.string().url().default("https://coins.llama.fi"),
  PRICE_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000)
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
