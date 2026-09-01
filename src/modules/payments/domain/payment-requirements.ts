// x402 v2 "exact" scheme payment requirements — the shape served in an HTTP 402
// response body and (base64-encoded) in the PAYMENT-REQUIRED header. These types
// mirror the LIVE GoPlausible facilitator contract verified 2026-08-31; see the
// x402-integration reference note. Amounts are atomic-unit strings (never numbers)
// so large values and 6-decimal USDC survive without float rounding.

export interface PaymentAcceptExtra {
  // Duplicated asset id (the facilitator's 402 body carries it both at the top of
  // the accept and inside extra) and the challenge/settlement metadata.
  asset: string;
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
  // ASA id as a string (e.g. "10458941" testnet USDC).
  asset: string;
  // The PUBLIC recipient address, sourced from config. Growtrack never holds its key.
  payTo: string;
  maxTimeoutSeconds: number;
  extra: PaymentAcceptExtra;
}

export interface PaymentRequirements {
  x402Version: 2;
  accepts: PaymentAccept[];
  // Optional human-readable reason, per the x402 envelope.
  error?: string;
}
