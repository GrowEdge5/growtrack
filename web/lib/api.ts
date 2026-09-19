// The single place the browser talks to the Growtrack API.
//
// Two deployment shapes are supported, and which one is in use is decided by
// configuration rather than by code:
//
//  * Same-origin (default). `NEXT_PUBLIC_API_URL` is unset, so every path is
//    relative and Next.js rewrites `/v1/*` and `/health/*` to the API. No CORS
//    preflight, no cookie/credential surprises, and the browser only ever sees one
//    origin. This is how the app runs locally and how a single-domain deploy works.
//  * Split-origin. `NEXT_PUBLIC_API_URL` points at the API host directly (e.g.
//    https://api.example.com). The API's CORS_ORIGIN must list this app's origin.
//
// Nothing here reads or writes user secrets: the API is read-only, and the only
// credential-bearing request is the x402-paid one, which carries a signed payment
// header rather than a session.

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** A field the API could not price is `undefined`, never zero — see the response types below. */
export interface ChainIdentity {
  id: number;
  slug: string;
  namespace: string;
  nativeSymbol: string;
}

export interface WalletIdentity {
  chain: ChainIdentity;
  canonicalAddress: string;
  displayAddress: string;
}

export interface TokenHolding {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Smallest-unit amount, exact (carried as a string so large balances never lose precision). */
  rawAmount: string;
  /** Present only when a trustworthy USD price was found. Absent means UNPRICED, not $0. */
  valueUsd?: string;
}

/**
 * Snapshot status describes USD-pricing coverage of the holdings that were found,
 * NOT exhaustive portfolio coverage: token discovery is limited to a curated list
 * per chain, so assets outside that list do not appear at all.
 */
export type SnapshotStatus = "complete" | "partial";

export interface WalletSnapshot {
  wallet: WalletIdentity;
  status: SnapshotStatus;
  nativeBalance: string;
  nativeSymbol: string;
  provider: string;
  blockNumber?: string;
  /**
   * The native balance's own USD value. Absent when the native currency could not be
   * priced — which is a different state from a priced native balance worth nothing,
   * and the reason this is reported separately instead of being inferred from the
   * total.
   */
  nativeValueUsd?: string;
  /** Sum of native + priced holdings. Absent when nothing could be priced. */
  totalValueUsd?: string;
  capturedAt: string;
  expiresAt: string;
  holdings: TokenHolding[];
  transactions: unknown[];
  positions: unknown[];
  signals: unknown[];
}

export type SnapshotSource = "cache" | "database" | "live";

export interface WalletSnapshotResponse {
  data: WalletSnapshot;
  meta: { source: SnapshotSource; stale: boolean };
}

export interface AnalyzeResponse {
  data: WalletSnapshot;
  meta: { chain: string; source: SnapshotSource; stale: boolean };
}

export interface ChainDescriptor {
  slug: string;
  namespace: string;
  nativeSymbol: string;
  nativeDecimals: number;
  addressFormat: string;
  exampleAddress: string;
}

export interface PortfolioHoldingLine {
  symbol: string;
  name: string;
  tokenAddress: string;
  /** Whole units, already scaled by the token's decimals. */
  amount: string;
  valueUsd?: string;
  allocationPct?: string;
}

export interface PortfolioWalletReport {
  chain: string;
  address: string;
  status: SnapshotStatus;
  nativeSymbol: string;
  nativeBalance: string;
  /** The native balance in whole units. */
  nativeAmount: string;
  /** The native balance's own USD value; absent when the native currency is unpriced. */
  nativeValueUsd?: string;
  totalValueUsd?: string;
  allocationPct?: string;
  holdings: PortfolioHoldingLine[];
}

export interface PortfolioChainReport {
  chain: string;
  totalValueUsd?: string;
  allocationPct?: string;
  walletCount: number;
  holdings: PortfolioHoldingLine[];
}

export interface PortfolioReportTotals {
  totalValueUsd?: string;
  pricedHoldings: number;
  unpricedHoldings: number;
  walletCount: number;
  chainCount: number;
}

export interface PortfolioTargetError {
  chain?: string;
  address: string;
  code: string;
  message: string;
}

export interface PortfolioReport {
  generatedAt: string;
  totals: PortfolioReportTotals;
  chains: PortfolioChainReport[];
  wallets: PortfolioWalletReport[];
  /** Present on the full report only: the holdings that could not be valued. */
  unpriced?: (PortfolioHoldingLine & { chain: string; address: string })[];
  errors: PortfolioTargetError[];
}

/** RFC 7807 problem document, the API's error shape. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
}

/** One priced option from an x402 402 response. */
export interface PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: {
    name?: string;
    tag?: string;
    decimals?: number;
    feePayer?: string;
    [key: string]: unknown;
  };
  resource?: { url: string; description?: string; mimeType?: string };
}

/** The x402 "Payment Required" document, carried in the body and a base64 header. */
export interface PaymentRequiredEnvelope {
  x402Version: number;
  error?: string;
  resource?: { url: string; description?: string; mimeType?: string };
  extensions?: Record<string, unknown>;
  accepts: PaymentRequirements[];
}

/**
 * Thrown when the API answers 402. The requirements travel with the error because
 * they are not a failure to report — they are the input the caller needs to build a
 * payment, so they must not be flattened into a message string.
 */
export class PaymentRequiredError extends Error {
  public constructor(public readonly envelope: PaymentRequiredEnvelope) {
    super(envelope.error ?? "Payment is required for this resource");
    this.name = "PaymentRequiredError";
  }
}

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /** The raw 402 document, when the API answered with payment requirements. */
    public readonly problem?: ProblemDetails
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the response carried no body we could parse — a network-level failure. */
  public get isNetworkError(): boolean {
    return this.status === 0;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { accept: "application/json", ...(init?.headers ?? {}) }
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the Growtrack API. Check your connection and try again."
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}

/**
 * Preserves the HTTP status on the error rather than flattening every failure into
 * one message: 402 (payment required) and 429 (rate limited) need different UI than
 * a 500, and the caller cannot tell them apart from a string.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | undefined;
  try {
    const body: unknown = await response.json();
    if (isProblemDetails(body)) {
      problem = body;
    }
  } catch {
    problem = undefined;
  }

  const message =
    problem?.detail ??
    (response.status === 429
      ? "Too many requests. Please wait a moment and try again."
      : `Request failed with status ${response.status}`);

  return new ApiError(response.status, problem?.code ?? "HTTP_ERROR", message, problem);
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    typeof (value as { detail: unknown }).detail === "string" &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

/** Chains this deployment can actually read, straight from the wired providers. */
export async function fetchChains(): Promise<ChainDescriptor[]> {
  const body = await request<{ data: { chains: ChainDescriptor[] } }>("/v1/chains");
  return body.data.chains;
}

/**
 * The free, anonymous read. Works with no account, no wallet connection and no
 * payment — the first wallet a visitor looks up must never be gated.
 */
export async function analyzeWallet(address: string, chain?: string): Promise<AnalyzeResponse> {
  const query = new URLSearchParams({ address });
  if (chain !== undefined && chain.length > 0) {
    query.set("chain", chain);
  }
  return request<AnalyzeResponse>(`/v1/wallets/analyze?${query.toString()}`);
}

export async function fetchWalletSnapshot(
  chain: string,
  address: string
): Promise<WalletSnapshotResponse> {
  return request<WalletSnapshotResponse>(
    `/v1/wallets/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`
  );
}

/** Paid: a fresh synchronous full snapshot, gated by x402. */
export async function fetchLiveSnapshot(
  chain: string,
  address: string,
  paymentSignature?: string
): Promise<{ data: WalletSnapshot; settlementHeader: string | null }> {
  return requestPaid(
    `/v1/wallets/${encodeURIComponent(chain)}/${encodeURIComponent(address)}/live`,
    paymentSignature
  );
}

/** Paid: combined totals and a per-chain split across several wallets. */
export async function fetchPortfolioTotals(
  addresses: readonly string[],
  paymentSignature?: string
): Promise<{ data: Omit<PortfolioReport, "unpriced">; settlementHeader: string | null }> {
  return requestPaid(
    `/v1/portfolio?addresses=${encodeURIComponent(addresses.join(","))}`,
    paymentSignature
  );
}

/** Paid: the full report, including per-holding allocation and the unpriced list. */
export async function fetchPortfolioReport(
  addresses: readonly string[],
  paymentSignature?: string
): Promise<{ data: PortfolioReport; settlementHeader: string | null }> {
  return requestPaid(
    `/v1/portfolio/report?addresses=${encodeURIComponent(addresses.join(","))}`,
    paymentSignature
  );
}

/** Free: Algorand suggested params for building a payment on the priced network. */
export async function fetchAlgorandPaymentParams(): Promise<{
  network: string;
  genesisId: string;
  genesisHash: string;
  minFee: number;
  suggestedFee: number;
  firstValid: number;
  lastValid: number;
}> {
  const body = await request<{
    data: {
      network: string;
      genesisId: string;
      genesisHash: string;
      minFee: number;
      suggestedFee: number;
      firstValid: number;
      lastValid: number;
    };
  }>("/v1/payments/algorand/params");
  return body.data;
}

/**
 * Like `request`, but speaks the x402 round trip: `paymentSignature` becomes the
 * PAYMENT-SIGNATURE header, a 402 surfaces as PaymentRequiredError carrying the
 * requirements, and the settlement result is read back off PAYMENT-RESPONSE so the
 * UI can show a real on-chain transaction id.
 */
async function requestPaid<T>(
  path: string,
  paymentSignature?: string
): Promise<T & { settlementHeader: string | null }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (paymentSignature !== undefined && paymentSignature.length > 0) {
    headers["PAYMENT-SIGNATURE"] = paymentSignature;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the Growtrack API. Check your connection and try again."
    );
  }

  if (response.status === 402) {
    throw new PaymentRequiredError(await readPaymentRequired(response));
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const body = (await response.json()) as T;
  return { ...body, settlementHeader: response.headers.get("payment-response") };
}

/**
 * The 402 payload is authoritative in two places at once — the JSON body and the
 * base64 PAYMENT-REQUIRED header — so either can be read when the other is stripped
 * by a proxy. Both are tried rather than assuming one survives.
 */
async function readPaymentRequired(response: Response): Promise<PaymentRequiredEnvelope> {
  let bodyValue: unknown;
  try {
    bodyValue = await response.clone().json();
  } catch {
    bodyValue = undefined;
  }
  if (isPaymentRequiredEnvelope(bodyValue)) {
    return bodyValue;
  }

  const header = response.headers.get("payment-required");
  if (header !== null && header.length > 0) {
    try {
      const decoded: unknown = JSON.parse(atob(header));
      if (isPaymentRequiredEnvelope(decoded)) {
        return decoded;
      }
    } catch {
      // Fall through to the malformed case below.
    }
  }

  throw new ApiError(
    402,
    "MALFORMED_402",
    "The API requested payment but its payment requirements could not be read."
  );
}

function isPaymentRequiredEnvelope(value: unknown): value is PaymentRequiredEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "accepts" in value &&
    Array.isArray((value as { accepts: unknown }).accepts) &&
    "x402Version" in value &&
    typeof (value as { x402Version: unknown }).x402Version === "number"
  );
}
