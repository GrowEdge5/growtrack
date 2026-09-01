import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import type { PaymentRequirementsBuilder } from "../../modules/payments/application/payment-requirements-builder.js";
import type {
  PaymentFacilitator,
  PaymentPayload
} from "../../modules/payments/application/ports/payment-facilitator.js";

// GoPlausible x402 header names (NOT Coinbase's X-PAYMENT). Verified live
// 2026-08-31. HTTP header names are case-insensitive; we emit lower-case.
// PAYMENT-REQUIRED (402 body, base64) → PAYMENT-SIGNATURE (client's signed payload)
// → PAYMENT-RESPONSE (settlement result, base64 JSON).
export const PAYMENT_REQUIRED_HEADER = "payment-required";
export const PAYMENT_SIGNATURE_HEADER = "payment-signature";
export const PAYMENT_RESPONSE_HEADER = "payment-response";

// A decoded PAYMENT-SIGNATURE must at least look like an x402 payload. We do not
// validate its internals — the facilitator owns that — only that it parsed into an
// object carrying an x402Version.
const paymentPayloadSchema = z.object({ x402Version: z.number() }).passthrough();

// Decode the PAYMENT-SIGNATURE header into an opaque PaymentPayload. Standard x402
// headers are base64-of-JSON (PAYMENT-REQUIRED and PAYMENT-RESPONSE are), so we try
// base64→JSON first, then fall back to raw JSON in case a client sends it unwrapped.
// Returns null when neither yields a plausible x402 payload → the guard 402s. This
// dual path avoids guessing the one wire detail the fetched specs left unstated.
export function decodePaymentSignature(headerValue: string): PaymentPayload | null {
  const candidates = [Buffer.from(headerValue, "base64").toString("utf8"), headerValue];

  for (const candidate of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    const result = paymentPayloadSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  return null;
}

export interface X402GuardOptions {
  // When false the priced route stays open (freemium: x402 is switched on per
  // deploy). When true the route is gated.
  enabled: boolean;
  builder: PaymentRequirementsBuilder;
  // Verifies + settles a supplied PAYMENT-SIGNATURE. When omitted while enabled the
  // guard fails closed (always 402): with no facilitator it cannot confirm payment,
  // so a gated request can never be served.
  facilitator?: PaymentFacilitator;
}

export function createX402Guard(options: X402GuardOptions) {
  return async function x402Guard(request: FastifyRequest, reply: FastifyReply) {
    if (!options.enabled) {
      return;
    }

    const { builder, facilitator } = options;

    // Respond 402 with fresh payment requirements: JSON body + base64 header. Called
    // whenever payment is absent, undecodable, or rejected by the facilitator.
    const requirePayment = (message: string) => {
      const requirements = builder.build(message);
      const encoded = Buffer.from(JSON.stringify(requirements), "utf8").toString("base64");
      reply.code(402).header(PAYMENT_REQUIRED_HEADER, encoded).type("application/json");
      return reply.send(requirements);
    };

    // Upstream failure (facilitator unreachable / 5xx / timeout) is a gateway error,
    // not a client payment error — surface 502 so it is not mistaken for "unpaid".
    const facilitatorUnavailable = (message: string) =>
      reply.code(502).type("application/json").send({ error: message });

    // No facilitator wired → cannot verify or settle → fail closed.
    if (facilitator === undefined) {
      return requirePayment("Payment required to access this resource");
    }

    // 1. A signed payment must be presented.
    const rawHeader = request.headers[PAYMENT_SIGNATURE_HEADER];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (headerValue === undefined || headerValue.length === 0) {
      return requirePayment("PAYMENT-SIGNATURE header is required");
    }

    // 2. Decode the opaque client PaymentPayload (base64 JSON, or raw JSON).
    const payload = decodePaymentSignature(headerValue);
    if (payload === null) {
      return requirePayment("Invalid PAYMENT-SIGNATURE encoding");
    }

    // The single accept this resource was priced at — the canonical, deterministic
    // paymentRequirements the facilitator validates the payment against.
    const requirements = builder.buildAccept();

    // 3. Verify the payment (no funds move yet).
    let verification;
    try {
      verification = await facilitator.verify(payload, requirements);
    } catch {
      return facilitatorUnavailable("Payment facilitator verification is unavailable");
    }
    if (!verification.isValid) {
      return requirePayment(verification.invalidReason ?? "Payment verification failed");
    }

    // 4. Settle the payment (broadcast on-chain).
    let settlement;
    try {
      settlement = await facilitator.settle(payload, requirements);
    } catch {
      return facilitatorUnavailable("Payment facilitator settlement is unavailable");
    }
    if (!settlement.success) {
      return requirePayment(settlement.errorReason ?? "Payment settlement failed");
    }

    // 5. Paid and settled → expose the settlement result as base64 JSON and let the
    // handler run by returning nothing (the Fastify lifecycle continues).
    const settlementHeader = Buffer.from(JSON.stringify(settlement), "utf8").toString("base64");
    reply.header(PAYMENT_RESPONSE_HEADER, settlementHeader);
    return;
  };
}
