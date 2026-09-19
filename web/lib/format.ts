// Display formatting for on-chain numbers.
//
// One rule governs this file: a value the API could not price is ABSENT, not zero.
// Every formatter therefore takes an optional value and renders an explicit
// "unpriced" state rather than falling back to $0.00 — a fabricated zero reads as a
// real valuation of nothing, which is exactly the lie the product forbids.

const UNPRICED_LABEL = "Unpriced";

export const UNPRICED = UNPRICED_LABEL;

/** Big numbers lose their meaning past a point; abbreviate only above the millions. */
export function formatUsd(value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const absolute = Math.abs(numeric);
  if (absolute >= 1_000_000) {
    return `$${(numeric / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  }

  // Sub-cent USD values exist on-chain but are meaningless at 2 decimals, so tiny
  // non-zero amounts get more precision instead of rounding to "$0.00".
  const fractionDigits = absolute > 0 && absolute < 0.01 ? 6 : 2;
  return `$${numeric.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

export function formatUsdOrUnpriced(value: string | number | undefined): string {
  return formatUsd(value) ?? UNPRICED_LABEL;
}

export function formatPercent(value: string | number | undefined, digits = 2): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return `${numeric.toFixed(digits)}%`;
}

/**
 * Renders a whole-unit token amount with a precision that suits its magnitude:
 * nine decimals of a whale's ETH balance is noise, but rounding 0.0004 SOL to "0"
 * would be a lie.
 */
export function formatAmount(value: string | number | undefined, maxDigits = 6): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const absolute = Math.abs(numeric);
  const minimumFractionDigits = absolute === 0 ? 0 : absolute >= 1000 ? 2 : absolute >= 1 ? 4 : 6;

  return numeric.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits: Math.max(minimumFractionDigits, maxDigits)
  });
}

/**
 * Turns a smallest-unit integer amount into whole units using the token's own
 * decimals. Done with string arithmetic on BigInt so a 30-decimal meme token or a
 * whale-sized balance is never silently truncated by float precision.
 */
export function toWholeUnits(rawAmount: string, decimals: number): string {
  let value: bigint;
  try {
    value = BigInt(rawAmount);
  } catch {
    return "0";
  }

  if (decimals <= 0) {
    return value.toString();
  }

  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = magnitude / divisor;
  const fraction = magnitude % divisor;

  if (fraction === 0n) {
    return `${negative ? "-" : ""}${whole.toString()}`;
  }

  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}.${fractionText}`;
}

/** Relative age of a timestamp, for "read 3 minutes ago" style provenance. */
export function formatRelativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 45) {
    return "just now";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Middle-truncates a long address/key for display; full value stays available via title/copy. */
export function shorten(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 3) {
    return value;
  }
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
