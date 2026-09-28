import { describe, expect, it } from "vitest";

import { buildHttpApp } from "../../../src/app/build-http-app.js";
import type { ApplicationContainer } from "../../../src/app/build-container.js";
import { loadEnvironment } from "../../../src/config/env.js";
import { testPaidResourceList, testPaymentBuilders } from "../../support/x402-fixtures.js";

const BASE_VALID_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/growtrack",
  REDIS_URL: "redis://localhost:6379",
  EVM_RPC_URL: "https://eth.llamarpc.com"
};

function createMockContainer(nodeEnv: "production" | "development"): ApplicationContainer {
  const isProd = nodeEnv === "production";
  const env = loadEnvironment({
    ...BASE_VALID_ENV,
    NODE_ENV: nodeEnv,
    X402_ENABLED: isProd ? "true" : "false",
    X402_PAY_TO: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
    X402_NETWORK: isProd
      ? "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
      : "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    X402_ASSET_ID: isProd ? "31566704" : "10458941",
    X402_PUBLIC_BASE_URL: "https://growtrack.pro"
  });

  return {
    env,
    prisma: { $queryRaw: async () => [{ 1: 1 }] },
    redis: { ping: async () => "PONG" },
    chainProviders: {
      get: () => ({
        chain: { id: 1, slug: "ethereum", namespace: "eip155", nativeSymbol: "ETH" },
        nativeDecimals: 18,
        normalizeAddress: (a: string) => ({
          chain: { id: 1, slug: "ethereum", namespace: "eip155", nativeSymbol: "ETH" },
          canonicalAddress: a,
          displayAddress: a
        }),
        fetchWalletData: async () => {
          throw new Error("not implemented");
        }
      }),
      list: () => []
    },
    paidResources: testPaidResourceList,
    paymentBuilders: testPaymentBuilders,
    paymentFacilitator: {
      verify: async () => ({ isValid: true }),
      settle: async () => ({ success: true, transaction: "tx", network: "net" })
    },
    analyzeWallet: { execute: async () => ({}) as never },
    getWalletIntelligence: { execute: async () => ({}) as never },
    requestWalletRefresh: { execute: async () => ({ jobId: "job-1" }) },
    refreshWalletIntelligence: { execute: async () => ({}) as never },
    getPortfolioReport: { execute: async () => ({}) as never },
    getAlgorandPaymentParams: { execute: async () => ({}) as never }
  } as unknown as ApplicationContainer;
}

describe("Environment configuration - production x402 guard", () => {
  it("allows testnet defaults in development mode", () => {
    const env = loadEnvironment({
      ...BASE_VALID_ENV,
      NODE_ENV: "development",
      X402_ENABLED: "false"
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.X402_ENABLED).toBe(false);
  });

  it("rejects testnet network in production when x402 is enabled", () => {
    expect(() =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        NODE_ENV: "production",
        X402_ENABLED: "true",
        X402_PAY_TO: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
        X402_ASSET_ID: "31566704", // Mainnet asset
        X402_PUBLIC_BASE_URL: "https://growtrack.pro"
        // X402_NETWORK omitted -> defaults to testnet genesis
      })
    ).toThrow(/X402_NETWORK contains the Algorand Testnet genesis hash/);
  });

  it("rejects testnet asset ID in production when x402 is enabled", () => {
    expect(() =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        NODE_ENV: "production",
        X402_ENABLED: "true",
        X402_PAY_TO: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
        X402_NETWORK: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=", // Mainnet network
        X402_PUBLIC_BASE_URL: "https://growtrack.pro"
        // X402_ASSET_ID omitted -> defaults to testnet 10458941
      })
    ).toThrow(/X402_ASSET_ID is set to the Testnet USDC ASA/);
  });

  it("rejects missing X402_PUBLIC_BASE_URL in production when x402 is enabled", () => {
    expect(() =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        NODE_ENV: "production",
        X402_ENABLED: "true",
        X402_PAY_TO: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
        X402_NETWORK: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
        X402_ASSET_ID: "31566704"
        // X402_PUBLIC_BASE_URL omitted
      })
    ).toThrow(/X402_PUBLIC_BASE_URL is required in production/);
  });

  it("successfully validates full MainNet configuration in production", () => {
    const env = loadEnvironment({
      ...BASE_VALID_ENV,
      NODE_ENV: "production",
      X402_ENABLED: "true",
      X402_PAY_TO: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
      X402_NETWORK: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
      X402_ASSET_ID: "31566704",
      X402_PUBLIC_BASE_URL: "https://growtrack.pro"
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.X402_ENABLED).toBe(true);
    expect(env.X402_NETWORK).toBe("algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=");
    expect(env.X402_ASSET_ID).toBe("31566704");
    expect(env.X402_PUBLIC_BASE_URL).toBe("https://growtrack.pro");
    expect(env.REFRESH_RATE_LIMIT_MAX).toBe(30);
  });
});

describe("HTTP Application - production security protections", () => {
  it("restricts /metrics and /docs in production mode while keeping /health available", async () => {
    const container = createMockContainer("production");
    const app = await buildHttpApp(container);
    await app.ready();

    // /metrics must return 404 in production
    const metricsRes = await app.inject({ method: "GET", url: "/metrics" });
    expect(metricsRes.statusCode).toBe(404);

    // /docs must return 404 in production
    const docsRes = await app.inject({ method: "GET", url: "/docs" });
    expect(docsRes.statusCode).toBe(404);

    // Health endpoints must remain available in production
    const healthLiveRes = await app.inject({ method: "GET", url: "/health/live" });
    expect(healthLiveRes.statusCode).toBe(200);

    const healthReadyRes = await app.inject({ method: "GET", url: "/health/ready" });
    expect(healthReadyRes.statusCode).toBe(200);

    // Normal refresh route still works and queues a job
    const refreshRes = await app.inject({
      method: "POST",
      url: "/v1/wallets/ethereum/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/refresh"
    });
    expect(refreshRes.statusCode).toBe(202);
    expect(refreshRes.json()).toEqual({ data: { jobId: "job-1", status: "queued" } });

    await app.close();
  });

  it("keeps /metrics and /docs available in development mode", async () => {
    const container = createMockContainer("development");
    const app = await buildHttpApp(container);
    await app.ready();

    // /metrics is exposed in development
    const metricsRes = await app.inject({ method: "GET", url: "/metrics" });
    expect(metricsRes.statusCode).toBe(200);
    expect(metricsRes.body).toContain("growtrack_");

    // /docs is registered in development
    const docsRes = await app.inject({ method: "GET", url: "/docs" });
    expect(docsRes.statusCode).toBe(200);

    await app.close();
  });
});
