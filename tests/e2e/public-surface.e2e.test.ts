import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { ApplicationContainer } from "../../src/app/build-container.js";
import { loadEnvironment } from "../../src/config/env.js";
import { registerDiscoveryRoutes } from "../../src/http/routes/discovery.routes.js";
import { registerDashboardRoute } from "../../src/http/routes/dashboard.routes.js";
import { registerLandingRoute } from "../../src/http/routes/landing.routes.js";
import { registerChainRoutes } from "../../src/http/routes/v1/chains.routes.js";
import { registerPortfolioRoutes } from "../../src/http/routes/v1/portfolio.routes.js";
import type {
  ChainDataProvider,
  ChainProviderRegistry
} from "../../src/modules/chains/application/ports/chain-data-provider.js";
import type { PaymentFacilitator } from "../../src/modules/payments/application/ports/payment-facilitator.js";
import type { PortfolioReport } from "../../src/modules/wallets/application/get-portfolio-report.js";
import { testPaidResourceList, testPaymentBuilders } from "../support/x402-fixtures.js";

const SOLANA = "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE";

// The wire shapes this test asserts on, declared so assertions are typed rather than
// reaching into `any` — the same reason the guard asserts its own response schema.
const chainsBody = z.object({
  data: z.object({ chains: z.array(z.object({ slug: z.string() })) })
});

const detectBody = z.object({
  data: z.object({ candidateChains: z.array(z.string()), resolved: z.boolean() })
});

const paidRequestBody = z.object({
  accepts: z.array(
    z.object({
      amount: z.string(),
      resource: z.object({ url: z.string() }).optional(),
      extensions: z.object({ bazaar: z.unknown() }).optional()
    })
  ),
  resource: z.object({ url: z.string(), description: z.string() }),
  extensions: z.object({ bazaar: z.unknown() })
});

const reportBody = z.object({
  data: z.object({ totals: z.object({ totalValueUsd: z.string().optional() }) })
});

const manifestBody = z.object({
  tag: z.string(),
  assetName: z.string(),
  resources: z.array(z.object({ path: z.string(), priceUsd: z.string() }))
});

// Payment headers carry base64-encoded JSON, so they decode before parsing.
function parseBase64Json(value: unknown, schema: z.ZodTypeAny): unknown {
  return schema.parse(JSON.parse(Buffer.from(String(value), "base64").toString("utf8")));
}

function fakeProvider(slug: string, nativeSymbol: string): ChainDataProvider {
  return {
    chain: { id: 1, slug, namespace: slug, nativeSymbol },
    nativeDecimals: 9,
    normalizeAddress: () => {
      throw new Error("not used");
    },
    fetchWalletData: async () => {
      throw new Error("not used");
    }
  };
}

const chainProviders: ChainProviderRegistry = {
  get: () => fakeProvider("solana", "SOL"),
  list: () => [
    fakeProvider("ethereum", "ETH"),
    fakeProvider("algorand", "ALGO"),
    fakeProvider("solana", "SOL"),
    fakeProvider("bitcoin", "BTC")
  ]
};

const report: PortfolioReport = {
  generatedAt: new Date("2026-09-17T09:30:00.000Z"),
  totals: {
    totalValueUsd: "40.00000000",
    pricedHoldings: 2,
    unpricedHoldings: 1,
    walletCount: 1,
    chainCount: 1
  },
  chains: [
    {
      chain: "solana",
      totalValueUsd: "40.00000000",
      allocationPct: "100.00",
      walletCount: 1,
      holdings: []
    }
  ],
  wallets: [
    {
      chain: "solana",
      address: SOLANA,
      status: "complete",
      nativeSymbol: "SOL",
      nativeBalance: "44500000",
      nativeAmount: "0.0445",
      totalValueUsd: "40.00000000",
      allocationPct: "100.00",
      holdings: []
    }
  ],
  unpriced: [],
  errors: []
};

const payingFacilitator: PaymentFacilitator = {
  verify: async () => ({ isValid: true }),
  settle: async () => ({ success: true, transaction: "TX123", network: "algorand:x" })
};

function container(options: {
  x402Enabled: boolean;
  facilitator?: PaymentFacilitator;
}): ApplicationContainer {
  return {
    env: loadEnvironment({
      DATABASE_URL: "postgresql://growtrack:growtrack@localhost:5432/growtrack",
      REDIS_URL: "redis://localhost:6379",
      EVM_RPC_URL: "https://rpc.test",
      X402_ENABLED: options.x402Enabled ? "true" : "false",
      X402_PAY_TO: "VTOEM6527WMLHWPTKRBQNQLO5XWGFJC5Z6T7E25TFBKMWP5NFPDP73ZD4U",
      X402_PUBLIC_BASE_URL: "https://growtrack.example"
    }),
    chainProviders,
    paidResources: testPaidResourceList,
    paymentBuilders: testPaymentBuilders,
    paymentFacilitator: options.facilitator ?? payingFacilitator,
    getPortfolioReport: {
      execute: async () => report
    }
  } as unknown as ApplicationContainer;
}

async function buildApp(options: {
  x402Enabled: boolean;
  facilitator?: PaymentFacilitator;
}): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cors, { origin: ["http://localhost:3000"] });
  const deps = container(options);
  registerLandingRoute(app, deps);
  registerDashboardRoute(app, deps);
  registerDiscoveryRoutes(app, deps);
  registerChainRoutes(app, deps);
  registerPortfolioRoutes(app, deps);
  await app.ready();
  return app;
}

describe("public surface end to end", () => {
  it("lists the wired chains and resolves a pasted address to one of them", async () => {
    const app = await buildApp({ x402Enabled: false });

    const chains = await app.inject({ method: "GET", url: "/v1/chains" });
    expect(chains.statusCode).toBe(200);
    expect(chainsBody.parse(chains.json()).data.chains.map((chain) => chain.slug)).toEqual([
      "ethereum",
      "algorand",
      "solana",
      "bitcoin"
    ]);

    const detected = await app.inject({
      method: "GET",
      url: `/v1/chains/detect?address=${SOLANA}`
    });
    expect(detected.statusCode).toBe(200);
    expect(detectBody.parse(detected.json()).data).toMatchObject({
      candidateChains: ["solana"],
      resolved: true
    });

    await app.close();
  });

  it("returns 402 for the paid report with the price and full Bazaar metadata in the BODY", async () => {
    const app = await buildApp({ x402Enabled: true });

    const response = await app.inject({
      method: "GET",
      url: `/v1/portfolio/report?addresses=${SOLANA}`
    });

    expect(response.statusCode).toBe(402);
    const body = paidRequestBody.parse(response.json());

    // Serialized through the response schema. The regression this guards is the zod
    // serializer stripping fields the schema under-declared while the base64 header
    // kept them.
    expect(body.accepts[0]?.amount).toBe("50000");
    expect(body.resource.url).toBe("https://growtrack.example/v1/portfolio/report");
    expect(body.extensions.bazaar).toBeDefined();
    expect(body.accepts[0]?.extensions?.bazaar).toBeDefined();
    expect(body.accepts[0]?.resource?.url).toBe(body.resource.url);

    // The header must carry the same thing the body did.
    const header = paidRequestBody.parse(
      parseBase64Json(response.headers["payment-required"], z.unknown())
    );
    expect(header.accepts[0]?.amount).toBe("50000");
    expect(header.extensions.bazaar).toBeDefined();

    await app.close();
  });

  it("serves the paid report once payment verifies and settles", async () => {
    const app = await buildApp({ x402Enabled: true });
    const signature = Buffer.from(JSON.stringify({ x402Version: 2 }), "utf8").toString("base64");

    const response = await app.inject({
      method: "GET",
      url: `/v1/portfolio/report?addresses=${SOLANA}`,
      headers: { "payment-signature": signature }
    });

    expect(response.statusCode).toBe(200);
    expect(reportBody.parse(response.json()).data.totals.totalValueUsd).toBe("40.00000000");
    expect(response.headers["payment-response"]).toBeDefined();

    await app.close();
  });

  it("rejects more addresses than the cap before touching the provider", async () => {
    const app = await buildApp({ x402Enabled: false });

    const tooMany = Array.from({ length: 11 }, () => SOLANA).join(",");
    const response = await app.inject({
      method: "GET",
      url: `/v1/portfolio?addresses=${tooMany}`
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("publishes the merchant's agent-facing manifests with the same prices it charges", async () => {
    const app = await buildApp({ x402Enabled: true });

    const wellKnown = await app.inject({ method: "GET", url: "/.well-known/x402" });
    expect(wellKnown.statusCode).toBe(200);
    const manifest = manifestBody.parse(wellKnown.json());
    expect(manifest.tag).toBe("x402-global-challenge");
    expect(manifest.assetName).toBe("USDC");
    expect(manifest.resources.map((resource) => resource.priceUsd)).toEqual([
      "$0.010000",
      "$0.020000",
      "$0.050000"
    ]);

    const llms = await app.inject({ method: "GET", url: "/llms.txt" });
    expect(llms.statusCode).toBe(200);
    expect(llms.headers["content-type"]).toContain("text/plain");
    expect(llms.body).toContain("$0.05 per report");
    expect(llms.body).toContain("solana");

    await app.close();
  });

  it("renders a landing page carrying the og metadata the facilitator scrapes", async () => {
    const app = await buildApp({ x402Enabled: true });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain('property="og:title"');
    expect(response.body).toContain(
      'property="og:image" content="https://growtrack.example/logo.svg"'
    );
    expect(response.body).toContain("/v1/portfolio/report");

    const logo = await app.inject({ method: "GET", url: "/logo.svg" });
    expect(logo.statusCode).toBe(200);
    expect(logo.headers["content-type"]).toContain("image/svg+xml");

    await app.close();
  });

  // /demo redirects to the real dashboard. It used to serve an HTML page of invented
  // balances and P&L, so the assertion is now that no fabricated markup is served.
  it("redirects /demo to the real dashboard instead of serving mock data", async () => {
    const app = await buildApp({ x402Enabled: true });

    const response = await app.inject({ method: "GET", url: "/demo" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/");

    await app.close();
  });
});
