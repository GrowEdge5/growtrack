import type { PaymentAccept, PaymentRequirements } from "../domain/payment-requirements.js";

// Configuration for a single priced resource. All values originate from validated
// environment config (see env.ts). payTo/feePayer are PUBLIC addresses only.
export interface X402PricingConfig {
  network: string;
  asset: string;
  assetDecimals: number;
  priceAtomic: string;
  payTo: string;
  feePayer: string;
  maxTimeoutSeconds: number;
  tag: string;
}

// Pure, transport-agnostic construction of the x402 PaymentRequirements. It knows
// nothing about HTTP, base64, or Fastify — the guard adapts it to the wire. This
// keeps the money-shaped logic trivially unit-testable.
export class PaymentRequirementsBuilder {
  public constructor(private readonly config: X402PricingConfig) {}

  // The single "exact" accept describing this priced resource. This IS the
  // canonical x402 `PaymentRequirements` object the facilitator's /verify and
  // /settle expect (the 402 body below just wraps it in an accepts[] envelope).
  // Because it is derived deterministically from config, the accept issued in the
  // 402 and the one sent to the facilitator on the paid retry are byte-identical.
  public buildAccept(): PaymentAccept {
    return {
      scheme: "exact",
      network: this.config.network,
      amount: this.config.priceAtomic,
      asset: this.config.asset,
      payTo: this.config.payTo,
      maxTimeoutSeconds: this.config.maxTimeoutSeconds,
      extra: {
        asset: this.config.asset,
        tag: this.config.tag,
        decimals: this.config.assetDecimals,
        feePayer: this.config.feePayer
      }
    };
  }

  public build(error?: string): PaymentRequirements {
    return {
      x402Version: 2,
      accepts: [this.buildAccept()],
      ...(error !== undefined ? { error } : {})
    };
  }
}
