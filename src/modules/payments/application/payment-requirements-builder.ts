import type {
  PaymentAccept,
  PaymentExtensions,
  PaymentRequirements,
  PaymentResource
} from "../domain/payment-requirements.js";
import type { PaidResourceDefinition, PaidResourceId } from "../domain/paid-resource.js";

// Merchant-level x402 configuration — everything shared by every priced resource
// in the Composite Entry. All values originate from validated environment config
// (see env.ts). payTo/feePayer are PUBLIC addresses only.
export interface X402MerchantConfig {
  network: string;
  asset: string;
  // Human-readable asset name (e.g. "USDC") advertised in extra.name for the Bazaar.
  assetName: string;
  assetDecimals: number;
  payTo: string;
  feePayer: string;
  maxTimeoutSeconds: number;
  tag: string;
  // Canonical PUBLIC origin of the deployment (e.g. "https://growtrack.xyz"). Each
  // resource's listing URL is derived as origin + its path template, so every
  // endpoint of the Composite Entry advertises the ONE root domain the merchant
  // is registered against. Omitted locally where there is no stable public URL
  // (the 402 then carries no resource).
  publicBaseUrl?: string;
  // Legacy single-resource override: the pre-Composite deploy set the full /live
  // URL here. When publicBaseUrl is unset, this supplies the origin so an
  // already-configured deployment keeps cataloging without an env change.
  legacyResourceUrl?: string;
}

// The paid resources return JSON.
const RESOURCE_MIME_TYPE = "application/json";

// Pure, transport-agnostic construction of the x402 PaymentRequirements for ONE
// priced resource. It knows nothing about HTTP, base64, or Fastify — the guard
// adapts it to the wire. This keeps the money-shaped logic trivially unit-testable.
//
// One instance per resource (see createPaymentBuilders): price, description and
// the advertised input/output contract all come from the resource definition, so
// the Composite Entry's endpoints cannot accidentally share a price.
export class PaymentRequirementsBuilder {
  public constructor(
    private readonly merchant: X402MerchantConfig,
    private readonly resource: PaidResourceDefinition
  ) {}

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
      network: this.merchant.network,
      amount: this.resource.priceAtomic,
      asset: this.merchant.asset,
      payTo: this.merchant.payTo,
      maxTimeoutSeconds: this.merchant.maxTimeoutSeconds,
      extra: {
        name: this.merchant.assetName,
        tag: this.merchant.tag,
        decimals: this.merchant.assetDecimals,
        feePayer: this.merchant.feePayer
      },
      ...(resource !== undefined ? { resource } : {}),
      ...(extensions !== undefined ? { extensions } : {})
    };
  }

  public buildResource(): PaymentResource | undefined {
    const url = this.resourceUrl();
    if (url === undefined) {
      return undefined;
    }
    return {
      url,
      description: this.resource.description,
      mimeType: RESOURCE_MIME_TYPE
    };
  }

  // Bazaar discovery extension: describes the endpoint's input (method + params)
  // and output (with an example) so the facilitator can populate the listing's
  // discoveryInfo. `schema` mirrors `info` (the facilitator validates info against
  // it); `routeTemplate` declares the :param canonical path for the dynamic route.
  // Present only alongside a configured public URL.
  public buildExtensions(): PaymentExtensions | undefined {
    if (this.resourceUrl() === undefined) {
      return undefined;
    }
    return {
      bazaar: {
        info: {
          input: {
            type: "http",
            method: this.resource.method,
            queryParams: this.resource.queryParams
          },
          output: {
            type: "json",
            example: this.resource.outputExample
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
                method: { type: "string", enum: [this.resource.method] },
                queryParams: {
                  type: "object",
                  properties: this.resource.queryParamsSchema,
                  additionalProperties: true
                }
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
        // Only dynamic routes advertise a template; a static path would be
        // redundant with the listing URL itself.
        ...(this.resource.path.includes(":") ? { routeTemplate: this.resource.path } : {})
      }
    };
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

  // The absolute public URL this resource is listed under: the merchant's one
  // canonical root domain plus this resource's path template.
  private resourceUrl(): string | undefined {
    const base = this.merchant.publicBaseUrl ?? originOf(this.merchant.legacyResourceUrl);
    if (base === undefined) {
      return undefined;
    }
    try {
      return new URL(this.resource.path, ensureTrailingSlash(base)).toString();
    } catch {
      return undefined;
    }
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function originOf(url: string | undefined): string | undefined {
  if (url === undefined) {
    return undefined;
  }
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

// One builder per paid resource, keyed by resource id. The routes pick their
// builder by id, which is what keeps each endpoint's price and Bazaar description
// independent while they all settle to the same payTo.
export function createPaymentBuilders(
  merchant: X402MerchantConfig,
  resources: readonly PaidResourceDefinition[]
): ReadonlyMap<PaidResourceId, PaymentRequirementsBuilder> {
  return new Map(
    resources.map((resource) => [resource.id, new PaymentRequirementsBuilder(merchant, resource)])
  );
}
