import type { PaymentAccept } from "../../domain/payment-requirements.js";

// An opaque, client-constructed x402 PaymentPayload. Growtrack is the RESOURCE
// server, not the payer: it never builds or inspects this object's internals. It
// decodes the payload from the PAYMENT-SIGNATURE header and forwards it verbatim
// to the facilitator. Typing it as a permissive object keeps the exact per-scheme
// shape (AVM paymentGroup/paymentIndex, EVM authorization, …) irrelevant to us and
// resilient to facilitator-side changes. x402Version is the one field we assert on
// to sanity-check that a decoded blob is plausibly an x402 payload.
export interface PaymentPayload {
  x402Version: number;
  [key: string]: unknown;
}

// Facilitator POST /verify response (x402 v2 spec, Facilitator API). invalidReason
// is present only when isValid is false; payer echoes the resolved payer address.
export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

// Facilitator POST /settle response. `transaction` is the on-chain txId (empty
// string on failure); `network` echoes the CAIP-2 id. errorReason is string | null
// because the coinbase v2 spec and the GoPlausible README disagree on nullability —
// we accept both rather than guess.
export interface SettleResult {
  success: boolean;
  errorReason?: string | null;
  payer?: string;
  transaction: string;
  network: string;
}

// Port over the GoPlausible x402 facilitator. verify() validates a signed payment
// without moving funds; settle() broadcasts it on-chain. Both take the decoded
// PaymentPayload plus the single PaymentAccept the 402 was issued against (the
// canonical x402 `paymentRequirements`). Implementations MUST throw on transport /
// non-2xx errors so the guard can fail closed (never serve an unpaid request).
export interface PaymentFacilitator {
  verify(payload: PaymentPayload, requirements: PaymentAccept): Promise<VerifyResult>;
  settle(payload: PaymentPayload, requirements: PaymentAccept): Promise<SettleResult>;
}
