import { z } from "zod";

export const walletParamsSchema = z.object({
  chain: z.string().min(1),
  address: z.string().min(1)
});

const walletIdentitySchema = z.object({
  chain: z.object({
    id: z.number().int().positive(),
    slug: z.string(),
    namespace: z.string(),
    nativeSymbol: z.string()
  }),
  canonicalAddress: z.string(),
  displayAddress: z.string()
});

const tokenHoldingSchema = z.object({
  tokenAddress: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number().int().nonnegative(),
  rawAmount: z.string(),
  // Present only when a trustworthy USD price was found for this token.
  valueUsd: z.string().optional()
});

export const walletResponseSchema = z.object({
  data: z.object({
    wallet: walletIdentitySchema,
    status: z.enum(["complete", "partial"]),
    nativeBalance: z.string(),
    nativeSymbol: z.string(),
    provider: z.string(),
    blockNumber: z.string().optional(),
    // Sum of native + all priced holdings, in USD. Omitted when nothing could
    // be priced (never zero-filled).
    totalValueUsd: z.string().optional(),
    capturedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    holdings: z.array(tokenHoldingSchema),
    transactions: z.array(z.unknown()),
    positions: z.array(z.unknown()),
    signals: z.array(z.unknown())
  }),
  meta: z.object({
    source: z.enum(["cache", "database"]),
    stale: z.boolean()
  })
});

export const refreshResponseSchema = z.object({
  data: z.object({
    jobId: z.string(),
    status: z.literal("queued")
  })
});
