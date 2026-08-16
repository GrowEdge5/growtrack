import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../../app/build-container.js";
import {
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
}
