import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
  jsonSchemaTransform
} from "fastify-type-provider-zod";

import type { ApplicationContainer } from "./build-container.js";
import { registerErrorHandler } from "../http/plugins/error-handler.js";
import { registerDiscoveryRoutes } from "../http/routes/discovery.routes.js";
import { registerChainRoutes } from "../http/routes/v1/chains.routes.js";
import { registerPortfolioRoutes } from "../http/routes/v1/portfolio.routes.js";
import { registerHealthRoutes } from "../http/routes/health.routes.js";
import { registerLandingRoute } from "../http/routes/landing.routes.js";
import { registerDashboardRoute } from "../http/routes/dashboard.routes.js";
import { registerMetricsRoute } from "../http/routes/metrics.routes.js";
import { registerPaymentRoutes } from "../http/routes/v1/payments.routes.js";
import { registerWalletRoutes } from "../http/routes/v1/wallet.routes.js";
import { proxyToWeb } from "../http/plugins/web-proxy.js";

export async function buildHttpApp(container: ApplicationContainer): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: container.env.LOG_LEVEL,
      ...(container.env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { colorize: true } } }
        : {})
    },
    requestIdHeader: "x-request-id",
    trustProxy: true
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(swagger, {
    openapi: {
      info: { title: "Growtrack API", version: "0.1.0" },
      tags: [{ name: "wallets", description: "Wallet intelligence operations" }]
    },
    transform: jsonSchemaTransform
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await app.register(cors, { origin: parseCorsOrigins(container.env.CORS_ORIGIN) });
  await app.register(helmet);
  await app.register(sensible);
  await app.register(rateLimit, { max: container.env.RATE_LIMIT_MAX, timeWindow: "1 minute" });

  // The user-facing app is the Next.js service (deployed separately, see README);
  // this process serves the API plus its own landing/docs/discovery surfaces.

  registerErrorHandler(app);
  registerLandingRoute(app, container);
  registerDashboardRoute(app, container);
  registerDiscoveryRoutes(app, container);
  registerHealthRoutes(app, container);
  registerMetricsRoute(app);
  registerChainRoutes(app, container);
  registerWalletRoutes(app, container);
  registerPortfolioRoutes(app, container);
  registerPaymentRoutes(app, container);

  app.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? "";
    if (url.startsWith("/v1/") || url.startsWith("/health/")) {
      return reply.status(404).send({
        type: "https://growtrack.dev/problems/not-found",
        title: "Route not found",
        status: 404,
        detail: `Route ${request.method}:${url} not found`,
        code: "ROUTE_NOT_FOUND"
      });
    }

    proxyToWeb(request, reply, 3001, () => {
      reply.raw.writeHead(404, { "content-type": "application/json" });
      reply.raw.end(
        JSON.stringify({
          type: "https://growtrack.dev/problems/not-found",
          title: "Page not found",
          status: 404,
          detail: `Path ${url} was not found on this server`,
          code: "NOT_FOUND"
        })
      );
    });
  });

  return app;
}

// CORS_ORIGIN is a comma-separated list: a deploy serves the SPA and the API from
// one root domain while local development calls the same API from localhost. "*"
// is passed through as the wildcard rather than as a one-element allowlist, which
// browsers would reject.
export function parseCorsOrigins(value: string): string | string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.includes("*")) {
    return "*";
  }
  return origins.length === 1 ? (origins[0] as string) : origins;
}
