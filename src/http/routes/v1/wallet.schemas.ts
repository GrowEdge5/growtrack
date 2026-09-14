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

const walletDataSchema = z.object({
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
});

export const walletResponseSchema = z.object({
  data: walletDataSchema,
  meta: z.object({
    source: z.enum(["cache", "database"]),
    stale: z.boolean()
  })
});

// The paid /live route returns the same wallet data, freshly computed. Its meta
// distinguishes the source ("live") and is always non-stale by construction.
export const liveWalletResponseSchema = z.object({
  data: walletDataSchema,
  meta: z.object({
    source: z.literal("live"),
    stale: z.literal(false)
  })
});

// x402 HTTP 402 body (also base64 in the PAYMENT-REQUIRED header). Documents the
// payment requirements in OpenAPI and validates the outgoing 402 payload.
export const paymentRequiredSchema = z.object({
  x402Version: z.literal(2),
  error: z.string().optional(),
  // Top-level x402 v2 resource descriptor (present when X402_RESOURCE_URL is set);
  // its description is the human-readable Bazaar summary.
  resource: z
    .object({
      url: z.string().url(),
      description: z.string(),
      mimeType: z.string()
    })
    .optional(),
  accepts: z.array(
    z.object({
      scheme: z.literal("exact"),
      network: z.string(),
      amount: z.string(),
      asset: z.string(),
      payTo: z.string(),
      maxTimeoutSeconds: z.number().int().positive(),
      extra: z.object({
        name: z.string(),
        tag: z.string(),
        decimals: z.number().int().nonnegative(),
        feePayer: z.string()
      })
    })
  )
});

export const refreshResponseSchema = z.object({
  data: z.object({
    jobId: z.string(),
    status: z.literal("queued")
  })
});
