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
  accepts: PaymentAccept[];
}
