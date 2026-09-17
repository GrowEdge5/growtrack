import type { FastifyInstance } from "fastify";

import { paidResourceBuilder, type ApplicationContainer } from "../../../app/build-container.js";
import { createX402Guard } from "../../plugins/x402-guard.js";
import {
  liveWalletResponseSchema,
  paymentRequiredSchema,
  refreshResponseSchema,
  walletParamsSchema,
  walletResponseSchema
} from "./wallet.schemas.js";

export function registerWalletRoutes(app: FastifyInstance, container: ApplicationContainer): void {
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
        data: {
          ...result.snapshot,
          capturedAt: result.snapshot.capturedAt.toISOString(),
          expiresAt: result.snapshot.expiresAt.toISOString()
        },
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
        data: {
          ...snapshot,
          capturedAt: snapshot.capturedAt.toISOString(),
          expiresAt: snapshot.expiresAt.toISOString()
        },
        meta: { source: "live" as const, stale: false as const }
      };
    }
  );
}
