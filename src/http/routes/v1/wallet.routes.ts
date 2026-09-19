import type { FastifyInstance } from "fastify";

import { paidResourceBuilder, type ApplicationContainer } from "../../../app/build-container.js";
import type { WalletSnapshot } from "../../../modules/wallets/domain/wallet-snapshot.js";
import { createX402Guard } from "../../plugins/x402-guard.js";
import {
  analyzeQuerySchema,
  analyzeResponseSchema,
  liveWalletResponseSchema,
  paymentRequiredSchema,
  refreshResponseSchema,
  walletParamsSchema,
  walletResponseSchema
} from "./wallet.schemas.js";

// A snapshot's Date fields are not JSON-serializable as-is; every route that returns
// one renders them as ISO strings so the wire shape matches the response schema.
function serializeSnapshot(snapshot: WalletSnapshot) {
  return {
    ...snapshot,
    capturedAt: snapshot.capturedAt.toISOString(),
    expiresAt: snapshot.expiresAt.toISOString()
  };
}

export function registerWalletRoutes(app: FastifyInstance, container: ApplicationContainer): void {
  // The free, anonymous read: paste an address, get that wallet's real balances and
  // USD valuation. No account, no wallet connection, no payment. Deliberately the
  // narrowest possible entry point — it is what makes the "look up one wallet before
  // you connect anything" rule possible.
  //
  // Rate limited harder than the default because a cache miss here performs a live
  // upstream read against keyless public endpoints, unlike the cached GET below.
  app.get(
    "/v1/wallets/analyze",
    {
      config: {
        rateLimit: { max: container.env.ANALYZE_RATE_LIMIT_MAX, timeWindow: "1 minute" }
      },
      schema: {
        tags: ["wallets"],
        summary: "Analyze any address for free (no account, no payment)",
        querystring: analyzeQuerySchema,
        response: { 200: analyzeResponseSchema }
      }
    },
    async (request) => {
      const { address, chain } = analyzeQuerySchema.parse(request.query);
      const result = await container.analyzeWallet.execute(address, chain);
      return {
        data: serializeSnapshot(result.snapshot),
        meta: { chain: result.chain, source: result.source, stale: result.stale }
      };
    }
  );

  app.get(
    "/v1/wallets/:chain/:address",
    {
      schema: {
        tags: ["wallets"],
        summary: "Get the latest wallet intelligence snapshot",
        params: walletParamsSchema,
        response: { 200: walletResponseSchema }
      }
    },
    async (request) => {
      const { chain, address } = walletParamsSchema.parse(request.params);
      const result = await container.getWalletIntelligence.execute(chain, address);
      return {
        data: serializeSnapshot(result.snapshot),
        meta: { source: result.source, stale: result.stale }
      };
    }
  );

  app.post(
    "/v1/wallets/:chain/:address/refresh",
    {
      schema: {
        tags: ["wallets"],
        summary: "Queue a wallet intelligence refresh",
        params: walletParamsSchema,
        response: { 202: refreshResponseSchema }
      }
    },
    async (request, reply) => {
      const { chain, address } = walletParamsSchema.parse(request.params);
      const result = await container.requestWalletRefresh.execute(chain, address);
      return reply.status(202).send({ data: { jobId: result.jobId, status: "queued" } });
    }
  );

  // Paid (x402) tier: a fresh, synchronous full snapshot returned in the response
  // body — the agent-native "pay $0.01 → get portfolio JSON" flow, and the cheapest
  // of the Composite Entry's three priced capabilities. The guard runs first; when
  // x402 is enabled and unpaid it short-circuits with 402 before this
  // (provider-hitting) handler executes. The free GET/refresh routes above are
  // untouched.
  app.get(
    "/v1/wallets/:chain/:address/live",
    {
      preHandler: createX402Guard({
        enabled: container.env.X402_ENABLED,
        builder: paidResourceBuilder(container, "wallet-live"),
        facilitator: container.paymentFacilitator
      }),
      schema: {
        tags: ["wallets"],
        summary: "Get a fresh wallet intelligence snapshot (x402 paid)",
        params: walletParamsSchema,
        response: { 200: liveWalletResponseSchema, 402: paymentRequiredSchema }
      }
    },
    async (request) => {
      const { chain, address } = walletParamsSchema.parse(request.params);
      const snapshot = await container.refreshWalletIntelligence.execute(chain, address);
      return {
        data: serializeSnapshot(snapshot),
        meta: { source: "live" as const, stale: false as const }
      };
    }
  );
}
