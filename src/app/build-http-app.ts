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
import { registerHealthRoutes } from "../http/routes/health.routes.js";
import { registerLandingRoute } from "../http/routes/landing.routes.js";
import { registerMetricsRoute } from "../http/routes/metrics.routes.js";
import { registerWalletRoutes } from "../http/routes/v1/wallet.routes.js";

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
  await app.register(cors, { origin: container.env.CORS_ORIGIN });
  await app.register(helmet);
  await app.register(sensible);
  await app.register(rateLimit, { max: container.env.RATE_LIMIT_MAX, timeWindow: "1 minute" });

  registerErrorHandler(app);
  registerLandingRoute(app);
  registerHealthRoutes(app, container);
  registerMetricsRoute(app);
  registerWalletRoutes(app, container);
  return app;
}
