import type { FastifyInstance } from "fastify";
import { collectDefaultMetrics, Registry } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: "growtrack_" });

export function registerMetricsRoute(app: FastifyInstance): void {
  app.get("/metrics", async (_request, reply) => {
    return reply.type(registry.contentType).send(await registry.metrics());
  });
}
