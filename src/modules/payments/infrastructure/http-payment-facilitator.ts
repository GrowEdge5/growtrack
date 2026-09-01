import { z } from "zod";

import type {
  PaymentFacilitator,
  PaymentPayload,
  SettleResult,
  VerifyResult
} from "../application/ports/payment-facilitator.js";
import type { PaymentAccept } from "../domain/payment-requirements.js";

export interface HttpPaymentFacilitatorConfig {
  // Base URL of the GoPlausible facilitator (e.g. https://facilitator.goplausible.xyz).
  facilitatorUrl: string;
  // Hard timeout for each /verify and /settle call.
  timeoutMs: number;
  // x402 protocol version sent in the envelope; defaults to 2.
  x402Version?: number;
}

// Facilitator responses parsed defensively: .passthrough() tolerates extra fields
// (amount, extensions, …) the facilitator may add, and errorReason is nullable to
// span both the coinbase spec and the GoPlausible README. transaction/network
// default to "" so a partial body never throws mid-flow — the guard decides on the
// boolean flags, not on field presence.
const verifyResultSchema = z
  .object({
    isValid: z.boolean(),
    invalidReason: z.string().optional(),
    payer: z.string().optional()
  })
  .passthrough();

const settleResultSchema = z
  .object({
    success: z.boolean(),
    errorReason: z.string().nullable().optional(),
    payer: z.string().optional(),
    transaction: z.string().default(""),
    network: z.string().default("")
  })
  .passthrough();

// Adapter over the official GoPlausible x402 facilitator. It speaks the x402 v2
// facilitator contract verified against specs/x402-specification-v2.md:
//   POST /verify  and  POST /settle
//   body: { x402Version, paymentPayload, paymentRequirements }
// Growtrack forwards the client's opaque paymentPayload untouched and pairs it with
// the single accept it priced the resource at. Any non-2xx or network/timeout error
// throws, so the guard fails closed and never serves an unpaid request.
export class HttpPaymentFacilitator implements PaymentFacilitator {
  private readonly x402Version: number;

  public constructor(private readonly config: HttpPaymentFacilitatorConfig) {
    this.x402Version = config.x402Version ?? 2;
  }

  public async verify(payload: PaymentPayload, requirements: PaymentAccept): Promise<VerifyResult> {
    const body = await this.post("/verify", payload, requirements);
    const parsed = verifyResultSchema.parse(body);
    // Optional fields are spread in only when present: exactOptionalPropertyTypes
    // forbids assigning an explicit `undefined` to an optional property.
    return {
      isValid: parsed.isValid,
      ...(parsed.invalidReason !== undefined ? { invalidReason: parsed.invalidReason } : {}),
      ...(parsed.payer !== undefined ? { payer: parsed.payer } : {})
    };
  }

  public async settle(payload: PaymentPayload, requirements: PaymentAccept): Promise<SettleResult> {
    const body = await this.post("/settle", payload, requirements);
    const parsed = settleResultSchema.parse(body);
    return {
      success: parsed.success,
      transaction: parsed.transaction,
      network: parsed.network,
      // errorReason may legitimately be null (spec) — only `undefined` is excluded.
      ...(parsed.errorReason !== undefined ? { errorReason: parsed.errorReason } : {}),
      ...(parsed.payer !== undefined ? { payer: parsed.payer } : {})
    };
  }

  private async post(
    path: string,
    payload: PaymentPayload,
    requirements: PaymentAccept
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.facilitatorUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          x402Version: this.x402Version,
          paymentPayload: payload,
          paymentRequirements: requirements
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`x402 facilitator ${path} responded with HTTP ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}
