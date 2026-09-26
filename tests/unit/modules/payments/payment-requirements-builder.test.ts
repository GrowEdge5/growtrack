import { describe, expect, it } from "vitest";

import { PaymentRequirementsBuilder } from "../../../../src/modules/payments/application/payment-requirements-builder.js";
import {
  testBuilder,
  testMerchantConfig,
  testMerchantConfigWithoutBaseUrl,
  testPaidResources
} from "../../../support/x402-fixtures.js";

const walletLive = testPaidResources["wallet-live"];

describe("PaymentRequirementsBuilder", () => {
  it("builds a single exact-scheme accept from the resource's own price, as an atomic string", () => {
    const requirements = testBuilder("wallet-live").build();

    expect(requirements.x402Version).toBe(2);
    expect(requirements.accepts).toHaveLength(1);
    // Amount stays a string so 6-decimal USDC and large values never hit float rounding.
    // $0.01 — the agent-sized price band the Bazaar catalog clusters in, not $0.001.
    const accept = requirements.accepts[0];
    expect(accept?.scheme).toBe("exact");
    expect(accept?.network).toBe(testMerchantConfig.network);
    expect(accept?.amount).toBe("10000");
    expect(accept?.asset).toBe("10458941");
    expect(accept?.payTo).toBe(testMerchantConfig.payTo);
    expect(accept?.maxTimeoutSeconds).toBe(300);
    expect(accept?.extra).toEqual({
      name: "USDC",
      tag: "x402-global-challenge",
      decimals: 6,
      feePayer: testMerchantConfig.feePayer
    });
    expect(accept?.resource).toEqual({
      url: `https://growtrack.example${walletLive.path}`,
      description: walletLive.description,
      mimeType: "application/json"
    });
    // The discovery extension also rides on the accept, which is the copy the
    // facilitator catalogs from.
    expect(accept?.extensions?.bazaar.info.input.method).toBe("GET");
  });

  it("prices each resource independently, so a composite endpoint cannot share a price", () => {
    const prices = (["wallet-live", "portfolio-snapshot", "portfolio-report"] as const).map(
      (id) => testBuilder(id).build().accepts[0]?.amount
    );

    expect(prices).toEqual(["10000", "2000", "1000"]);
    expect(new Set(prices).size).toBe(3);
  });

  it("settles every resource to the one merchant payTo, which is what rolls them into one leaderboard entry", () => {
    for (const id of ["wallet-live", "portfolio-snapshot", "portfolio-report"] as const) {
      expect(testBuilder(id).build().accepts[0]?.payTo).toBe(testMerchantConfig.payTo);
    }
  });

  it("omits error by default and includes it verbatim when provided", () => {
    expect(testBuilder("wallet-live").build()).not.toHaveProperty("error");
    expect(testBuilder("wallet-live").build("Payment required").error).toBe("Payment required");
  });

  it("omits resource and extensions entirely when no public base URL is configured", () => {
    const offline = new PaymentRequirementsBuilder(testMerchantConfigWithoutBaseUrl, walletLive);

    expect(offline.build()).not.toHaveProperty("resource");
    expect(offline.build()).not.toHaveProperty("extensions");
  });

  it("derives the listing URL from the merchant's one root domain plus the resource path", () => {
    const resource = testBuilder("portfolio-report").buildResource();

    expect(resource?.url).toBe("https://growtrack.example/v1/portfolio/report");
    expect(resource?.description).toBe(testPaidResources["portfolio-report"].description);
  });

  it("advertises the route template only for parameterized routes", () => {
    expect(testBuilder("wallet-live").buildExtensions()?.bazaar.routeTemplate).toBe(
      "/v1/wallets/:chain/:address/live"
    );
    expect(testBuilder("portfolio-report").buildExtensions()?.bazaar.routeTemplate).toBeUndefined();
  });

  it("describes each resource's own input contract in the Bazaar discovery extension", () => {
    const live = testBuilder("wallet-live").buildExtensions()?.bazaar;
    const report = testBuilder("portfolio-report").buildExtensions()?.bazaar;

    expect(Object.keys(live?.info.input.queryParams ?? {})).toEqual(["chain", "address"]);
    expect(Object.keys(report?.info.input.queryParams ?? {})).toEqual(["addresses"]);

    // The chain enum comes from the wired providers, so the advertised vocabulary
    // cannot list a chain the process cannot read.
    expect(chainEnumOf(live?.schema)).toEqual(["ethereum", "algorand", "solana", "bitcoin"]);
  });
});

// Reads the discovery schema's chain vocabulary without an `any` cast: the schema is
// an opaque JSON Schema, so the shape is narrowed once, here.
function chainEnumOf(schema: unknown): unknown {
  const queryParams = readPath(schema, ["properties", "input", "properties", "queryParams"]);
  return readPath(queryParams, ["properties", "chain", "enum"]);
}

function readPath(value: unknown, keys: readonly string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
