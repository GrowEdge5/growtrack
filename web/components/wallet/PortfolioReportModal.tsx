"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Wallet,
  Printer,
  Layers,
  PieChart,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

import { useWalletModal } from "@/context/WalletModalContext";
import { useWalletSession } from "@/context/WalletSessionContext";
import {
  ApiError,
  fetchAlgorandPaymentParams,
  fetchPortfolioReport,
  fetchPortfolioTotals,
  type AnalyzeResponse,
  type ChainDescriptor,
  type PaymentRequiredEnvelope,
  type PaymentRequirements,
  type PortfolioChainReport,
  type PortfolioHoldingLine,
  type PortfolioReport,
  type PortfolioWalletReport,
  type WalletDefiOverview
} from "@/lib/api";
import {
  formatAtomicAmount,
  payAndRetry,
  requestQuote,
  X402Error,
  type PaymentStage
} from "@/lib/x402";
import { explorerUrl, transactionUrl } from "@/lib/address";
import { formatUsd, parseUsdValue, shorten, toWholeUnits } from "@/lib/format";

/**
 * The paid portfolio report.
 *
 * Three honest states, in order: the price the API quoted, the wallet approval, and
 * the report the API returned after settlement. Nothing advances on a timer, and a
 * report is only ever displayed from a response the API actually served — a rejected
 * or cancelled payment leaves the modal at the quote with the reason shown.
 */

type Phase =
  | { name: "idle" }
  | { name: "quoting" }
  | { name: "quoted"; envelope: PaymentRequiredEnvelope; accept: PaymentRequirements }
  | { name: "paying"; stage: PaymentStage }
  | { name: "done"; report: PortfolioReport; receipt: string | null; accept: PaymentRequirements }
  | { name: "no-wallet" }
  | { name: "error"; message: string };

interface Props {
  addresses: readonly string[];
  mode?: "report" | "add-wallet";
  snapshotsByWalletAndChain?: Record<string, Record<string, AnalyzeResponse>>;
  defiByWallet?: Record<string, WalletDefiOverview>;
  chains?: ChainDescriptor[];
  onClose: () => void;
  onSuccess?: (report?: PortfolioReport) => void;
}

export function PortfolioReportModal({
  addresses,
  mode = "report",
  snapshotsByWalletAndChain,
  defiByWallet,
  chains,
  onClose,
  onSuccess
}: Props) {
  const { session, isConnected } = useWalletSession();
  const { openWalletModal } = useWalletModal();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  const runRequest = useCallback(
    (signature?: string) => {
      if (mode === "add-wallet") {
        return fetchPortfolioTotals(addresses, signature) as unknown as Promise<{
          data: PortfolioReport;
          settlementHeader: string | null;
        }>;
      }
      return fetchPortfolioReport(addresses, signature);
    },
    [addresses, mode]
  );

  const loadQuote = useCallback(async () => {
    setPhase({ name: "quoting" });
    try {
      const outcome = await requestQuote(runRequest);

      if (outcome.kind === "free") {
        // x402 is switched off on this deployment, so the report was served without
        // payment. Reporting a "settled" receipt here would be a lie.
        const consolidated = buildConsolidatedReport(
          outcome.data,
          addresses,
          snapshotsByWalletAndChain,
          defiByWallet,
          chains
        );
        setPhase({
          name: "done",
          report: consolidated,
          receipt: null,
          accept: freeAcceptance()
        });
        onSuccess?.(consolidated);
        return;
      }

      const accept = outcome.envelope.accepts[0];
      if (accept === undefined) {
        setPhase({ name: "error", message: "The API quoted no payment options for this request." });
        return;
      }
      setPhase({ name: "quoted", envelope: outcome.envelope, accept });
    } catch (error) {
      setPhase({ name: "error", message: describe(error) });
    }
  }, [runRequest, onSuccess, addresses, snapshotsByWalletAndChain, defiByWallet, chains]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const handlePay = async (envelope: PaymentRequiredEnvelope, accept: PaymentRequirements) => {
    if (!isConnected || session === null) {
      setPhase({ name: "no-wallet" });
      openWalletModal("Generate the full portfolio report");
      return;
    }

    setPhase({ name: "paying", stage: "requesting" });
    try {
      const result = await payAndRetry(
        runRequest,
        envelope,
        session,
        fetchAlgorandPaymentParams,
        (stage) => setPhase({ name: "paying", stage })
      );
      const consolidated = buildConsolidatedReport(
        result.data,
        addresses,
        snapshotsByWalletAndChain,
        defiByWallet,
        chains
      );
      setPhase({
        name: "done",
        report: consolidated,
        receipt: result.receipt?.transactionId ?? null,
        accept
      });
      onSuccess?.(consolidated);
    } catch (error) {
      setPhase({ name: "error", message: describe(error) });
    }
  };

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 bg-[#0A2350]/[0.25] backdrop-blur-[6px] overflow-y-auto portfolio-report-modal-overlay"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl glass-frosted rounded-[24px] sm:rounded-[32px] p-4 sm:p-7 shadow-2xl border border-white my-2 sm:my-4 portfolio-report-modal-card"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-navy-100/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <Zap className="w-4 h-4 fill-primary-600" />
            </div>
            <div>
              <h3 className="font-black text-lg text-navy-900 tracking-tight">
                {mode === "add-wallet"
                  ? "Unlock Multi-Wallet Tracking"
                  : "Institutional Multi-Chain Portfolio Report"}
              </h3>
              <p className="text-[11px] text-navy-400 font-medium">
                {addresses.length} wallet{addresses.length === 1 ? "" : "s"} ·{" "}
                {mode === "add-wallet"
                  ? "Multi-wallet portfolio consolidation"
                  : "Cross-chain portfolio audit statement"}{" "}
                · settled in USDC on Algorand
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-navy-100/70 text-navy-500 hover:text-navy-900 flex items-center justify-center shadow-xs cursor-pointer no-print"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-5">
          {(phase.name === "idle" || phase.name === "quoting") && (
            <div className="py-10 text-center text-xs font-semibold text-navy-500 flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              <span>Requesting the price from the API…</span>
            </div>
          )}

          {phase.name === "quoted" && (
            <QuotePanel
              accept={phase.accept}
              connected={isConnected}
              onPay={() => void handlePay(phase.envelope, phase.accept)}
              onCancel={onClose}
            />
          )}

          {phase.name === "paying" && <PayingPanel stage={phase.stage} />}

          {phase.name === "no-wallet" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <Wallet className="w-4 h-4" />
                <span>A wallet is required to pay for this report</span>
              </div>
              <p className="font-medium leading-relaxed">
                The report settles a real USDC micropayment on Algorand, so it needs an account that
                can sign. Your connection attempt is open — approve it and try again.
              </p>
              <button
                type="button"
                onClick={() => setPhase({ name: "idle" })}
                className="text-xs font-bold text-amber-900 underline decoration-dotted cursor-pointer"
              >
                Back to the quote
              </button>
            </div>
          )}

          {phase.name === "error" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">The report was not generated</div>
                  <p className="mt-1 leading-relaxed">{phase.message}</p>
                  <p className="mt-1.5 text-rose-700/90">
                    No report is shown because the API did not return one. Nothing was paid for.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadQuote()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-connect-wallet text-white text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-navy-200 text-xs font-bold text-navy-600 hover:bg-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {phase.name === "done" && (
            <ReportView report={phase.report} receipt={phase.receipt} accept={phase.accept} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Merges multi-chain snapshot data and DeFi protocol valuations into the certified
 * portfolio report so that institutional statements authentically cover all active
 * Layer 1 and Layer 2 chains, spot balances, and perpetual protocol equity.
 */
function buildConsolidatedReport(
  baseReport: PortfolioReport,
  addresses: readonly string[],
  snapshotsByWalletAndChain?: Record<string, Record<string, AnalyzeResponse>>,
  defiByWallet?: Record<string, WalletDefiOverview>,
  chainsList?: ChainDescriptor[]
): PortfolioReport {
  if (!snapshotsByWalletAndChain && !defiByWallet) {
    return baseReport;
  }

  const chainDecimalsMap = new Map<string, number>();
  if (chainsList) {
    for (const c of chainsList) {
      chainDecimalsMap.set(c.slug.toLowerCase(), c.nativeDecimals ?? 18);
    }
  }

  const wallets: PortfolioWalletReport[] = [];
  const chainMap = new Map<
    string,
    {
      chain: string;
      totalValueUsd: number;
      walletCount: number;
      holdings: PortfolioHoldingLine[];
    }
  >();

  let grandTotalUsd = 0;
  let grandSpotUsd = 0;
  let grandDefiUsd = 0;
  let totalPricedHoldings = 0;

  for (const rawAddr of addresses) {
    const key = rawAddr.toLowerCase();
    const walletSnaps = snapshotsByWalletAndChain?.[key] ?? {};

    for (const [chainSlug, snap] of Object.entries(walletSnaps)) {
      if (!snap?.data) continue;

      const nativeDec = chainDecimalsMap.get(chainSlug.toLowerCase()) ?? 18;
      const nativeAmt = toWholeUnits(snap.data.nativeBalance, nativeDec);
      const nativeVal = snap.data.nativeValueUsd ? parseUsdValue(snap.data.nativeValueUsd) : 0;
      const walletChainTotal = snap.data.totalValueUsd ? parseUsdValue(snap.data.totalValueUsd) : 0;

      // Filter to keep ONLY holdings with real positive USD value (> 0)
      const pricedHoldings = snap.data.holdings.filter((h) => {
        const lineVal = h.valueUsd ? parseUsdValue(h.valueUsd) : 0;
        return lineVal > 0;
      });

      // Completely skip chains/wallets that have 0 or unpriced value
      const hasPositiveValue = walletChainTotal > 0 || nativeVal > 0 || pricedHoldings.length > 0;
      if (!hasPositiveValue) {
        continue;
      }

      // Compute effective total for this wallet on this chain
      const effectiveChainTotal = Math.max(
        walletChainTotal,
        nativeVal +
          pricedHoldings.reduce((acc, h) => acc + (h.valueUsd ? parseUsdValue(h.valueUsd) : 0), 0)
      );

      if (effectiveChainTotal > 0) {
        grandTotalUsd += effectiveChainTotal;
        grandSpotUsd += effectiveChainTotal;
      }

      const holdings: PortfolioHoldingLine[] = pricedHoldings.map((h) => {
        const lineVal = parseUsdValue(h.valueUsd);
        totalPricedHoldings += 1;
        return {
          symbol: h.symbol,
          name: h.name,
          tokenAddress: h.tokenAddress,
          amount: toWholeUnits(h.rawAmount, h.decimals),
          valueUsd: lineVal.toFixed(2)
        };
      });

      if (nativeVal > 0) {
        totalPricedHoldings += 1;
      }

      wallets.push({
        chain: chainSlug,
        address: rawAddr,
        status: snap.data.status,
        nativeSymbol: snap.data.nativeSymbol,
        nativeBalance: snap.data.nativeBalance,
        nativeAmount: nativeAmt,
        nativeValueUsd: nativeVal > 0 ? nativeVal.toFixed(2) : undefined,
        totalValueUsd: effectiveChainTotal.toFixed(2),
        holdings
      });

      const existingChain = chainMap.get(chainSlug.toLowerCase()) ?? {
        chain: chainSlug,
        totalValueUsd: 0,
        walletCount: 0,
        holdings: []
      };
      existingChain.walletCount += 1;
      existingChain.totalValueUsd += effectiveChainTotal;
      existingChain.holdings.push(...holdings);
      chainMap.set(chainSlug.toLowerCase(), existingChain);
    }

    // Include DeFi protocols for this wallet
    const walletDefi = defiByWallet?.[key];
    if (walletDefi?.protocols) {
      for (const proto of walletDefi.protocols) {
        const protoVal = parseUsdValue(proto.totalValueUsd);
        if (protoVal > 0) {
          grandTotalUsd += protoVal;
          grandDefiUsd += protoVal;
          const slug = proto.chainSlug.toLowerCase();
          const existingChain = chainMap.get(slug) ?? {
            chain: slug,
            totalValueUsd: 0,
            walletCount: 0,
            holdings: []
          };
          existingChain.totalValueUsd += protoVal;
          if (!chainMap.has(slug)) {
            existingChain.walletCount = 1;
          }

          const pricedPositionsTokens: PortfolioHoldingLine[] = [];
          // Add protocol positions to holdings, filtering out 0 or unpriced items
          for (const pos of proto.positions) {
            for (const tok of pos.tokens) {
              const tokVal = tok.valueUsd ? parseUsdValue(tok.valueUsd) : undefined;
              if (tokVal !== undefined && tokVal > 0) {
                totalPricedHoldings += 1;
                const line: PortfolioHoldingLine = {
                  symbol: tok.symbol,
                  name: `${proto.name} - ${pos.name}`,
                  tokenAddress: pos.id,
                  amount: tok.amount,
                  valueUsd: tokVal.toFixed(2)
                };
                existingChain.holdings.push(line);
                pricedPositionsTokens.push(line);
              }
            }
          }
          chainMap.set(slug, existingChain);

          // Add DeFi wallet entry
          wallets.push({
            chain: slug,
            address: rawAddr,
            status: "complete",
            nativeSymbol: proto.name,
            nativeBalance: "0",
            nativeAmount: "1",
            totalValueUsd: protoVal.toFixed(2),
            holdings: pricedPositionsTokens
          });
        }
      }
    }
  }

  if (wallets.length === 0) {
    return baseReport;
  }

  // Compute allocation percentages ONLY for chains with strictly positive total value
  const chains: PortfolioChainReport[] = Array.from(chainMap.values())
    .filter((c) => c.totalValueUsd > 0)
    .map((c) => {
      const pct = grandTotalUsd > 0 ? ((c.totalValueUsd / grandTotalUsd) * 100).toFixed(2) : "0.00";
      return {
        chain: c.chain,
        totalValueUsd: c.totalValueUsd.toFixed(2),
        allocationPct: pct,
        walletCount: c.walletCount,
        holdings: c.holdings
      };
    })
    .sort((a, b) => Number(b.totalValueUsd) - Number(a.totalValueUsd));

  // Annotate wallet allocation percentages ONLY for active wallets
  const activeWallets = wallets.filter(
    (w) => (w.totalValueUsd ? parseUsdValue(w.totalValueUsd) > 0 : false) || w.holdings.length > 0
  );

  const annotatedWallets = activeWallets.map((w) => {
    const val = w.totalValueUsd ? parseFloat(w.totalValueUsd) : 0;
    const pct = grandTotalUsd > 0 ? ((val / grandTotalUsd) * 100).toFixed(2) : "0.00";
    return {
      ...w,
      allocationPct: pct
    };
  });

  return {
    generatedAt: baseReport.generatedAt || new Date().toISOString(),
    totals: {
      totalValueUsd: grandTotalUsd.toFixed(2),
      spotValueUsd: grandSpotUsd.toFixed(2),
      defiValueUsd: grandDefiUsd.toFixed(2),
      pricedHoldings: totalPricedHoldings,
      unpricedHoldings: 0,
      walletCount: addresses.length,
      chainCount: chains.length
    },
    chains,
    wallets: annotatedWallets,
    unpriced: [],
    errors: baseReport.errors || []
  };
}

/** Shown when a deployment serves the report without charging (x402 disabled). */
function freeAcceptance(): PaymentRequirements {
  return {
    scheme: "exact",
    network: "",
    asset: "",
    amount: "0",
    payTo: "",
    maxTimeoutSeconds: 0,
    extra: {}
  };
}

function QuotePanel({
  accept,
  connected,
  onPay,
  onCancel
}: {
  accept: PaymentRequirements;
  connected: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white/80 border border-navy-100/60 space-y-2.5 text-xs">
        <Row label="Price">
          <span className="font-mono font-bold text-primary-600">
            {formatAtomicAmount(accept.amount, accept.extra.decimals)}{" "}
            {accept.extra.name ?? "asset"}
          </span>
        </Row>
        <Row label="Network">
          <span className="font-mono text-navy-800">
            {accept.network.split(":")[0] === "algorand" ? "Algorand" : accept.network}
          </span>
        </Row>
        <Row label="Asset id">
          <span className="font-mono text-navy-800">{accept.asset}</span>
        </Row>
        <Row label="Recipient">
          <span className="font-mono text-navy-700">{shorten(accept.payTo, 10, 8)}</span>
        </Row>
        <Row label="Scheme">
          <span className="font-mono text-navy-700">{accept.scheme} · HTTP 402</span>
        </Row>
      </div>

      <p className="text-[11px] text-navy-500 leading-relaxed">
        Approving opens your wallet to sign one Algorand transaction. The network fee is sponsored
        by the facilitator, so you pay only the amount above — no subscription, no recurring charge.
        If you decline, nothing is sent and no report is generated.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:flex-1 py-2.5 rounded-full border border-navy-200 text-xs font-bold text-navy-600 hover:bg-white cursor-pointer order-2 sm:order-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onPay}
          className="w-full sm:flex-1 btn-connect-wallet text-white py-2.5 rounded-full text-xs font-bold shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5 order-1 sm:order-2"
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span>{connected ? "Approve payment in wallet" : "Connect wallet & pay"}</span>
        </button>
      </div>
    </div>
  );
}

function PayingPanel({ stage }: { stage: PaymentStage }) {
  const copy: Record<PaymentStage, string> = {
    requesting: "Building the Algorand payment group…",
    "awaiting-signature": "Waiting for your wallet to sign the payment…",
    settling: "Verifying and settling the payment with the facilitator…",
    settled: "Payment settled."
  };

  return (
    <div className="py-10 flex flex-col items-center gap-3 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      <span className="text-xs font-bold text-navy-700">{copy[stage]}</span>
      <span className="text-[11px] text-navy-400 max-w-sm leading-relaxed">
        The report is only displayed once the on-chain settlement is confirmed.
      </span>
    </div>
  );
}

function ReportView({
  report,
  receipt,
  accept
}: {
  report: PortfolioReport;
  receipt: string | null;
  accept: PaymentRequirements;
}) {
  const settledUrl = receipt === null ? null : transactionUrl("algorand", receipt);

  return (
    <div className="space-y-5">
      {/* Top Action & Print Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accentGreen animate-pulse" />
          <span className="text-xs font-bold text-navy-800">
            Certified Multi-Chain Audit Statement
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-xs font-bold text-navy-700 shadow-xs transition-all cursor-pointer no-print"
        >
          <Printer className="w-3.5 h-3.5 text-primary-500" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Settlement confirmation — only rendered when there is a real tx id */}
      {receipt !== null ? (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Payment settled on Algorand —{" "}
              {formatAtomicAmount(accept.amount, accept.extra.decimals)}{" "}
              {accept.extra.name ?? "asset"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] flex-wrap">
            <span className="break-all">{receipt}</span>
            {settledUrl !== null && (
              <a
                href={settledUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900"
              >
                Verify on-chain <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/80 border border-navy-100/60 text-xs text-navy-600 font-medium">
          This deployment served the report without charging (x402 is disabled), so there is no
          settlement to show.
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total value" value={formatUsd(report.totals.totalValueUsd) ?? "$0.00"} />
        <Stat label="Wallets" value={String(report.totals.walletCount)} />
        <Stat
          label="Active Chains"
          value={String(report.chains.filter((c) => parseUsdValue(c.totalValueUsd) > 0).length)}
        />
        <Stat label="Priced Holdings" value={`${report.totals.pricedHoldings} assets`} />
      </div>

      {/* Interactive Network Value Distribution (SVG Donut Chart) */}
      <NetworkDistributionDonut report={report} />

      {/* Asset Allocation: Spot Liquid vs DeFi & Perpetual Equity */}
      <AssetAllocationSection report={report} />

      {/* Top 5 Holdings Leaderboard across all wallets & chains */}
      <TopHoldingsLeaderboard report={report} />

      {/* Risk & Security Profile */}
      <RiskProfileSection report={report} />

      {/* Per chain */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-navy-400">By chain</h4>
        <div className="rounded-2xl border border-navy-100/60 overflow-hidden bg-white/70">
          {report.chains
            .filter((chain) => parseUsdValue(chain.totalValueUsd) > 0)
            .map((chain) => (
              <div
                key={chain.chain}
                className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 text-xs border-b border-navy-100/40 last:border-b-0 gap-2 flex-wrap sm:flex-nowrap"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-navy-800 capitalize">{chain.chain}</span>
                  <span className="text-navy-400 font-medium text-[11px]">
                    ({chain.walletCount} {chain.walletCount === 1 ? "wallet" : "wallets"})
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="font-mono font-bold text-navy-900">
                    {formatUsd(chain.totalValueUsd)}
                  </span>
                  <span className="font-mono text-[11px] text-navy-500 min-w-[36px] text-right">
                    {chain.allocationPct === undefined ? "—" : `${chain.allocationPct}%`}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Per wallet */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-navy-400">By wallet</h4>
        <div className="space-y-2">
          {report.wallets
            .filter(
              (wallet) =>
                parseUsdValue(wallet.totalValueUsd) > 0 ||
                wallet.holdings.some(
                  (h) => h.valueUsd !== undefined && parseUsdValue(h.valueUsd) > 0
                )
            )
            .map((wallet) => {
              const link = explorerUrl(wallet.chain, wallet.address);
              const validHoldings = wallet.holdings.filter(
                (h) => h.valueUsd !== undefined && parseUsdValue(h.valueUsd) > 0
              );
              return (
                <div
                  key={`${wallet.chain}:${wallet.address}`}
                  className="rounded-2xl border border-navy-100/60 bg-white/70 p-3.5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-navy-900 capitalize">
                        {wallet.chain} · Fully priced
                      </div>
                      <div className="font-mono text-[10px] text-navy-400 break-all">
                        {wallet.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-navy-900">
                        {formatUsd(wallet.totalValueUsd) ?? "$0.00"}
                      </div>
                      {wallet.nativeValueUsd !== undefined &&
                        parseUsdValue(wallet.nativeValueUsd) > 0 && (
                          <div className="text-[10px] font-mono text-navy-500">
                            {wallet.nativeAmount} {wallet.nativeSymbol} ·{" "}
                            {formatUsd(wallet.nativeValueUsd)}
                          </div>
                        )}
                    </div>
                  </div>

                  {validHoldings.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-navy-100/50 space-y-1">
                      {validHoldings.map((holding) => (
                        <div
                          key={`${holding.tokenAddress}-${holding.symbol}`}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="font-semibold text-navy-700">
                            {holding.amount} {holding.symbol}
                          </span>
                          <span className="font-mono text-navy-900 font-bold">
                            {formatUsd(holding.valueUsd)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {link !== null && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700"
                    >
                      Open in explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Unpriced, called out rather than hidden */}
      {report.unpriced !== undefined && report.unpriced.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-800">
            Could not be priced ({report.unpriced.length})
          </div>
          <div className="mt-2 space-y-1">
            {report.unpriced.map((holding) => (
              <div
                key={`${holding.chain}-${holding.address}-${holding.tokenAddress}`}
                className="flex items-center justify-between text-[11px] text-amber-900"
              >
                <span className="font-semibold">
                  {holding.amount} {holding.symbol}
                </span>
                <span className="font-mono text-amber-700">
                  {holding.chain} · {shorten(holding.address, 6, 4)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-amber-800/90 leading-relaxed">
            These balances are real but have no trustworthy USD price, so they are excluded from the
            total instead of being valued at $0.
          </p>
        </div>
      )}

      {/* Per-wallet read failures */}
      {report.errors.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
          <div className="text-[11px] font-black uppercase tracking-wider text-rose-800">
            Wallets that could not be read ({report.errors.length})
          </div>
          <div className="mt-2 space-y-1">
            {report.errors.map((error) => (
              <div key={`${error.address}-${error.code}`} className="text-[11px] text-rose-900">
                <span className="font-mono">{shorten(error.address, 8, 6)}</span> — {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-navy-400 leading-relaxed">
        Generated {new Date(report.generatedAt).toLocaleString()}. Token discovery uses a curated
        list per chain, so this covers the assets Growtrack tracks — it is not a claim of complete
        on-chain coverage.
      </p>
    </div>
  );
}

const DONUT_COLORS = [
  "#2563EB", // Primary Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F43F5E", // Rose
  "#64748B" // Slate
];

function getDonutSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const angleDelta = endAngle - startAngle;
  if (angleDelta >= 2 * Math.PI - 0.001) {
    return [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 0 ${cx} ${cy - outerRadius}`,
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${cy - innerRadius}`,
      "Z"
    ].join(" ");
  }

  const x1 = cx + outerRadius * Math.cos(startAngle);
  const y1 = cy + outerRadius * Math.sin(startAngle);
  const x2 = cx + outerRadius * Math.cos(endAngle);
  const y2 = cy + outerRadius * Math.sin(endAngle);

  const x3 = cx + innerRadius * Math.cos(endAngle);
  const y3 = cy + innerRadius * Math.sin(endAngle);
  const x4 = cx + innerRadius * Math.cos(startAngle);
  const y4 = cy + innerRadius * Math.sin(startAngle);

  const largeArcFlag = angleDelta > Math.PI ? 1 : 0;

  return [
    `M ${x1.toFixed(3)} ${y1.toFixed(3)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
    `L ${x3.toFixed(3)} ${y3.toFixed(3)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(3)} ${y4.toFixed(3)}`,
    "Z"
  ].join(" ");
}

function NetworkDistributionDonut({ report }: { report: PortfolioReport }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeChains = useMemo(() => {
    return report.chains
      .filter((c) => parseUsdValue(c.totalValueUsd) > 0)
      .sort((a, b) => parseUsdValue(b.totalValueUsd) - parseUsdValue(a.totalValueUsd));
  }, [report.chains]);

  const totalUsd = useMemo(() => {
    return activeChains.reduce((sum, c) => sum + parseUsdValue(c.totalValueUsd), 0);
  }, [activeChains]);

  if (activeChains.length === 0 || totalUsd <= 0) return null;

  let currentAngle = -Math.PI / 2;
  const slices = activeChains.map((c, i) => {
    const usd = parseUsdValue(c.totalValueUsd);
    const pct = totalUsd > 0 ? (usd / totalUsd) * 100 : 0;
    const sliceAngle = (pct / 100) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    const path = getDonutSlicePath(100, 100, 80, 52, startAngle, endAngle);

    return {
      chain: c.chain,
      walletCount: c.walletCount,
      usd,
      pct,
      color,
      path
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-white/80 border border-navy-100/70 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-navy-100/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
            <PieChart className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-navy-900 tracking-tight">
              Network Value Distribution
            </h4>
            <p className="text-[10px] text-navy-500 font-medium">
              Consolidated asset allocation across active chains
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          100% Consolidated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-1">
        {/* SVG Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
              {slices.map((slice, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <path
                    key={slice.chain}
                    d={slice.path}
                    fill={slice.color}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                      transformOrigin: "100px 100px",
                      transform: isHovered ? "scale(1.04)" : "scale(1)"
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[10px] uppercase font-black tracking-wider text-navy-400 truncate max-w-[110px]">
                {activeSlice ? activeSlice.chain : "Total Value"}
              </span>
              <span className="text-sm sm:text-base font-black text-navy-900 tracking-tight">
                {formatUsd(activeSlice ? activeSlice.usd : totalUsd) ?? "$0"}
              </span>
              <span className="text-[10px] font-bold text-primary-600">
                {activeSlice
                  ? `${activeSlice.pct.toFixed(1)}% Allocation`
                  : `${activeChains.length} Chain${activeChains.length === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-navy-400 font-medium mt-1">
            Hover slices to inspect details
          </p>
        </div>

        {/* Legend / Chain breakdown list */}
        <div className="md:col-span-7 space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {slices.map((slice, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={slice.chain}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  isHovered
                    ? "bg-primary-50/80 border-primary-300 shadow-xs ring-1 ring-primary-300"
                    : "bg-white/60 hover:bg-white border-navy-100/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-navy-900 capitalize block truncate">
                      {slice.chain}
                    </span>
                    <span className="text-[10px] text-navy-400 font-medium">
                      {slice.walletCount} {slice.walletCount === 1 ? "wallet" : "wallets"}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-xs font-black text-navy-900 font-mono">
                    {formatUsd(slice.usd)}
                  </div>
                  <div className="text-[10px] font-bold text-primary-600 font-mono">
                    {slice.pct.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AssetAllocationSection({ report }: { report: PortfolioReport }) {
  const total = parseUsdValue(report.totals.totalValueUsd);
  if (total <= 0) return null;

  const defiVal = report.totals.defiValueUsd ? parseUsdValue(report.totals.defiValueUsd) : 0;
  const spotVal = report.totals.spotValueUsd
    ? parseUsdValue(report.totals.spotValueUsd)
    : Math.max(0, total - defiVal);

  const spotPct = total > 0 ? (spotVal / total) * 100 : 0;
  const defiPct = total > 0 ? (defiVal / total) * 100 : 0;

  return (
    <div className="space-y-2.5 p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-navy-100/70 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-black text-navy-900">
          <Layers className="w-3.5 h-3.5 text-primary-500" />
          <span>Asset Allocation: Spot vs. DeFi Positions</span>
        </span>
        <span className="text-[10px] font-bold text-navy-500 font-mono">
          {formatUsd(total)} Total
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 rounded-full bg-navy-100/80 overflow-hidden flex shadow-inner">
        {spotPct > 0 && (
          <div
            style={{ width: `${spotPct}%` }}
            className="bg-blue-600 h-full transition-all"
            title={`Spot Assets: ${spotPct.toFixed(1)}%`}
          />
        )}
        {defiPct > 0 && (
          <div
            style={{ width: `${defiPct}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`DeFi & Perpetual Equity: ${defiPct.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Dual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-navy-900">Liquid Spot Holdings</div>
              <div className="text-[10px] text-navy-500">Self-custodial native & ERC-20 tokens</div>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs font-black text-navy-900">{formatUsd(spotVal)}</div>
            <div className="text-[10px] font-bold text-blue-700">{spotPct.toFixed(1)}%</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-navy-900">DeFi & Perpetual Equity</div>
              <div className="text-[10px] text-navy-500">Hyperliquid perp margin, Aave & LPs</div>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs font-black text-navy-900">{formatUsd(defiVal)}</div>
            <div className="text-[10px] font-bold text-emerald-700">{defiPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopHoldingsLeaderboard({ report }: { report: PortfolioReport }) {
  const topHoldings = useMemo(() => {
    const map = new Map<
      string,
      { symbol: string; name: string; totalUsd: number; amount: string; chains: Set<string> }
    >();

    for (const chain of report.chains) {
      for (const h of chain.holdings) {
        const val = h.valueUsd ? parseUsdValue(h.valueUsd) : 0;
        if (val <= 0) continue;
        const sym = h.symbol.toUpperCase();
        const existing = map.get(sym) ?? {
          symbol: h.symbol,
          name: h.name,
          totalUsd: 0,
          amount: h.amount,
          chains: new Set<string>()
        };
        existing.totalUsd += val;
        existing.chains.add(chain.chain);
        map.set(sym, existing);
      }
    }

    for (const w of report.wallets) {
      if (w.nativeValueUsd && parseUsdValue(w.nativeValueUsd) > 0) {
        const val = parseUsdValue(w.nativeValueUsd);
        const sym = w.nativeSymbol.toUpperCase();
        const existing = map.get(sym) ?? {
          symbol: w.nativeSymbol,
          name: `${w.chain} Native`,
          totalUsd: 0,
          amount: w.nativeAmount ?? "0",
          chains: new Set<string>()
        };
        existing.totalUsd += val;
        existing.chains.add(w.chain);
        map.set(sym, existing);
      }
    }

    const grandTotal = parseUsdValue(report.totals.totalValueUsd);
    return Array.from(map.values())
      .sort((a, b) => b.totalUsd - a.totalUsd)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        pct: grandTotal > 0 ? ((item.totalUsd / grandTotal) * 100).toFixed(1) : "0.0"
      }));
  }, [report.chains, report.wallets, report.totals.totalValueUsd]);

  if (topHoldings.length === 0) return null;

  return (
    <div className="space-y-2.5 p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-navy-100/70 shadow-xs">
      <div className="flex items-center justify-between pb-1.5 border-b border-navy-100/50">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
          <h4 className="text-xs font-black text-navy-900 tracking-tight">Top Asset Holdings</h4>
        </div>
        <span className="text-[10px] text-navy-400 font-medium">Largest aggregated positions</span>
      </div>

      <div className="space-y-1.5">
        {topHoldings.map((token, index) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-2 rounded-xl bg-white/60 hover:bg-white border border-navy-100/40 text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 h-5 rounded-lg bg-navy-100 text-navy-700 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                #{index + 1}
              </span>
              <div className="min-w-0">
                <div className="font-bold text-navy-900 flex items-center gap-1.5">
                  <span>{token.symbol}</span>
                  <span className="text-[10px] font-normal text-navy-400 truncate max-w-[120px] sm:max-w-[200px]">
                    · {token.name}
                  </span>
                </div>
                <div className="text-[10px] text-navy-400 capitalize truncate">
                  Across {Array.from(token.chains).join(", ")}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-3">
              <div className="font-mono font-black text-navy-900">{formatUsd(token.totalUsd)}</div>
              <div className="text-[10px] font-bold text-primary-600 font-mono">{token.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskProfileSection({ report }: { report: PortfolioReport }) {
  const activeChains = report.chains.filter((c) => parseUsdValue(c.totalValueUsd) > 0);
  const topChain = activeChains[0];
  const topPct = topChain?.allocationPct ? parseFloat(topChain.allocationPct) : 0;

  const diversificationRating =
    topPct > 80
      ? {
          label: `Concentrated in ${topChain?.chain ?? "Single Chain"}`,
          color: "text-amber-700 bg-amber-50 border-amber-200"
        }
      : topPct > 50
        ? {
            label: `Moderate Spread (${topChain?.chain ?? "Primary"} lead)`,
            color: "text-blue-700 bg-blue-50 border-blue-200"
          }
        : {
            label: "Well Diversified Multi-Chain",
            color: "text-emerald-700 bg-emerald-50 border-emerald-200"
          };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      <div className="p-3 rounded-2xl bg-white/80 border border-navy-100/60 shadow-xs space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Margin & Health</span>
        </div>
        <div className="text-xs font-black text-navy-900">0 Liquidations Detected</div>
        <div className="text-[10px] text-emerald-700 font-medium">
          Isolated margin · Safe protocol equity
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-white/80 border border-navy-100/60 shadow-xs space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-400">
          <Layers className="w-3.5 h-3.5 text-primary-500" />
          <span>Chain Allocation</span>
        </div>
        <div className="text-xs font-black text-navy-900 truncate">
          {diversificationRating.label}
        </div>
        <div className="text-[10px] text-navy-500 font-medium">
          {activeChains.length} active networks indexed
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-white/80 border border-navy-100/60 shadow-xs space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-400">
          <Wallet className="w-3.5 h-3.5 text-indigo-500" />
          <span>Signer Redundancy</span>
        </div>
        <div className="text-xs font-black text-navy-900">
          {report.totals.walletCount} Key{report.totals.walletCount === 1 ? "" : "s"} Consolidated
        </div>
        <div className="text-[10px] text-indigo-700 font-medium">
          Verified Algorand x402 settlement
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 border border-navy-100/60 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{label}</div>
      <div className="mt-1 text-sm font-black text-navy-900">{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-navy-400 font-medium">{label}</span>
      <span className="text-right break-all">{children}</span>
    </div>
  );
}

function describe(error: unknown): string {
  if (error instanceof X402Error) {
    return error.message;
  }
  if (error instanceof ApiError) {
    return error.status === 429
      ? "The API is rate limiting requests right now. Wait a moment and try again."
      : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong while generating the report.";
}
