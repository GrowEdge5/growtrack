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
  // The native balance's own USD value; absent when the native currency could not
  // be priced (distinct from a priced native balance worth nothing).
  nativeValueUsd: z.string().optional(),
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

const paymentResourceSchema = z
  .object({
    url: z.string().min(1),
    description: z.string(),
    mimeType: z.string()
  })
  .passthrough();

// The GoPlausible Bazaar discovery extension. Declared loosely (and passthrough)
// on purpose: it is the facilitator's cataloging payload, forwarded verbatim, and
// an under-declared schema here would SILENTLY STRIP it from the 402 body — the
// zod response serializer emits only what the schema declares, while the base64
// PAYMENT-REQUIRED header keeps everything. Body and header must agree.
const bazaarExtensionsSchema = z
  .object({
    bazaar: z.record(z.unknown())
  })
  .passthrough();

const paymentAcceptSchema = z
  .object({
    scheme: z.literal("exact"),
    network: z.string(),
    amount: z.string(),
    asset: z.string(),
    payTo: z.string(),
    maxTimeoutSeconds: z.number().int().positive(),
    extra: z
      .object({
        name: z.string(),
        tag: z.string(),
        decimals: z.number().int().nonnegative(),
        feePayer: z.string()
      })
      .passthrough(),
    // Rides on the accept so the facilitator auto-catalogs the resource from the
    // payload it sees on /verify + /settle.
    resource: paymentResourceSchema.optional(),
    extensions: bazaarExtensionsSchema.optional()
  })
  .passthrough();

// x402 HTTP 402 body (also base64 in the PAYMENT-REQUIRED header). Documents the
// payment requirements in OpenAPI and validates the outgoing 402 payload.
export const paymentRequiredSchema = z
  .object({
    x402Version: z.literal(2),
    error: z.string().optional(),
    // Top-level x402 v2 resource descriptor (present when a public base URL is
    // configured); its description is the human-readable Bazaar summary.
    resource: paymentResourceSchema.optional(),
    extensions: bazaarExtensionsSchema.optional(),
    accepts: z.array(paymentAcceptSchema)
  })
  .passthrough();

export const refreshResponseSchema = z.object({
  data: z.object({
    jobId: z.string(),
    status: z.literal("queued")
  })
});

// The free/guest read: an address on its own, with an optional explicit chain for
// the genuinely ambiguous base58 cases (Solana vs Bitcoin legacy).
export const analyzeQuerySchema = z.object({
  address: z.string().min(1),
  chain: z.string().min(1).optional()
});

// Same wallet shape as the snapshot routes, plus the chain the address was routed
// to and the provenance of the read. `source: "live"` means the values in this
// response were read from the chain for this request.
export const analyzeResponseSchema = z.object({
  data: walletDataSchema,
  meta: z.object({
    chain: z.string(),
    source: z.enum(["cache", "database", "live"]),
    stale: z.boolean()
  })
});

const defiTokenSchema = z.object({
  symbol: z.string(),
  amount: z.string(),
  valueUsd: z.string().optional()
});

const defiPositionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  chainSlug: z.string(),
  tokens: z.array(defiTokenSchema),
  rewards: z.array(defiTokenSchema).optional(),
  valueUsd: z.string(),
  details: z.record(z.unknown()).optional()
});

const defiProtocolGroupSchema = z.object({
  protocolId: z.string(),
  name: z.string(),
  category: z.string(),
  chainSlug: z.string(),
  logo: z.string(),
  siteUrl: z.string(),
  totalValueUsd: z.string(),
  positions: z.array(defiPositionItemSchema)
});

export const defiPositionsQuerySchema = z.object({
  address: z.string().min(1)
});

export const defiPositionsResponseSchema = z.object({
  data: z.object({
    address: z.string(),
    totalDefiValueUsd: z.string(),
    protocolsCount: z.number().int().nonnegative(),
    protocols: z.array(defiProtocolGroupSchema)
  })
});
