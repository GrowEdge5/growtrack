// Client side of the x402 handshake.
//
// The flow is the protocol's, not an animation of it: ask for the paid resource,
// receive HTTP 402 with payment requirements, show the user what it costs, build and
// sign the Algorand atomic group those requirements describe, retry with the signed
// payload, and read the settlement transaction id back off the response. Nothing
// here reports success the facilitator did not confirm.
//
// It is deliberately two-phase (`requestQuote` then `payAndRetry`) rather than one
// call, because the user must be able to see the amount and the recipient BEFORE
// being asked to sign. A single call would go from click to wallet prompt with no
// informed step in between.
//
// Group shape (per the x402 AVM "exact" scheme):
//   [0] a 0-ALGO payment from the facilitator's fee payer to itself, carrying a fee
//       large enough to cover the whole group. Left UNSIGNED — the facilitator signs
//       it during settle, which is what "gasless" means here.
//   [1] the actual transfer of `amount` of the priced asset from the user to `payTo`.
//       Signed by the user's wallet, and identified by `paymentIndex: 1`.
// With no sponsored fee payer advertised, the group collapses to the single payment
// transaction, which then carries its own fee and `paymentIndex: 0`.

import algosdk from "algosdk";

import {
  PaymentRequiredError,
  type PaymentRequiredEnvelope,
  type PaymentRequirements
} from "./api";
import { signTransactions, type NetworkContext, type WalletSession } from "./wallets";

export interface AlgorandPaymentParams {
  network: string;
  genesisId: string;
  genesisHash: string;
  minFee: number;
  suggestedFee: number;
  firstValid: number;
  lastValid: number;
}

/** What the UI shows while the payment is in flight. */
export type PaymentStage = "requesting" | "awaiting-signature" | "settling" | "settled";

export interface SettlementReceipt {
  transactionId: string;
  payer: string | null;
  network: string;
}

export interface X402Result<T> {
  data: T;
  receipt: SettlementReceipt | null;
  /** The accept that was paid, for display. */
  accept: PaymentRequirements | null;
}

export class X402Error extends Error {
  public constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "X402Error";
  }
}

/**
 * The outcome of asking for a priced resource without payment: either it was served
 * (x402 disabled on this deployment) or the API named its price.
 */
export type QuoteOutcome<T> =
  | { kind: "free"; data: T; settlementHeader: string | null }
  | { kind: "payment-required"; envelope: PaymentRequiredEnvelope };

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Asks for the resource. A 402 comes back as a quote rather than an error. */
export async function requestQuote<T>(
  run: (paymentSignature?: string) => Promise<{ data: T; settlementHeader: string | null }>
): Promise<QuoteOutcome<T>> {
  try {
    const response = await run();
    return { kind: "free", data: response.data, settlementHeader: response.settlementHeader };
  } catch (error) {
    if (error instanceof PaymentRequiredError) {
      return { kind: "payment-required", envelope: error.envelope };
    }
    throw error;
  }
}

/**
 * Selects the requirement this client can actually satisfy: the Algorand `exact`
 * scheme. A 402 offering only networks we cannot sign for is a hard stop with a
 * clear message rather than a payment attempt that can never settle.
 */
export function selectAlgorandAccept(envelope: PaymentRequiredEnvelope): PaymentRequirements {
  const accept = envelope.accepts.find(
    (candidate) => candidate.scheme === "exact" && candidate.network.startsWith("algorand:")
  );

  if (accept === undefined) {
    const offered = envelope.accepts.map((candidate) => candidate.network).join(", ") || "none";
    throw new X402Error(
      `This resource is priced on ${offered}, which this wallet cannot pay.`,
      "NO_SUPPORTED_ACCEPT"
    );
  }
  return accept;
}

/**
 * Pays a quoted requirement and re-requests the resource with the signed payload.
 *
 * Only called after the user has seen the quote and chosen to proceed, so the wallet
 * prompt is never the first thing they see.
 */
export async function payAndRetry<T>(
  run: (paymentSignature?: string) => Promise<{ data: T; settlementHeader: string | null }>,
  envelope: PaymentRequiredEnvelope,
  wallet: WalletSession,
  loadParams: () => Promise<AlgorandPaymentParams>,
  onStage: (stage: PaymentStage) => void
): Promise<X402Result<T>> {
  const accept = selectAlgorandAccept(envelope);

  onStage("requesting");
  const params = await loadParams();

  // The one safety check that matters: never sign a transaction for a different
  // chain than the server priced. A mismatch means this deployment's Algorand RPC and
  // its x402 network disagree — an operator problem the user must not pay for.
  if (params.network !== accept.network) {
    throw new X402Error(
      "The API's Algorand network does not match the network it priced this request on. " +
        "Payment was not attempted.",
      "NETWORK_MISMATCH"
    );
  }
  if (params.genesisHash.length === 0) {
    throw new X402Error(
      "Could not read the Algorand genesis hash needed to build the payment. Try again shortly.",
      "MISSING_GENESIS"
    );
  }

  const built = buildPaymentGroup(params, accept, wallet.address);
  onStage("awaiting-signature");

  // Sign only the transaction this wallet owns. The sponsored fee-payer transaction
  // is deliberately left unsigned for the facilitator.
  const signed = await signTransactions(
    wallet.id,
    [built.paymentBase64],
    wallet.address,
    networkContext(params)
  );
  const signedPayment = signed[0];
  if (signedPayment === undefined || signedPayment === null) {
    throw new X402Error("The wallet did not sign the payment.", "SIGNATURE_DECLINED");
  }

  const paymentGroup = built.includeFeePayer
    ? [built.feePayerBase64 as string, signedPayment]
    : [signedPayment];

  const signature = encodePaymentSignature({
    x402Version: envelope.x402Version,
    scheme: "exact",
    network: accept.network,
    resource: envelope.resource,
    extensions: envelope.extensions,
    payload: { paymentGroup, paymentIndex: built.paymentIndex }
  });

  onStage("settling");
  const paid = await run(signature);
  onStage("settled");

  return { data: paid.data, receipt: parseSettlement(paid.settlementHeader), accept };
}

export function networkContext(params: AlgorandPaymentParams): NetworkContext {
  return { genesisId: params.genesisId };
}

interface BuiltGroup {
  /** The user's payment transaction, unsigned and base64-encoded. */
  paymentBase64: string;
  /** The unsigned sponsored fee-payer transaction; null when there is no sponsor. */
  feePayerBase64: string | null;
  includeFeePayer: boolean;
  paymentIndex: number;
}

/**
 * Constructs the atomic group. Exported for tests: a wrong fee or a wrong index here
 * produces a payment the facilitator rejects, so it is kept a pure function of its
 * inputs.
 */
export function buildPaymentGroup(
  params: AlgorandPaymentParams,
  accept: PaymentRequirements,
  payerAddress: string
): BuiltGroup {
  const suggested = {
    flatFee: true,
    fee: params.suggestedFee,
    minFee: params.minFee,
    firstValid: params.firstValid,
    lastValid: params.lastValid,
    genesisID: params.genesisId,
    genesisHash: base64ToBytes(params.genesisHash)
  };

  const feePayer = accept.extra.feePayer;
  const sponsored = typeof feePayer === "string" && feePayer.length > 0;

  // The user's payment: an ASA transfer of the priced asset. With a sponsor its own
  // fee is 0 — the sponsor's transaction carries a pool covering the whole group.
  const payment = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: payerAddress,
    receiver: accept.payTo,
    assetIndex: BigInt(accept.asset),
    amount: BigInt(accept.amount),
    suggestedParams: { ...suggested, fee: sponsored ? 0 : params.suggestedFee }
  });

  if (!sponsored || feePayer === undefined) {
    return {
      paymentBase64: bytesToBase64(algosdk.encodeUnsignedTransaction(payment)),
      feePayerBase64: null,
      includeFeePayer: false,
      paymentIndex: 0
    };
  }

  const sponsor = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: feePayer,
    receiver: feePayer,
    amount: 0,
    suggestedParams: { ...suggested, fee: params.minFee * 2 }
  });

  algosdk.assignGroupID([sponsor, payment]);

  return {
    paymentBase64: bytesToBase64(algosdk.encodeUnsignedTransaction(payment)),
    feePayerBase64: bytesToBase64(algosdk.encodeUnsignedTransaction(sponsor)),
    includeFeePayer: true,
    paymentIndex: 1
  };
}

interface PaymentSignaturePayload {
  x402Version: number;
  scheme: string;
  network: string;
  resource: PaymentRequiredEnvelope["resource"];
  extensions: PaymentRequiredEnvelope["extensions"];
  payload: { paymentGroup: string[]; paymentIndex: number };
}

/**
 * The PAYMENT-SIGNATURE header is base64-of-JSON. `resource` and `extensions` are
 * echoed from the 402 so a spec-compliant facilitator sees the same descriptor on
 * verify/settle that it published — the API re-attaches its own copy anyway, so an
 * omitted field cannot silently strip cataloging data.
 */
function encodePaymentSignature(payload: PaymentSignaturePayload): string {
  const body: Record<string, unknown> = {
    x402Version: payload.x402Version,
    scheme: payload.scheme,
    network: payload.network,
    payload: payload.payload
  };
  if (payload.resource !== undefined) {
    body.resource = payload.resource;
  }
  if (payload.extensions !== undefined) {
    body.extensions = payload.extensions;
  }
  return btoa(JSON.stringify(body));
}

/** Reads the settlement result off the PAYMENT-RESPONSE header (base64 JSON). */
export function parseSettlement(header: string | null): SettlementReceipt | null {
  if (header === null || header.length === 0) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(atob(header));
  } catch {
    return null;
  }

  if (typeof decoded !== "object" || decoded === null) {
    return null;
  }
  const record = decoded as { transaction?: unknown; payer?: unknown; network?: unknown };
  if (typeof record.transaction !== "string" || record.transaction.length === 0) {
    return null;
  }

  return {
    transactionId: record.transaction,
    payer: typeof record.payer === "string" ? record.payer : null,
    network: typeof record.network === "string" ? record.network : ""
  };
}

/** Renders an atomic-unit amount in whole asset units, for a confirmation prompt. */
export function formatAtomicAmount(amount: string, decimals: number | undefined): string {
  const places = decimals ?? 6;
  try {
    const value = BigInt(amount);
    const divisor = 10n ** BigInt(places);
    const whole = value / divisor;
    const fraction = (value % divisor).toString().padStart(places, "0").replace(/0+$/, "");
    return fraction.length === 0 ? whole.toString() : `${whole.toString()}.${fraction}`;
  } catch {
    return amount;
  }
}
