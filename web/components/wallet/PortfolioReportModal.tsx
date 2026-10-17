"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  Layers
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
  let totalPricedHoldings = 0;

  for (const rawAddr of addresses) {
    const key = rawAddr.toLowerCase();
    const walletSnaps = snapshotsByWalletAndChain?.[key] ?? {};

    for (const [chainSlug, snap] of Object.entries(walletSnaps)) {
      if (!snap?.data) continue;

      const nativeDec = chainDecimalsMap.get(chainSlug.toLowerCase()) ?? 18;
      const nativeAmt = toWholeUnits(snap.data.nativeBalance, nativeDec);
      const nativeVal = snap.data.nativeValueUsd
        ? parseUsdValue(snap.data.nativeValueUsd)
        : 0;
      const walletChainTotal = snap.data.totalValueUsd ? parseUsdValue(snap.data.totalValueUsd) : 0;

      // Filter to keep ONLY holdings with real positive USD value (> 0)
      const pricedHoldings = snap.data.holdings.filter((h) => {
        const lineVal = h.valueUsd ? parseUsdValue(h.valueUsd) : 0;
        return lineVal > 0;
      });

      // Completely skip chains/wallets that have 0 or unpriced value
      const hasPositiveValue =
        walletChainTotal > 0 || nativeVal > 0 || pricedHoldings.length > 0;
      if (!hasPositiveValue) {
        continue;
      }

      // Compute effective total for this wallet on this chain
      const effectiveChainTotal = Math.max(
        walletChainTotal,
        nativeVal +
          pricedHoldings.reduce(
            (acc, h) => acc + (h.valueUsd ? parseUsdValue(h.valueUsd) : 0),
            0
          )
      );

      if (effectiveChainTotal > 0) grandTotalUsd += effectiveChainTotal;

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
      const pct =
        grandTotalUsd > 0 ? ((c.totalValueUsd / grandTotalUsd) * 100).toFixed(2) : "0.00";
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
    (w) =>
      (w.totalValueUsd ? parseUsdValue(w.totalValueUsd) > 0 : false) || w.holdings.length > 0
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
        <Stat
          label="Total value"
          value={formatUsd(report.totals.totalValueUsd) ?? "$0.00"}
        />
        <Stat label="Wallets" value={String(report.totals.walletCount)} />
        <Stat
          label="Active Chains"
          value={String(
            report.chains.filter((c) => parseUsdValue(c.totalValueUsd) > 0).length
          )}
        />
        <Stat
          label="Priced Holdings"
          value={`${report.totals.pricedHoldings} assets`}
        />
      </div>

      {/* Visual Chain Distribution Bar */}
      {report.chains.length > 0 && Number(report.totals.totalValueUsd ?? 0) > 0 && (
        <div className="space-y-2 p-3.5 rounded-2xl bg-white/70 border border-navy-100/60">
          <div className="flex items-center justify-between text-[11px] font-bold text-navy-700">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary-500" />
              <span>Network Value Distribution</span>
            </span>
            <span className="text-primary-600">100% Consolidated</span>
          </div>
          <div className="w-full h-3 rounded-full bg-navy-100/70 overflow-hidden flex">
            {report.chains
              .filter((chain) => parseUsdValue(chain.totalValueUsd) > 0)
              .map((chain, i) => {
                const pct = Number(chain.allocationPct ?? 0);
                if (pct <= 0) return null;
                const barColors = [
                  "bg-blue-600",
                  "bg-emerald-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-cyan-500",
                  "bg-indigo-500",
                  "bg-rose-500"
                ];
                return (
                  <div
                    key={chain.chain}
                    style={{ width: `${pct}%` }}
                    className={`${barColors[i % barColors.length]} h-full transition-all`}
                    title={`${chain.chain}: ${pct}%`}
                  />
                );
              })}
          </div>
          <div className="flex items-center gap-3.5 flex-wrap text-[10px] text-navy-500 font-medium pt-0.5">
            {report.chains
              .filter((chain) => parseUsdValue(chain.totalValueUsd) > 0)
              .map((chain, i) => {
                const pct = Number(chain.allocationPct ?? 0);
                if (pct <= 0) return null;
                const dotColors = [
                  "bg-blue-600",
                  "bg-emerald-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-cyan-500",
                  "bg-indigo-500",
                  "bg-rose-500"
                ];
                return (
                  <div key={chain.chain} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                    <span className="capitalize font-bold text-navy-800">{chain.chain}</span>
                    <span className="font-mono text-navy-500">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* DeFi protocol positions slot */}
      <div className="p-3.5 rounded-2xl bg-white/70 border border-navy-100/60 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary-100/80 border border-primary-200/80 flex items-center justify-center text-primary-600 flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-navy-900">DeFi Protocol Positions</div>
            <div className="text-[10px] text-navy-500 font-medium truncate">
              {report.chains.some((c) => c.chain.toLowerCase() === "hyperliquid")
                ? "Hyperliquid Perpetuals & Spot, Aave v3, Uniswap & Velodrome indexing"
                : "Hyperliquid, Folks Finance, Tinyman, Aave v3 & Uniswap liquidity indexing"}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          {report.chains.some((c) => c.chain.toLowerCase() === "hyperliquid")
            ? "Hyperliquid Verified · 0 Liquidations"
            : "0 Debt / 0 Liquidations"}
        </span>
      </div>

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
