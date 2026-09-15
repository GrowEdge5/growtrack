import type {
  PaymentAccept,
  PaymentExtensions,
  PaymentRequirements,
  PaymentResource
} from "../domain/payment-requirements.js";

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
  // The resource descriptor rides on the accept too: the facilitator auto-catalogs
  // the Bazaar listing from the accept it sees on /verify + /settle.
  public buildAccept(): PaymentAccept {
    const resource = this.buildResource();
    const extensions = this.buildExtensions();
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
      },
      ...(resource !== undefined ? { resource } : {}),
      ...(extensions !== undefined ? { extensions } : {})
    };
  }

  public buildResource(): PaymentResource | undefined {
    if (this.config.resourceUrl === undefined) {
      return undefined;
    }
    return {
      url: this.config.resourceUrl,
      description: this.config.resourceDescription ?? DEFAULT_RESOURCE_DESCRIPTION,
      mimeType: RESOURCE_MIME_TYPE
    };
  }

  // Bazaar discovery extension: describes the endpoint's input (method + path
  // params) and output (with an example) so the facilitator can populate the
  // listing's discoveryInfo. `schema` mirrors `info` (the facilitator validates
  // info against it); `routeTemplate` declares the :param canonical path for the
  // dynamic route. Present only alongside a configured resourceUrl.
  public buildExtensions(): PaymentExtensions | undefined {
    if (this.config.resourceUrl === undefined) {
      return undefined;
    }
    const routeTemplate = this.buildRouteTemplate();
    return {
      bazaar: {
        info: {
          input: {
            type: "http",
            method: "GET",
            pathParams: {
              chain: "ethereum | algorand",
              address: "on-chain wallet address"
            }
          },
          output: {
            type: "json",
            example: {
              wallet: {
                chain: { slug: "algorand" },
                canonicalAddress: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4"
              },
              status: "complete",
              nativeBalance: "3622055",
              nativeSymbol: "ALGO",
              totalValueUsd: "0.82",
              holdings: [{ symbol: "USDC", rawAmount: "480683", valueUsd: "0.48" }],
              transactions: [],
              positions: [],
              signals: []
            }
          }
        },
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                type: { type: "string", const: "http" },
                method: { type: "string", enum: ["GET"] },
                pathParams: { type: "object" }
              },
              required: ["type", "method"],
              additionalProperties: true
            },
            output: {
              type: "object",
              properties: {
                type: { type: "string" },
                example: { type: "object" }
              },
              additionalProperties: true
            }
          },
          required: ["input"]
        },
        ...(routeTemplate !== undefined ? { routeTemplate } : {})
      }
    };
  }

  // When the configured resource URL is a :param template (e.g.
  // ".../v1/wallets/:chain/:address/live"), expose its path as the canonical
  // routeTemplate so the Bazaar lists the dynamic route, not one concrete URL.
  private buildRouteTemplate(): string | undefined {
    if (this.config.resourceUrl === undefined) {
      return undefined;
    }
    try {
      const url = new URL(this.config.resourceUrl);
      return url.pathname.includes(":") ? url.pathname : undefined;
    } catch {
      return undefined;
    }
  }

  public build(error?: string): PaymentRequirements {
    const resource = this.buildResource();
    const extensions = this.buildExtensions();
    return {
      x402Version: 2,
      ...(error !== undefined ? { error } : {}),
      ...(resource !== undefined ? { resource } : {}),
      ...(extensions !== undefined ? { extensions } : {}),
      accepts: [this.buildAccept()]
    };
  }
}
