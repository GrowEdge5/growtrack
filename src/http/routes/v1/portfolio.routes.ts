import type { FastifyInstance } from "fastify";

import { paidResourceBuilder, type ApplicationContainer } from "../../../app/build-container.js";
import { createX402Guard } from "../../plugins/x402-guard.js";
import { paymentRequiredSchema } from "./wallet.schemas.js";
import {
  parsePortfolioTargets,
  portfolioQuerySchema,
  portfolioReportResponseSchema,
  portfolioSummaryResponseSchema
} from "./portfolio.schemas.js";

// The portfolio routes are the Composite Entry's two aggregate capabilities. Both
// settle to the same payTo as /live, so their volume rolls up under one merchant,
// while each carries its own price and its own Bazaar listing.
export function registerPortfolioRoutes(
  app: FastifyInstance,
  container: ApplicationContainer
): void {
  // $0.02 — totals and a per-chain split, no per-holding detail.
  app.get(
    "/v1/portfolio",
    {
      preHandler: createX402Guard({
        enabled: container.env.X402_ENABLED,
        builder: paidResourceBuilder(container, "portfolio-snapshot"),
        facilitator: container.paymentFacilitator
      }),
      schema: {
        tags: ["portfolio"],
        summary: "Get combined portfolio totals across wallets and chains (x402 paid)",
        querystring: portfolioQuerySchema,
        response: { 200: portfolioSummaryResponseSchema, 402: paymentRequiredSchema }
      }
    },
    async (request) => {
      const { addresses } = portfolioQuerySchema.parse(request.query);
      const report = await container.getPortfolioReport.execute(parsePortfolioTargets(addresses));

      return {
        data: {
          generatedAt: report.generatedAt.toISOString(),
          totals: report.totals,
          chains: report.chains,
          wallets: report.wallets,
          errors: report.errors
        }
      };
    }
  );

  // $0.05 — the full report: per-holding allocation plus an explicit unpriced list.
  app.get(
    "/v1/portfolio/report",
    {
      preHandler: createX402Guard({
        enabled: container.env.X402_ENABLED,
        builder: paidResourceBuilder(container, "portfolio-report"),
        facilitator: container.paymentFacilitator
      }),
      schema: {
        tags: ["portfolio"],
        summary: "Get a full multichain portfolio report (x402 paid)",
        querystring: portfolioQuerySchema,
        response: { 200: portfolioReportResponseSchema, 402: paymentRequiredSchema }
      }
    },
    async (request) => {
      const { addresses } = portfolioQuerySchema.parse(request.query);
      const report = await container.getPortfolioReport.execute(parsePortfolioTargets(addresses));

      return {
        data: {
          generatedAt: report.generatedAt.toISOString(),
          totals: report.totals,
          chains: report.chains,
          wallets: report.wallets,
          unpriced: report.unpriced,
          errors: report.errors
        }
      };
    }
  );
}
