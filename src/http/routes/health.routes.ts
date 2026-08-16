import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../app/build-container.js";

export function registerHealthRoutes(app: FastifyInstance, container: ApplicationContainer): void {
  app.get("/health/live", () => ({ status: "ok" }));

  app.get("/health/ready", async (_request, reply) => {
    try {
      await Promise.all([container.prisma.$queryRaw`SELECT 1`, container.redis.ping()]);
      return { status: "ready", checks: { database: "up", redis: "up" } };
    } catch (error) {
      app.log.error({ err: error }, "Readiness check failed");
      return reply.status(503).send({
        status: "not_ready",
        checks: { database: "unknown", redis: "unknown" }
      });
    }
  });
}
