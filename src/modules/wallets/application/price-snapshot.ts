import { Decimal } from "decimal.js";

import type { PriceQuote } from "./ports/price-provider.js";
import type { TokenHolding } from "../domain/wallet-snapshot.js";

// EVM-family native currencies (ETH and L2 gas tokens) use 18 decimals.
// Growtrack only reads EVM chains today; revisit when a non-EVM native such as
// Algorand's 6-decimal ALGO is added.
const EVM_NATIVE_DECIMALS = 18;

// USD amounts are persisted as Decimal(36,8); match that scale here so the
// in-memory value and the stored value agree.
const USD_SCALE = 8;

export interface PriceableWallet {
  nativeBalance: string;
  holdings: TokenHolding[];
}

export interface PricedSnapshot {
  holdings: TokenHolding[];
  totalValueUsd?: string;
}

// Enriches holdings with a per-token USD value and computes the wallet's total
// USD value (native currency + tokens).
//
// Only prices actually returned by the provider are applied: a missing price
// leaves that holding's valueUsd undefined and excludes it from the total.
// If nothing at all can be priced, totalValueUsd is undefined rather than "0" —
// an unpriced wallet is not the same as an empty one. Nothing is fabricated.
export function applyUsdPricing(wallet: PriceableWallet, quote: PriceQuote): PricedSnapshot {
  let total: Decimal | undefined;
  const addToTotal = (value: Decimal): void => {
    total = total === undefined ? value : total.plus(value);
  };

  if (quote.nativeUsd !== undefined) {
    addToTotal(toWholeUnits(wallet.nativeBalance, EVM_NATIVE_DECIMALS).mul(quote.nativeUsd));
  }

  const holdings = wallet.holdings.map((holding) => {
    const price = quote.tokenUsd[holding.tokenAddress.toLowerCase()];
    if (price === undefined) {
      return holding;
    }
    const value = toWholeUnits(holding.rawAmount, holding.decimals).mul(price);
    addToTotal(value);
    return { ...holding, valueUsd: value.toFixed(USD_SCALE) };
  });

  return total === undefined ? { holdings } : { holdings, totalValueUsd: total.toFixed(USD_SCALE) };
}

function toWholeUnits(rawAmount: string, decimals: number): Decimal {
  return new Decimal(rawAmount).div(new Decimal(10).pow(decimals));
}
