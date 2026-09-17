import {
  createPaymentBuilders,
  PaymentRequirementsBuilder,
  type X402MerchantConfig
} from "../../src/modules/payments/application/payment-requirements-builder.js";
import {
  buildPaidResources,
  type PaidResourceDefinition,
  type PaidResourceId
} from "../../src/modules/payments/domain/paid-resource.js";

// Testnet constants, live-verified against the GoPlausible facilitator. The payTo
// here is a throwaway testnet address, never a production one.
const baseMerchantConfig = {
  network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
  asset: "10458941",
  assetName: "USDC",
  assetDecimals: 6,
  payTo: "VTOEM6527WMLHWPTKRBQNQLO5XWGFJC5Z6T7E25TFBKMWP5NFPDP73ZD4U",
  feePayer: "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA",
  maxTimeoutSeconds: 300,
  tag: "x402-global-challenge"
} as const;

export const testMerchantConfig: X402MerchantConfig = {
  ...baseMerchantConfig,
  publicBaseUrl: "https://growtrack.example"
};

// The same merchant with no public URL, as a local/CI run is configured: no
// resource descriptor and no discovery extension can be advertised.
export const testMerchantConfigWithoutBaseUrl: X402MerchantConfig = { ...baseMerchantConfig };

// The real catalog, so the tests exercise the shipping resource definitions rather
// than a parallel set that could drift from them.
export const testPaidResourceList: readonly PaidResourceDefinition[] = buildPaidResources({
  chainSlugs: ["ethereum", "algorand", "solana", "bitcoin"]
});

export const testPaidResources: Readonly<Record<PaidResourceId, PaidResourceDefinition>> = {
  "wallet-live": requireResource("wallet-live"),
  "portfolio-snapshot": requireResource("portfolio-snapshot"),
  "portfolio-report": requireResource("portfolio-report")
};

export function testBuilder(id: PaidResourceId): PaymentRequirementsBuilder {
  return new PaymentRequirementsBuilder(testMerchantConfig, testPaidResources[id]);
}

// One builder per resource, as the container wires them.
export const testPaymentBuilders: ReadonlyMap<PaidResourceId, PaymentRequirementsBuilder> =
  createPaymentBuilders(testMerchantConfig, testPaidResourceList);

function requireResource(id: PaidResourceId): PaidResourceDefinition {
  const found = testPaidResourceList.find((resource) => resource.id === id);
  if (found === undefined) {
    throw new Error(`Test fixture is missing paid resource '${id}'`);
  }
  return found;
}
