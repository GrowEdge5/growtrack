import { Decimal } from "decimal.js";

import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import type { Clock } from "../../../shared/application/clock.js";
import type { SnapshotStatus, WalletSnapshot } from "../domain/wallet-snapshot.js";
import type { RefreshWalletIntelligence } from "./refresh-wallet-intelligence.js";
import { detectAddress } from "../../chains/domain/address-detection.js";
import { GrowtrackError } from "../../../shared/domain/errors.js";

// Percentage figures are reported to 2 decimals; USD matches the persisted scale.
const PERCENT_SCALE = 2;

// One entry of a portfolio request. `chain` is optional: a bare address is routed
// by format detection, which is what lets a user paste an address with no idea
// which chain it belongs to.
export interface PortfolioTarget {
  chain?: string;
  address: string;
}

export interface PortfolioTargetError {
  chain?: string;
  address: string;
  code: string;
  message: string;
}

export interface PortfolioHoldingLine {
  symbol: string;
  name: string;
  tokenAddress: string;
  // Human-readable whole units (raw amount scaled by the token's decimals).
  amount: string;
  valueUsd?: string;
  // Share of the whole portfolio. Present only when the holding is priced and the
  // portfolio total is known.
  allocationPct?: string;
}

export interface PortfolioWalletReport {
  chain: string;
  address: string;
  status: SnapshotStatus;
  nativeSymbol: string;
  // Raw native amount (smallest unit), exactly as the provider reported it.
  nativeBalance: string;
  // The same balance in whole units, so a caller can show "0.0445 SOL" without
  // needing to know the chain's decimals.
  nativeAmount: string;
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

export interface PortfolioReport {
  generatedAt: Date;
  totals: {
    totalValueUsd?: string;
    // Coverage of the DISCOVERED positions. Stated explicitly so a partial
    // valuation is never read as a complete one.
    pricedHoldings: number;
    unpricedHoldings: number;
    walletCount: number;
    chainCount: number;
  };
  chains: PortfolioChainReport[];
  wallets: PortfolioWalletReport[];
  // The holdings that could not be valued, as a distinct list.
  unpriced: (PortfolioHoldingLine & { chain: string; address: string })[];
  errors: PortfolioTargetError[];
}

// Caps a single request. Each target is a synchronous upstream read plus a price
// call, so an unbounded list would blow the paid request's latency budget and trip
// the keyless providers' rate limits.
export const MAX_PORTFOLIO_TARGETS = 10;

// Bounded fan-out over keyless, rate-limited public endpoints. Targets are read in
// small batches rather than all at once.
const DEFAULT_CONCURRENCY = 4;

interface ResolvedTarget {
  chain: string;
  address: string;
}

// Aggregates several wallets, on possibly different chains, into one portfolio
// report. This is the capability the product is for and the one no other route can
// express: every other route reads exactly one chain and one address.
//
// Reads go through the same refresh path as the paid single-wallet route, so a
// report and a snapshot can never disagree about a wallet's value. Per-target
// failures are collected rather than thrown: one bad address in a list of five must
// not cost the caller the other four, which they have already paid for.
export class GetPortfolioReport {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly refreshWalletIntelligence: RefreshWalletIntelligence,
    private readonly clock: Clock
  ) {}

  public async execute(
    targets: readonly PortfolioTarget[],
    concurrency: number = DEFAULT_CONCURRENCY
  ): Promise<PortfolioReport> {
    const knownSlugs: string[] = this.providers.list().map((provider) => provider.chain.slug);

    const resolved: ({ target: ResolvedTarget } | { error: PortfolioTargetError })[] = targets.map(
      (target) => this.resolve(target, knownSlugs)
    );

    const results = await mapWithConcurrency(resolved, concurrency, async (entry) => {
      if (!("target" in entry)) {
        return { error: entry.error };
      }
      try {
        const snapshot = await this.refreshWalletIntelligence.execute(
          entry.target.chain,
          entry.target.address
        );
        return { snapshot };
      } catch (error) {
        return { error: toTargetError(entry.target.chain, entry.target.address, error) };
      }
    });

    const wallets: WalletSnapshot[] = [];
    const errors: PortfolioTargetError[] = [];
    for (const result of results) {
      if ("snapshot" in result) {
        wallets.push(result.snapshot);
      } else {
        errors.push(result.error);
      }
    }

    return this.assemble(wallets, errors);
  }

  // Resolves one requested target to a concrete chain, or to a client-shaped error
  // explaining why it cannot be read (unknown chain, unrecognizable address,
  // ambiguous address).
  private resolve(
    target: PortfolioTarget,
    knownSlugs: readonly string[]
  ): { target: ResolvedTarget } | { error: PortfolioTargetError } {
    const address = target.address.trim();
    if (address.length === 0) {
      return {
        error: { address: target.address, code: "INVALID_ADDRESS", message: "Address is empty" }
      };
    }

    const requestedChain = target.chain?.trim().toLowerCase();
    if (requestedChain !== undefined && requestedChain.length > 0) {
      // Reject an unknown chain here rather than letting the registry throw for the
      // whole request.
      if (!knownSlugs.includes(requestedChain)) {
        return {
          error: {
            chain: requestedChain,
            address,
            code: "UNSUPPORTED_CHAIN",
            message: `Chain '${requestedChain}' is not supported`
          }
        };
      }
      return { target: { chain: requestedChain, address } };
    }

    const detection = detectAddress(address, knownSlugs);
    if (detection.candidateChains.length === 0) {
      return {
        error: {
          address,
          code: "UNRECOGNIZED_ADDRESS",
          message:
            "Could not determine a supported chain from this address; pass it as 'chain:address'"
        }
      };
    }
    if (detection.candidateChains.length > 1) {
      return {
        error: {
          address,
          code: "AMBIGUOUS_ADDRESS",
          message: `This address matches more than one supported chain (${detection.candidateChains.join(", ")}); pass it as 'chain:address'`
        }
      };
    }

    return { target: { chain: detection.candidateChains[0] as string, address } };
  }

  private assemble(
    wallets: readonly WalletSnapshot[],
    errors: PortfolioTargetError[]
  ): PortfolioReport {
    // A wallet snapshot's totalValueUsd already includes its native balance plus
    // every priced holding, so the portfolio total is the sum of those totals —
    // no re-derivation, and the report can never disagree with a single snapshot.
    let total = new Decimal(0);
    let totalsKnown = false;
    let pricedHoldings = 0;
    let unpricedHoldings = 0;

    const walletReports: PortfolioWalletReport[] = wallets.map((snapshot) => {
      const lines: PortfolioHoldingLine[] = snapshot.holdings.map((holding) => {
        if (holding.valueUsd === undefined) {
          unpricedHoldings += 1;
        } else {
          pricedHoldings += 1;
        }
        return {
          symbol: holding.symbol,
          name: holding.name,
          tokenAddress: holding.tokenAddress,
          amount: toWholeUnits(holding.rawAmount, holding.decimals).toString(),
          ...(holding.valueUsd !== undefined ? { valueUsd: holding.valueUsd } : {})
        };
      });

      if (snapshot.totalValueUsd !== undefined) {
        total = total.plus(snapshot.totalValueUsd);
        totalsKnown = true;
      }

      return {
        chain: snapshot.wallet.chain.slug,
        address: snapshot.wallet.displayAddress,
        status: snapshot.status,
        nativeSymbol: snapshot.nativeSymbol,
        nativeBalance: snapshot.nativeBalance,
        nativeAmount: toWholeUnits(
          snapshot.nativeBalance,
          this.providers.get(snapshot.wallet.chain.slug).nativeDecimals
        ).toString(),
        ...(snapshot.totalValueUsd !== undefined ? { totalValueUsd: snapshot.totalValueUsd } : {}),
        holdings: lines
      };
    });

    const totalValueUsd = totalsKnown ? total.toFixed(8) : undefined;
    const share = (valueUsd: string | undefined): string | undefined =>
      totalValueUsd === undefined || valueUsd === undefined
        ? undefined
        : new Decimal(valueUsd).div(totalValueUsd).mul(100).toFixed(PERCENT_SCALE);

    const annotated = walletReports.map((wallet) => ({
      ...wallet,
      ...withShare(wallet.totalValueUsd, share),
      holdings: wallet.holdings.map((line) => ({ ...line, ...withShare(line.valueUsd, share) }))
    }));

    const chainReports = buildChainReports(annotated, share);

    return {
      generatedAt: this.clock.now(),
      totals: {
        ...(totalValueUsd !== undefined ? { totalValueUsd } : {}),
        pricedHoldings,
        unpricedHoldings,
        walletCount: wallets.length,
        chainCount: chainReports.length
      },
      chains: chainReports,
      wallets: annotated,
      unpriced: annotated.flatMap((wallet) =>
        wallet.holdings
          .filter((line) => line.valueUsd === undefined)
          .map((line) => ({ ...line, chain: wallet.chain, address: wallet.address }))
      ),
      errors
    };
  }
}

function withShare(
  valueUsd: string | undefined,
  share: (valueUsd: string | undefined) => string | undefined
): { allocationPct?: string } {
  const allocationPct = share(valueUsd);
  return allocationPct === undefined ? {} : { allocationPct };
}

function buildChainReports(
  wallets: readonly PortfolioWalletReport[],
  share: (valueUsd: string | undefined) => string | undefined
): PortfolioChainReport[] {
  interface ChainAccumulator {
    chain: string;
    walletCount: number;
    holdings: PortfolioHoldingLine[];
    totalValueUsd?: string;
  }

  const byChain = new Map<string, ChainAccumulator>();
  for (const wallet of wallets) {
    const entry: ChainAccumulator = byChain.get(wallet.chain) ?? {
      chain: wallet.chain,
      walletCount: 0,
      holdings: []
    };
    entry.walletCount += 1;
    entry.holdings.push(...wallet.holdings);

    if (wallet.totalValueUsd !== undefined) {
      entry.totalValueUsd = new Decimal(entry.totalValueUsd ?? "0")
        .plus(wallet.totalValueUsd)
        .toFixed(8);
    }
    byChain.set(wallet.chain, entry);
  }

  return [...byChain.values()]
    .map((entry) => ({
      chain: entry.chain,
      walletCount: entry.walletCount,
      holdings: entry.holdings,
      ...(entry.totalValueUsd !== undefined ? { totalValueUsd: entry.totalValueUsd } : {}),
      ...withShare(entry.totalValueUsd, share)
    }))
    .sort((left, right) =>
      (right.totalValueUsd ?? "0").localeCompare(left.totalValueUsd ?? "0", undefined, {
        numeric: true
      })
    );
}

function toWholeUnits(rawAmount: string, decimals: number): Decimal {
  return new Decimal(rawAmount).div(new Decimal(10).pow(decimals));
}

function toTargetError(chain: string, address: string, error: unknown): PortfolioTargetError {
  if (error instanceof GrowtrackError) {
    return { chain, address, code: error.code, message: error.message };
  }
  return {
    chain,
    address,
    code: "PROVIDER_ERROR",
    message: error instanceof Error ? error.message : "Upstream provider failed"
  };
}

// Runs `worker` over `items` with at most `limit` in flight, preserving input order.
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as T);
    }
  });

  await Promise.all(runners);
  return results;
}
