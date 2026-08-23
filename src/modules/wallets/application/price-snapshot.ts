import { Decimal } from "decimal.js";

import type { PriceQuote } from "./ports/price-provider.js";
import type { SnapshotStatus, TokenHolding } from "../domain/wallet-snapshot.js";

// USD amounts are persisted as Decimal(36,8); match that scale here so the
// in-memory value and the stored value agree.
const USD_SCALE = 8;

export interface PriceableWallet {
  nativeBalance: string;
  // Decimals of the native currency's smallest unit (EVM = 18, ALGO = 6), supplied
  // by the reading provider so the native balance is scaled correctly per chain.
  nativeDecimals: number;
  holdings: TokenHolding[];
}

export interface PricedSnapshot {
  status: SnapshotStatus;
  holdings: TokenHolding[];
  totalValueUsd?: string;
}

// Enriches holdings with a per-token USD value, computes the wallet's total USD
// value (native currency + tokens), and derives the snapshot's pricing status.
//
// Only prices actually returned by the provider are applied: a missing price
// leaves that holding's valueUsd undefined and excludes it from the total.
// If nothing at all can be priced, totalValueUsd is undefined rather than "0" —
// an unpriced wallet is not the same as an empty one. Nothing is fabricated.
//
// Status semantics (documented in the README): "complete" means every asset we
// discovered was assigned a USD value — the native balance plus every holding.
// Any missing price yields "partial". This describes USD-pricing coverage of the
// assets we found; it does NOT claim exhaustive portfolio coverage, since token
// discovery is limited to a curated token list.
export function applyUsdPricing(wallet: PriceableWallet, quote: PriceQuote): PricedSnapshot {
  let total: Decimal | undefined;
  const addToTotal = (value: Decimal): void => {
    total = total === undefined ? value : total.plus(value);
  };

  const nativePriced = quote.nativeUsd !== undefined;
  if (quote.nativeUsd !== undefined) {
    addToTotal(toWholeUnits(wallet.nativeBalance, wallet.nativeDecimals).mul(quote.nativeUsd));
  }

  let allHoldingsPriced = true;
  const holdings = wallet.holdings.map((holding) => {
    const price = quote.tokenUsd[holding.tokenAddress.toLowerCase()];
    if (price === undefined) {
      allHoldingsPriced = false;
      return holding;
    }
    const value = toWholeUnits(holding.rawAmount, holding.decimals).mul(price);
    addToTotal(value);
    return { ...holding, valueUsd: value.toFixed(USD_SCALE) };
  });

  const status: SnapshotStatus = nativePriced && allHoldingsPriced ? "complete" : "partial";

  return total === undefined
    ? { status, holdings }
    : { status, holdings, totalValueUsd: total.toFixed(USD_SCALE) };
}

function toWholeUnits(rawAmount: string, decimals: number): Decimal {
  return new Decimal(rawAmount).div(new Decimal(10).pow(decimals));
}
