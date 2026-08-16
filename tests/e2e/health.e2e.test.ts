import Fastify from "fastify";
import { describe, expect, it } from "vitest";

describe("health endpoint contract", () => {
  it("returns a liveness response without infrastructure dependencies", async () => {
    const app = Fastify();
    app.get("/health/live", () => ({ status: "ok" }));

    await app.ready();
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
