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
  Wallet
} from "lucide-react";

import { useWalletModal } from "@/context/WalletModalContext";
import { useWalletSession } from "@/context/WalletSessionContext";
import {
  ApiError,
  fetchAlgorandPaymentParams,
  fetchPortfolioReport,
  type PaymentRequiredEnvelope,
  type PaymentRequirements,
  type PortfolioReport
} from "@/lib/api";
import {
  formatAtomicAmount,
  payAndRetry,
  requestQuote,
  X402Error,
  type PaymentStage
} from "@/lib/x402";
import { explorerUrl, transactionUrl } from "@/lib/address";
import { formatUsd, shorten } from "@/lib/format";

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
  onClose: () => void;
  onSuccess?: (report: PortfolioReport) => void;
}

export function PortfolioReportModal({ addresses, onClose, onSuccess }: Props) {
  const { session, isConnected } = useWalletSession();
  const { openWalletModal } = useWalletModal();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  const runRequest = useCallback(
    (signature?: string) => fetchPortfolioReport(addresses, signature),
    [addresses]
  );

  const loadQuote = useCallback(async () => {
    setPhase({ name: "quoting" });
    try {
      const outcome = await requestQuote(runRequest);

      if (outcome.kind === "free") {
        // x402 is switched off on this deployment, so the report was served without
        // payment. Reporting a "settled" receipt here would be a lie.
        setPhase({
          name: "done",
          report: outcome.data,
          receipt: null,
          accept: freeAcceptance()
        });
        onSuccess?.(outcome.data);
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
  }, [runRequest, onSuccess]);

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
      setPhase({
        name: "done",
        report: result.data,
        receipt: result.receipt?.transactionId ?? null,
        accept
      });
      onSuccess?.(result.data);
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
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 bg-[#0A2350]/[0.25] backdrop-blur-[6px] overflow-y-auto"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-3xl glass-frosted rounded-[24px] sm:rounded-[32px] p-4 sm:p-7 shadow-2xl border border-white my-2 sm:my-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-navy-100/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <Zap className="w-4 h-4 fill-primary-600" />
            </div>
            <div>
              <h3 className="font-black text-lg text-navy-900 tracking-tight">
                Full portfolio report
              </h3>
              <p className="text-[11px] text-navy-400 font-medium">
                {addresses.length} wallet{addresses.length === 1 ? "" : "s"} · multichain
                consolidation · settled in USDC on Algorand
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-navy-100/70 text-navy-500 hover:text-navy-900 flex items-center justify-center shadow-xs cursor-pointer"
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
          value={formatUsd(report.totals.totalValueUsd) ?? "Pending pricing"}
        />
        <Stat label="Wallets" value={String(report.totals.walletCount)} />
        <Stat label="Chains" value={String(report.totals.chainCount)} />
        <Stat
          label="Priced / unpriced"
          value={`${report.totals.pricedHoldings} / ${report.totals.unpricedHoldings}`}
        />
      </div>

      {/* Per chain */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-navy-400">By chain</h4>
        <div className="rounded-2xl border border-navy-100/60 overflow-hidden bg-white/70">
          {report.chains.map((chain) => (
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
                  {formatUsd(chain.totalValueUsd) ?? "Unpriced"}
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
          {report.wallets.map((wallet) => {
            const link = explorerUrl(wallet.chain, wallet.address);
            return (
              <div
                key={`${wallet.chain}:${wallet.address}`}
                className="rounded-2xl border border-navy-100/60 bg-white/70 p-3.5"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-navy-900 capitalize">
                      {wallet.chain} ·{" "}
                      {wallet.status === "complete" ? "Fully priced" : "Partially priced"}
                    </div>
                    <div className="font-mono text-[10px] text-navy-400 break-all">
                      {wallet.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-navy-900">
                      {formatUsd(wallet.totalValueUsd) ?? "Unpriced"}
                    </div>
                    <div className="text-[10px] font-mono text-navy-500">
                      {wallet.nativeAmount} {wallet.nativeSymbol}
                      {wallet.nativeValueUsd !== undefined
                        ? ` · ${formatUsd(wallet.nativeValueUsd)}`
                        : " · native unpriced"}
                    </div>
                  </div>
                </div>

                {wallet.holdings.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-navy-100/50 space-y-1">
                    {wallet.holdings.map((holding) => (
                      <div
                        key={`${holding.tokenAddress}-${holding.symbol}`}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="font-semibold text-navy-700">
                          {holding.amount} {holding.symbol}
                        </span>
                        <span className="font-mono text-navy-600">
                          {formatUsd(holding.valueUsd) ?? "Unpriced"}
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
