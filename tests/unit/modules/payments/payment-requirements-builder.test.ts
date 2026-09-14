import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESOURCE_DESCRIPTION,
  PaymentRequirementsBuilder
} from "../../../../src/modules/payments/application/payment-requirements-builder.js";

// Live-verified testnet constants (GoPlausible facilitator, 2026-08-31).
const config = {
  network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
  asset: "10458941",
  assetName: "USDC",
  assetDecimals: 6,
  priceAtomic: "1000",
  payTo: "VTOEM6527WMLHWPTKRBQNQLO5XWGFJC5Z6T7E25TFBKMWP5NFPDP73ZD4U",
  feePayer: "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA",
  maxTimeoutSeconds: 300,
  tag: "x402-global-challenge"
};

describe("PaymentRequirementsBuilder", () => {
  it("builds a single exact-scheme accept from config, with an atomic-string amount", () => {
    const requirements = new PaymentRequirementsBuilder(config).build();

    expect(requirements.x402Version).toBe(2);
    expect(requirements.accepts).toHaveLength(1);
    // Amount stays a string so 6-decimal USDC and large values never hit float rounding.
    expect(requirements.accepts[0]).toEqual({
      scheme: "exact",
      network: config.network,
      amount: "1000",
      asset: "10458941",
      payTo: config.payTo,
      maxTimeoutSeconds: 300,
      extra: {
        name: "USDC",
        tag: "x402-global-challenge",
        decimals: 6,
        feePayer: config.feePayer
      }
    });
  });

  it("omits error by default and includes it verbatim when provided", () => {
    expect(new PaymentRequirementsBuilder(config).build()).not.toHaveProperty("error");
    expect(new PaymentRequirementsBuilder(config).build("Payment required").error).toBe(
      "Payment required"
    );
  });

  it("omits resource unless a resourceUrl is configured", () => {
    expect(new PaymentRequirementsBuilder(config).build()).not.toHaveProperty("resource");

    const built = new PaymentRequirementsBuilder({
      ...config,
      resourceUrl: "https://growtrack.example/v1/wallets"
    }).build();
    expect(built.resource).toEqual({
      url: "https://growtrack.example/v1/wallets",
      description: DEFAULT_RESOURCE_DESCRIPTION,
      mimeType: "application/json"
    });
  });

  it("uses a provided resourceDescription verbatim over the default", () => {
    const built = new PaymentRequirementsBuilder({
      ...config,
      resourceUrl: "https://growtrack.example/v1/wallets",
      resourceDescription: "Custom summary"
    }).build();
    expect(built.resource?.description).toBe("Custom summary");
  });
});
