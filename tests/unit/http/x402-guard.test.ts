import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import {
  createX402Guard,
  decodePaymentSignature,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER
} from "../../../src/http/plugins/x402-guard.js";
import type {
  PaymentFacilitator,
  SettleResult,
  VerifyResult
} from "../../../src/modules/payments/application/ports/payment-facilitator.js";
import type { PaymentRequirements } from "../../../src/modules/payments/domain/payment-requirements.js";
import { testBuilder } from "../../support/x402-fixtures.js";

const builder = testBuilder("wallet-live");

// A chainable fake reply capturing the calls the guard makes.
function fakeReply() {
  const reply = {
    code: vi.fn(() => reply),
    header: vi.fn(() => reply),
    type: vi.fn(() => reply),
    send: vi.fn(() => reply)
  };
  return reply;
}

function fakeRequest(headers: Record<string, string | string[]> = {}): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

// A well-formed, opaque client payload as it arrives base64-encoded in the
// PAYMENT-SIGNATURE header. Its internals are irrelevant to the guard — only that
// it decodes into something carrying an x402Version.
const signatureHeader = Buffer.from(
  JSON.stringify({
    x402Version: 2,
    scheme: "exact",
    network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    payload: { paymentGroup: ["dHhu"], paymentIndex: 0 }
  }),
  "utf8"
).toString("base64");

// Builds a mocked facilitator plus handles on its verify/settle spies so tests can
// assert both the guard's response and whether each leg was reached.
function mockFacilitator(verifyResult: VerifyResult, settleResult: SettleResult) {
  const verify = vi.fn(async () => verifyResult);
  const settle = vi.fn(async () => settleResult);
  const facilitator: PaymentFacilitator = { verify, settle };
  return { facilitator, verify, settle };
}

function sentBody(reply: ReturnType<typeof fakeReply>): PaymentRequirements {
  return (reply.send.mock.calls[0] as unknown as [PaymentRequirements])[0];
}

describe("createX402Guard", () => {
  it("passes through untouched when disabled (freemium free path)", async () => {
    const reply = fakeReply();
    const guard = createX402Guard({ enabled: false, builder });

    await guard(fakeRequest(), reply as unknown as FastifyReply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("fails closed with 402 + a base64 PAYMENT-REQUIRED header when enabled without a facilitator", async () => {
    const reply = fakeReply();
    const guard = createX402Guard({ enabled: true, builder });

    await guard(fakeRequest(), reply as unknown as FastifyReply);

    expect(reply.code).toHaveBeenCalledWith(402);
    expect(reply.type).toHaveBeenCalledWith("application/json");

    const [headerName, headerValue] = reply.header.mock.calls[0] as unknown as [string, string];
    expect(headerName).toBe(PAYMENT_REQUIRED_HEADER);
    const decoded = JSON.parse(
      Buffer.from(headerValue, "base64").toString("utf8")
    ) as PaymentRequirements;
    expect(decoded.accepts[0]?.extra.tag).toBe("x402-global-challenge");

    // The JSON body equals the encoded requirements.
    expect(reply.send).toHaveBeenCalledWith(decoded);
  });

  it("returns 402 without touching the facilitator when the PAYMENT-SIGNATURE header is absent", async () => {
    const reply = fakeReply();
    const { facilitator, verify } = mockFacilitator(
      { isValid: true },
      { success: true, transaction: "TX", network: "algorand:x" }
    );
    const guard = createX402Guard({ enabled: true, builder, facilitator });

    await guard(fakeRequest(), reply as unknown as FastifyReply);

    expect(reply.code).toHaveBeenCalledWith(402);
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns 402 surfacing the invalidReason and never settles when verification is invalid", async () => {
    const reply = fakeReply();
    const { facilitator, settle } = mockFacilitator(
      { isValid: false, invalidReason: "insufficient_funds" },
      { success: true, transaction: "TX", network: "algorand:x" }
    );
    const guard = createX402Guard({ enabled: true, builder, facilitator });

    await guard(
      fakeRequest({ [PAYMENT_SIGNATURE_HEADER]: signatureHeader }),
      reply as unknown as FastifyReply
    );

    expect(reply.code).toHaveBeenCalledWith(402);
    expect(settle).not.toHaveBeenCalled();
    expect(sentBody(reply).error).toBe("insufficient_funds");
  });

  it("returns 402 surfacing the errorReason when settlement fails", async () => {
    const reply = fakeReply();
    const { facilitator } = mockFacilitator(
      { isValid: true },
      { success: false, errorReason: "settlement_rejected", transaction: "", network: "algorand:x" }
    );
    const guard = createX402Guard({ enabled: true, builder, facilitator });

    await guard(
      fakeRequest({ [PAYMENT_SIGNATURE_HEADER]: signatureHeader }),
      reply as unknown as FastifyReply
    );

    expect(reply.code).toHaveBeenCalledWith(402);
    expect(sentBody(reply).error).toBe("settlement_rejected");
  });

  it("returns 502 (gateway error, not 402) when the facilitator is unreachable during verify", async () => {
    const reply = fakeReply();
    const verify = vi.fn(async () => {
      throw new Error("network down");
    });
    const settle = vi.fn(async () => ({ success: true, transaction: "TX", network: "algorand:x" }));
    const guard = createX402Guard({
      enabled: true,
      builder,
      facilitator: { verify, settle }
    });

    await guard(
      fakeRequest({ [PAYMENT_SIGNATURE_HEADER]: signatureHeader }),
      reply as unknown as FastifyReply
    );

    expect(reply.code).toHaveBeenCalledWith(502);
    expect(settle).not.toHaveBeenCalled();
  });

  it("serves the resource and sets a base64 PAYMENT-RESPONSE when verify + settle succeed", async () => {
    const reply = fakeReply();
    const settleResult: SettleResult = {
      success: true,
      payer: "PAYER",
      transaction: "TXID123",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
    };
    const { facilitator, verify, settle } = mockFacilitator(
      { isValid: true, payer: "PAYER" },
      settleResult
    );
    const guard = createX402Guard({ enabled: true, builder, facilitator });

    const result = await guard(
      fakeRequest({ [PAYMENT_SIGNATURE_HEADER]: signatureHeader }),
      reply as unknown as FastifyReply
    );

    // The guard let the Fastify lifecycle continue: no status set, no body sent.
    expect(result).toBeUndefined();
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledTimes(1);

    const [headerName, headerValue] = reply.header.mock.calls[0] as unknown as [string, string];
    expect(headerName).toBe(PAYMENT_RESPONSE_HEADER);
    const decoded = JSON.parse(Buffer.from(headerValue, "base64").toString("utf8")) as SettleResult;
    expect(decoded.success).toBe(true);
    expect(decoded.transaction).toBe("TXID123");
  });
});

describe("decodePaymentSignature", () => {
  it("decodes a base64-encoded JSON payload", () => {
    expect(decodePaymentSignature(signatureHeader)?.x402Version).toBe(2);
  });

  it("decodes a raw (unwrapped) JSON payload", () => {
    const raw = JSON.stringify({ x402Version: 2, scheme: "exact" });
    expect(decodePaymentSignature(raw)?.x402Version).toBe(2);
  });

  it("returns null for undecodable input", () => {
    expect(decodePaymentSignature("!!!not-json!!!")).toBeNull();
  });
});
