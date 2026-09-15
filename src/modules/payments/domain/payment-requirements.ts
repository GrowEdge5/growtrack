// x402 v2 "exact" scheme payment requirements — the shape served in an HTTP 402
// response body and (base64-encoded) in the PAYMENT-REQUIRED header. These types
// mirror the LIVE GoPlausible facilitator contract (headers verified 2026-08-31;
// body/accept shape reconciled with the GoPlausible x402 reference 2026-09-14).
// Amounts are atomic-unit strings (never numbers) so large values and 6-decimal
// USDC survive without float rounding.

export interface PaymentAcceptExtra {
  // Human-readable asset name (e.g. "USDC"), surfaced in the Bazaar listing.
  name: string;
  // Tagging the accept with "x402-global-challenge" is what enters the resource
  // into the Algorand Global x402 Challenge and surfaces it in the Bazaar.
  tag: string;
  decimals: number;
  // The facilitator's PUBLIC key that sponsors the transaction fee (gasless on
  // Algorand). Never a key Growtrack holds.
  feePayer: string;
}

export interface PaymentAccept {
  scheme: "exact";
  // CAIP-2 network id, e.g. algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
  network: string;
  // Price in atomic units, as a decimal string (e.g. "1000" = $0.001 at 6 decimals).
  amount: string;
  // ASA id as a string (e.g. "10458941" testnet USDC). Top-level per the x402 v2
  // contract — a bare id, not "asa:...".
  asset: string;
  // The PUBLIC recipient address, sourced from config. Growtrack never holds its key.
  payTo: string;
  maxTimeoutSeconds: number;
  extra: PaymentAcceptExtra;
  // Present when a public resource URL is configured (X402_RESOURCE_URL). The
  // facilitator auto-catalogs the resource into the Bazaar from the accept it
  // receives on /verify + /settle, so the descriptor must ride on the accept —
  // not only on the 402 envelope — for the listing to appear.
  resource?: PaymentResource;
  // Bazaar discovery extension, forwarded with the accept for auto-cataloging.
  extensions?: PaymentExtensions;
}

// Top-level x402 v2 resource descriptor. Its `description` becomes the
// human-readable summary shown in the GoPlausible Bazaar; `url` is the canonical
// listing key (kept stable across requests so one endpoint maps to one listing).
export interface PaymentResource {
  url: string;
  description: string;
  mimeType: string;
}

export interface PaymentRequirements {
  x402Version: 2;
  // Optional human-readable reason, per the x402 envelope.
  error?: string;
  // Present when a public resource URL is configured (X402_RESOURCE_URL); omitted
  // locally/testnet where there is no stable public URL to advertise.
  resource?: PaymentResource;
  // Present with `resource`: the GoPlausible Bazaar extension carrying the
  // endpoint's input/output shape. The facilitator copies `bazaar.info` into the
  // listing's discoveryInfo when it auto-catalogs the resource.
  extensions?: PaymentExtensions;
  accepts: PaymentAccept[];
}

// The GoPlausible Bazaar discovery extension (x402 v2). `info` describes the
// HTTP input (method + params) and JSON output (with an example) of the priced
// resource; `schema` is the JSON Schema `info` is validated against by the
// facilitator; `routeTemplate` is the :param-style canonical path for dynamic
// routes (e.g. "/v1/wallets/:chain/:address/live"). The facilitator catalogs
// the listing from these fields when they ride on the payment payload.
export interface PaymentExtensions {
  bazaar: {
    info: {
      input: {
        type: "http";
        method: string;
        // The Bazaar GET discovery contract reads `queryParams` (the de-facto
        // field every cataloged resource uses, even for path parameters).
        queryParams?: Record<string, string>;
      };
      output: {
        type: "json";
        example: Record<string, unknown>;
      };
    };
    schema: Record<string, unknown>;
    routeTemplate?: string;
  };
}
