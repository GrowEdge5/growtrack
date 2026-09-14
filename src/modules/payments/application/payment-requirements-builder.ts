import type { PaymentAccept, PaymentRequirements } from "../domain/payment-requirements.js";

// Configuration for a single priced resource. All values originate from validated
// environment config (see env.ts). payTo/feePayer are PUBLIC addresses only.
export interface X402PricingConfig {
  network: string;
  asset: string;
  // Human-readable asset name (e.g. "USDC") advertised in extra.name for the Bazaar.
  assetName: string;
  assetDecimals: number;
  priceAtomic: string;
  payTo: string;
  feePayer: string;
  maxTimeoutSeconds: number;
  tag: string;
  // Canonical PUBLIC URL of the priced resource and its human-readable summary,
  // surfaced in the GoPlausible Bazaar listing. Optional: omitted locally where
  // there is no stable public URL to advertise (the 402 then carries no resource).
  resourceUrl?: string;
  resourceDescription?: string;
}

// The paid resource returns JSON.
const RESOURCE_MIME_TYPE = "application/json";
// Fallback Bazaar summary when X402_RESOURCE_DESCRIPTION is unset but a URL is set.
export const DEFAULT_RESOURCE_DESCRIPTION =
  "Growtrack multichain wallet intelligence — live wallet snapshot";

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
        name: this.config.assetName,
        tag: this.config.tag,
        decimals: this.config.assetDecimals,
        feePayer: this.config.feePayer
      }
    };
  }

  public build(error?: string): PaymentRequirements {
    return {
      x402Version: 2,
      ...(error !== undefined ? { error } : {}),
      ...(this.config.resourceUrl !== undefined
        ? {
            resource: {
              url: this.config.resourceUrl,
              description: this.config.resourceDescription ?? DEFAULT_RESOURCE_DESCRIPTION,
              mimeType: RESOURCE_MIME_TYPE
            }
          }
        : {}),
      accepts: [this.buildAccept()]
    };
  }
}
