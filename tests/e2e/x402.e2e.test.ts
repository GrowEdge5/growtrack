import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { createX402Guard } from "../../src/http/plugins/x402-guard.js";
import type { PaymentFacilitator } from "../../src/modules/payments/application/ports/payment-facilitator.js";
import {
  liveWalletResponseSchema,
  paymentRequiredSchema,
  walletParamsSchema
} from "../../src/http/routes/v1/wallet.schemas.js";
import { testBuilder } from "../support/x402-fixtures.js";

const builder = testBuilder("wallet-live");

// A minimal snapshot matching liveWalletResponseSchema, returned by a stub handler
// so the guard + zod serializer are exercised with zero provider/DB IO.
const stubLiveResponse: z.infer<typeof liveWalletResponseSchema> = {
  data: {
    wallet: {
      chain: { id: 2, slug: "algorand", namespace: "algorand", nativeSymbol: "ALGO" },
      canonicalAddress: "DDTEFH2N2P5GDFAJOT6SSD2TV2DUSC3DMX7KTVNOYXWISWTMQBMDG5DJ5M",
      displayAddress: "DDTEFH2N2P5GDFAJOT6SSD2TV2DUSC3DMX7KTVNOYXWISWTMQBMDG5DJ5M"
    },
    status: "complete",
    nativeBalance: "5000000",
    nativeSymbol: "ALGO",
    provider: "algonode-rest",
    capturedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-01T00:15:00.000Z",
    holdings: [],
    transactions: [],
    positions: [],
    signals: []
  },
  meta: { source: "live", stale: false }
};

function buildApp(enabled: boolean, facilitator?: PaymentFacilitator) {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.get(
    "/v1/wallets/:chain/:address/live",
    {
      preHandler: createX402Guard({
        enabled,
        builder,
        ...(facilitator !== undefined ? { facilitator } : {})
      }),
      schema: {
        params: walletParamsSchema,
        response: { 200: liveWalletResponseSchema, 402: paymentRequiredSchema }
      }
    },
    async () => stubLiveResponse
  );
  return app;
}

// A stub facilitator standing in for the real GoPlausible service: it approves the
// payment (verify) and reports an on-chain settlement (settle) without any network
// IO, so the paid happy-path is exercised end to end with a deterministic txId.
const payingFacilitator: PaymentFacilitator = {
  verify: async () => ({ isValid: true, payer: "PAYER" }),
  settle: async () => ({
    success: true,
    payer: "PAYER",
    transaction: "TX123",
    network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
  })
};

// A well-formed, opaque client payment payload, base64-encoded as it would arrive in
// the PAYMENT-SIGNATURE header.
const signatureHeader = Buffer.from(
  JSON.stringify({ x402Version: 2, scheme: "exact" }),
  "utf8"
).toString("base64");

const url = "/v1/wallets/algorand/DDTEFH2N2P5GDFAJOT6SSD2TV2DUSC3DMX7KTVNOYXWISWTMQBMDG5DJ5M/live";

describe("x402 guard on the paid /live route", () => {
  it("returns 402 with payment requirements (body + PAYMENT-REQUIRED header) when unpaid", async () => {
    const app = buildApp(true);
    await app.ready();

    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(402);
    const body = paymentRequiredSchema.parse(response.json());
    expect(body.x402Version).toBe(2);
    expect(body.accepts[0]?.scheme).toBe("exact");
    expect(body.accepts[0]?.asset).toBe("10458941");
    // $0.01 per live snapshot — the Composite Entry's cheapest tier.
    expect(body.accepts[0]?.amount).toBe("10000");
    expect(body.accepts[0]?.extra.tag).toBe("x402-global-challenge");
    expect(body.accepts[0]?.extra.name).toBe("USDC");
    expect(body.resource?.url).toBe("https://growtrack.example/v1/wallets/:chain/:address/live");
    expect(body.resource?.mimeType).toBe("application/json");

    // Regression guard: the zod response schema used to under-declare the Bazaar
    // extension, so the serializer silently dropped it from the BODY while the
    // base64 header kept it — the cataloging payload the facilitator reads must
    // survive serialization on both surfaces.
    expect(body.extensions?.bazaar).toBeDefined();
    expect(body.accepts[0]?.extensions?.bazaar).toBeDefined();
    expect(body.accepts[0]?.resource?.url).toBe(body.resource?.url);

    // The header carries the same requirements, base64-encoded.
    const header = response.headers["payment-required"];
    expect(header).toBeDefined();
    const decoded = paymentRequiredSchema.parse(
      JSON.parse(Buffer.from(header as string, "base64").toString("utf8"))
    );
    expect(decoded).toEqual(body);

    await app.close();
  });

  it("serves the resource (no 402) when x402 is disabled", async () => {
    const app = buildApp(false);
    await app.ready();

    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(200);
    const parsed = liveWalletResponseSchema.parse(response.json());
    expect(parsed.meta.source).toBe("live");

    await app.close();
  });

  it("serves the resource and returns a base64 PAYMENT-RESPONSE when payment verifies + settles", async () => {
    const app = buildApp(true, payingFacilitator);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url,
      headers: { "payment-signature": signatureHeader }
    });

    expect(response.statusCode).toBe(200);
    const parsed = liveWalletResponseSchema.parse(response.json());
    expect(parsed.meta.source).toBe("live");

    // The settlement result is echoed back as base64-encoded JSON.
    const header = response.headers["payment-response"];
    expect(header).toBeDefined();
    const settlement = JSON.parse(Buffer.from(header as string, "base64").toString("utf8")) as {
      success: boolean;
      transaction: string;
    };
    expect(settlement.success).toBe(true);
    expect(settlement.transaction).toBe("TX123");

    await app.close();
  });
});
