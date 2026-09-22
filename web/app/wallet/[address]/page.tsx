"use client";

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  Plus,
  Wallet,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Layers,
  Lock,
  Loader2,
  Hourglass,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  FileCode
} from "lucide-react";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GlassSquareIcon } from "@/components/wallet/GlassSquareIcon";
import { PortfolioReportModal } from "@/components/wallet/PortfolioReportModal";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletGate } from "@/lib/useWalletGate";
import {
  ApiError,
  analyzeWallet,
  fetchChains,
  type AnalyzeResponse,
  type ChainDescriptor,
  type WalletTransaction
} from "@/lib/api";
import {
  detectAddressFormat,
  explorerName,
  explorerUrl,
  transactionUrl,
  chainLabel,
  coinKeyForSymbol
} from "@/lib/address";
import { formatAmount, formatRelativeTime, formatUsd, shorten, toWholeUnits } from "@/lib/format";

const KNOWN_NAMES: Readonly<Record<string, string>> = {
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": "vitalik.eth",
  "1a1zp1ep5qgefidmptftl5slmv7divfna": "Satoshi",
  jjnp4jgsr5icf5ntmvc4to7ce4km2fdl7g4laeefik2kvgl6rtplpgmtb4: "Algorand Foundation"
};

interface PageProps {
  params: Promise<{ address: string }>;
}

/** One row of the holdings table: the native coin or a tracked token. */
interface AssetRow {
  key: string;
  symbol: string;
  name: string;
  /** Whole units, already scaled from the smallest unit. */
  amount: string;
  /** Absent means unpriced — rendered as such, never as $0. */
  valueUsd?: string;
  /** Derived unit price, only when both the amount and the value are known. */
  unitPriceUsd?: string;
  allocationPct?: number;
  isNative: boolean;
}

export default function WalletDashboardPage({ params }: PageProps) {
  const { address } = use(params);
  const rawAddress = decodeURIComponent(address);

  const { session, isConnected } = useWalletSession();
  const { requireWallet } = useWalletGate();

  // The wallet whose data is on screen. Free and anonymous: no connection is needed
  // to reach this state, which is the whole point of the page.
  const [selected, setSelected] = useState(rawAddress);
  // Every wallet the visitor has added. The first is the one they searched for;
  // adding more is a connect-gated action.
  const [tracked, setTracked] = useState<string[]>([rawAddress]);
  const [newWalletInput, setNewWalletInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; hint?: string } | null>(null);

  const [chains, setChains] = useState<ChainDescriptor[]>([]);
  const [activeTab, setActiveTab] = useState<"portfolio" | "nfts" | "transactions" | "defi">(
    "portfolio"
  );
  const [searchToken, setSearchToken] = useState("");
  const [hideUnpriced, setHideUnpriced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // A new address in the URL is a new primary wallet; reset the tracked set so the
  // page never mixes two different searches.
  const lastRouteAddress = useRef(rawAddress);
  useEffect(() => {
    if (lastRouteAddress.current !== rawAddress) {
      lastRouteAddress.current = rawAddress;
      setTracked([rawAddress]);
      setSelected(rawAddress);
    }
  }, [rawAddress]);

  useEffect(() => {
    void fetchChains()
      .then(setChains)
      .catch(() => setChains([]));
  }, []);

  const load = useCallback(async (walletAddress: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setSnapshot(await analyzeWallet(walletAddress));
    } catch (error) {
      setSnapshot(null);
      setLoadError(describeLoadError(error, walletAddress));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selected);
  }, [selected, load]);

  const data = snapshot?.data;
  const detectedChain = snapshot?.meta.chain ?? null;
  const nativeDecimals = useMemo(() => {
    const match = chains.find((chain) => chain.slug === detectedChain);
    return match?.nativeDecimals ?? null;
  }, [chains, detectedChain]);

  // Native value is a field the API reports directly, so an unpriced native balance
  // is never inferred as zero from the portfolio total.
  const rows = useMemo<AssetRow[]>(() => {
    if (data === undefined) {
      return [];
    }

    const assets: AssetRow[] = [];
    const totalValue = data.totalValueUsd === undefined ? null : Number(data.totalValueUsd);
    const share = (value: string | undefined): number | undefined => {
      if (totalValue === null || totalValue === 0 || value === undefined) {
        return undefined;
      }
      const numeric = Number(value);
      return Number.isFinite(numeric) ? (numeric / totalValue) * 100 : undefined;
    };

    if (nativeDecimals !== null) {
      const nativeAmount = toWholeUnits(data.nativeBalance, nativeDecimals);
      assets.push({
        key: `native-${data.nativeSymbol}`,
        symbol: data.nativeSymbol,
        name: `${chainLabel(data.wallet.chain.slug)} native`,
        amount: nativeAmount,
        ...(data.nativeValueUsd !== undefined ? { valueUsd: data.nativeValueUsd } : {}),
        ...(data.nativeValueUsd !== undefined && Number(nativeAmount) > 0
          ? { unitPriceUsd: String(Number(data.nativeValueUsd) / Number(nativeAmount)) }
          : {}),
        ...(share(data.nativeValueUsd) !== undefined
          ? { allocationPct: share(data.nativeValueUsd) as number }
          : {}),
        isNative: true
      });
    }

    for (const holding of data.holdings) {
      const amount = toWholeUnits(holding.rawAmount, holding.decimals);
      assets.push({
        key: `token-${holding.tokenAddress}`,
        symbol: holding.symbol,
        name: holding.name,
        amount,
        ...(holding.valueUsd !== undefined ? { valueUsd: holding.valueUsd } : {}),
        ...(holding.valueUsd !== undefined && Number(amount) > 0
          ? { unitPriceUsd: String(Number(holding.valueUsd) / Number(amount)) }
          : {}),
        ...(share(holding.valueUsd) !== undefined
          ? { allocationPct: share(holding.valueUsd) as number }
          : {}),
        isNative: false
      });
    }

    // Largest known value first; unpriced assets keep their API order at the end so
    // they stay visible rather than disappearing below a fold of priced rows.
    return assets.sort((left, right) => {
      if (left.valueUsd === undefined && right.valueUsd === undefined) {
        return 0;
      }
      if (left.valueUsd === undefined) {
        return 1;
      }
      if (right.valueUsd === undefined) {
        return -1;
      }
      return Number(right.valueUsd) - Number(left.valueUsd);
    });
  }, [data, nativeDecimals]);

  const filteredRows = useMemo(() => {
    const query = searchToken.trim().toLowerCase();
    return rows.filter((row) => {
      if (hideUnpriced && row.valueUsd === undefined) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      return row.symbol.toLowerCase().includes(query) || row.name.toLowerCase().includes(query);
    });
  }, [rows, hideUnpriced, searchToken]);

  const pricedCount = rows.filter((row) => row.valueUsd !== undefined).length;
  const unpricedCount = rows.length - pricedCount;

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleAddWallet = (event: React.FormEvent) => {
    event.preventDefault();
    setAddError(null);

    const candidate = newWalletInput.trim();
    if (candidate.length === 0) {
      setAddError("Enter a wallet address first.");
      return;
    }
    if (tracked.some((entry) => entry.toLowerCase() === candidate.toLowerCase())) {
      setAddError("That wallet is already in this list.");
      return;
    }

    // The rule: one wallet needs no connection, a second one does. This is a real
    // constraint rather than a nag — a multi-wallet view is built from the paid
    // report path, which settles on Algorand and therefore needs a signer.
    if (!requireWallet("Track more than one wallet and build a consolidated report")) {
      return;
    }

    const hint = detectAddressFormat(candidate);
    if (!hint.isValid) {
      setAddError(`${hint.label}: ${hint.hint}`);
      return;
    }

    setTracked((previous) => [...previous, candidate]);
    setSelected(candidate);
    setNewWalletInput("");
  };

  const handleAddPreset = (presetAddress: string) => {
    setAddError(null);
    if (tracked.some((entry) => entry.toLowerCase() === presetAddress.toLowerCase())) {
      setSelected(presetAddress);
      return;
    }
    if (!requireWallet("Track more than one wallet and build a consolidated report")) {
      return;
    }
    setTracked((previous) => [...previous, presetAddress]);
    setSelected(presetAddress);
  };

  const handleRemoveWallet = (entryToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tracked.length <= 1) return;
    const remaining = tracked.filter(
      (entry) => entry.toLowerCase() !== entryToRemove.toLowerCase()
    );
    setTracked(remaining);
    if (selected.toLowerCase() === entryToRemove.toLowerCase()) {
      setSelected(remaining[0]);
    }
  };

  const handleGenerateReport = () => {
    if (tracked.length < 2) {
      setAddError(
        "Add at least one more wallet to build a consolidated report — a single wallet is already fully covered above, free of charge."
      );
      return;
    }
    if (!requireWallet("Generate the consolidated portfolio report")) {
      return;
    }
    setShowReport(true);
  };

  const addressHint = detectAddressFormat(selected);

  return (
    <div className="site-atmosphere min-h-screen text-navy-800 selection:bg-primary-500 selection:text-white font-sans flex flex-col antialiased relative">
      <div className="subtle-bg-grid absolute inset-0 pointer-events-none z-0" />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 z-10 pt-4 pb-20 space-y-6">
        {/* Breadcrumb + provenance */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs font-bold text-navy-700 hover:text-primary-600 shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary-500" />
            <span>Back to search</span>
          </Link>

          {snapshot !== null && (
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-500">
              <span className="w-2 h-2 rounded-full bg-accentGreen" />
              <span>
                {snapshot.meta.source === "live" ? "Read live from chain" : "Served from cache"} ·{" "}
                {formatRelativeTime(data?.capturedAt ?? "")}
              </span>
            </div>
          )}
        </div>

        {/* 1. Wallet identity */}
        <section className="glass-frosted rounded-[28px] p-5 sm:p-6 shadow-glass border border-white">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-frosted-tile p-1 flex items-center justify-center border border-white/90 shadow-sm flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-primary-500 via-primary-600 to-blue-700 flex items-center justify-center text-white">
                  <Wallet className="w-7 h-7" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
                    {KNOWN_NAMES[selected.toLowerCase()] ?? shorten(selected, 8, 6)}
                  </h1>
                  {KNOWN_NAMES[selected.toLowerCase()] && (
                    <span className="font-mono text-xs text-navy-500 font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-navy-100">
                      {shorten(selected, 6, 4)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-100/90 border border-primary-200 text-xs font-black text-primary-600 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    <span>
                      {detectedChain !== null ? chainLabel(detectedChain) : addressHint.label}
                    </span>
                  </span>
                  {isConnected && session !== null && session.address === selected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Connected wallet</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-xs text-navy-500 font-mono mt-1.5 flex-wrap">
                  <span className="bg-white/60 px-2 py-0.5 rounded-lg border border-navy-100/50 break-all select-all font-medium text-navy-700">
                    {selected}
                  </span>

                  <button
                    type="button"
                    onClick={() => void handleCopy(selected)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all cursor-pointer font-sans text-xs font-bold"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-accentGreen" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-primary-500" />
                    )}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  {detectedChain !== null && explorerUrl(detectedChain, selected) !== null && (
                    <a
                      href={explorerUrl(detectedChain, selected) as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all font-sans text-xs font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-primary-500" />
                      <span>{explorerName(detectedChain) ?? "Explorer"}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => void load(selected)}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all cursor-pointer font-sans text-xs font-bold disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-primary-500 ${loading ? "animate-spin" : ""}`}
                    />
                    <span>Refresh</span>
                  </button>
                </div>

                {data !== undefined && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-navy-500 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-primary-500" />
                      Read via <code className="font-mono text-navy-700">{data.provider}</code>
                    </span>
                    {data.blockNumber !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary-500" />
                        {data.wallet.chain.namespace === "algorand" ? "Round" : "Block"}{" "}
                        <code className="font-mono text-navy-700">{data.blockNumber}</code>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary-500" />
                      Snapshot valid until{" "}
                      {new Date(data.expiresAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* The single paid action on this page */}
            <div className="flex-shrink-0 lg:border-l lg:border-navy-100/60 lg:pl-6 w-full lg:w-auto mt-2 lg:mt-0">
              <button
                type="button"
                onClick={handleGenerateReport}
                className="btn-connect-wallet text-white px-4 py-3 sm:py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer w-full sm:w-auto"
              >
                {isConnected ? (
                  <Zap className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Generate full report (USDC via x402)</span>
              </button>
              <p className="mt-1.5 text-[10px] text-navy-400 font-medium max-w-full lg:max-w-[15rem] text-center lg:text-left">
                Multi-wallet consolidation. You see the exact price before approving anything.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Truthful valuation principle */}
        <div className="glass-frosted rounded-2xl p-4 border border-white/90 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-primary-100/90 border border-primary-200 flex items-center justify-center flex-shrink-0 text-primary-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-navy-600 leading-relaxed">
            <strong className="text-navy-900 font-bold">Truthful valuation: </strong>
            balances are read from{" "}
            {detectedChain !== null ? chainLabel(detectedChain) : "the chain"} and priced through a
            market data feed. Anything without a trustworthy USD price is shown as{" "}
            <span className="inline-block font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
              Unpriced
            </span>{" "}
            and excluded from the total — never valued at $0.00 and never filled in with placeholder
            numbers.
          </div>
        </div>

        {/* 3. Loading / error / data */}
        {loading && snapshot === null && <LoadingPanel address={selected} />}

        {loadError !== null && !loading && (
          <ErrorPanel
            message={loadError.message}
            hint={loadError.hint}
            onRetry={() => void load(selected)}
            onSearch={(value) => setSelected(value)}
          />
        )}

        {data !== undefined && snapshot !== null && (
          <>
            {/* Summary */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Wallet value (priced)"
                value={formatUsd(data.totalValueUsd) ?? "Pending pricing"}
                note={
                  data.totalValueUsd === undefined
                    ? "No trusted price for this wallet's assets yet"
                    : unpricedCount > 0
                      ? `Excludes ${unpricedCount} unpriced asset${unpricedCount === 1 ? "" : "s"}`
                      : "Every discovered asset is priced"
                }
                noteTone={data.totalValueUsd === undefined || unpricedCount > 0 ? "warn" : "ok"}
              />

              <SummaryCard
                label="Assets found"
                value={`${rows.length}${rows.length === 1 ? " asset" : " assets"}`}
                note={`On ${detectedChain !== null ? chainLabel(detectedChain) : "one chain"}`}
              />

              <SummaryCard
                label="Priced vs unpriced"
                value={`${pricedCount} / ${unpricedCount}`}
                note={
                  unpricedCount > 0
                    ? "Unpriced assets excluded from value"
                    : "Full pricing coverage"
                }
                noteTone={unpricedCount > 0 ? "warn" : "ok"}
              />

              <SummaryCard
                label="Coverage"
                value={data.status === "complete" ? "Fully priced" : "Partially priced"}
                note="Curated token list per chain — not exhaustive"
                noteTone={data.status === "complete" ? "ok" : "warn"}
              />
            </section>

            {/* 4. Wallets in this view */}
            <section className="glass-frosted rounded-[28px] p-5 sm:p-6 shadow-glass border border-white">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3 border-b border-navy-100/60">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
                    Wallets
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-navy-900 tracking-tight">
                    {tracked.length === 1
                      ? "Watching one wallet"
                      : `Watching ${tracked.length} wallets`}
                  </h2>
                  <p className="text-[11px] text-navy-500 font-medium mt-0.5">
                    Looking up a single wallet is free and needs no connection.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {tracked.map((entry, index) => {
                    const isSelected = selected.toLowerCase() === entry.toLowerCase();
                    const displayName =
                      KNOWN_NAMES[entry.toLowerCase()] ??
                      (index === 0 ? "Searched" : `Wallet ${index + 1}`);

                    return (
                      <div
                        key={entry}
                        onClick={() => setSelected(entry)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary-500 text-white shadow-sm"
                            : "bg-white/80 text-navy-700 hover:bg-white border border-navy-100/60"
                        }`}
                        title={entry}
                      >
                        <span>
                          {displayName} · {shorten(entry, 4, 3)}
                        </span>
                        {tracked.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveWallet(entry, e)}
                            className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                              isSelected
                                ? "text-white/80 hover:text-white hover:bg-white/20"
                                : "text-navy-400 hover:text-navy-700 hover:bg-navy-100"
                            }`}
                            title="Remove wallet"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <form
                onSubmit={handleAddWallet}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={newWalletInput}
                    onChange={(event) => {
                      setNewWalletInput(event.target.value);
                      if (addError !== null) setAddError(null);
                    }}
                    placeholder="Add a wallet to consolidate (EVM, Algorand, Solana or Bitcoin)…"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-navy-100 text-navy-900 placeholder-navy-400 text-xs sm:text-sm font-mono outline-none focus:border-primary-400 shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="btn-connect-wallet text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer flex-1 sm:flex-none"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add wallet</span>
                  </button>
                </div>
              </form>

              {/* Quick Presets & Combined Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-navy-100/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-navy-400 font-bold text-[10px] uppercase tracking-wider">
                    Quick Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddPreset("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/80 text-navy-700 hover:text-primary-600 font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary-500" />
                    <span>vitalik.eth (ETH)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/80 text-navy-700 hover:text-primary-600 font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary-500" />
                    <span>Satoshi (BTC)</span>
                  </button>
                </div>

                {tracked.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Consolidate {tracked.length} Wallets (x402)</span>
                  </button>
                )}
              </div>

              {!isConnected && (
                <p className="mt-2 text-[11px] text-navy-500 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-navy-400" />
                  <span>
                    Adding a second wallet needs a connected wallet — the consolidated view is built
                    from the paid report.
                  </span>
                </p>
              )}

              {addError !== null && (
                <div className="mt-3 text-xs font-semibold text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}
            </section>

            {/* 5. Tabs */}
            <div className="flex items-center justify-between border-b border-navy-100/80 pt-2 pb-1 text-sm font-bold text-navy-500">
              <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto">
                {(
                  [
                    { id: "portfolio", label: "Portfolio", count: rows.length },
                    { id: "nfts", label: "NFTs", count: null },
                    { id: "transactions", label: "Transactions", count: data.transactions.length },
                    { id: "defi", label: "DeFi Positions", count: data.positions.length }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2.5 transition-colors relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-primary-600 border-b-2 border-primary-500 font-black"
                        : "hover:text-navy-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          activeTab === tab.id
                            ? "bg-primary-100 text-primary-700"
                            : "bg-navy-100 text-navy-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Portfolio tab */}
            {activeTab === "portfolio" && (
              <div className="space-y-4">
                <div className="glass-frosted rounded-2xl p-3.5 border border-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input
                      type="text"
                      value={searchToken}
                      onChange={(event) => setSearchToken(event.target.value)}
                      placeholder="Search this wallet's assets…"
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 border border-navy-100 text-xs font-medium text-navy-900 placeholder-navy-400 outline-none focus:border-primary-400"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-navy-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideUnpriced}
                      onChange={(event) => setHideUnpriced(event.target.checked)}
                      className="rounded border-navy-200 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Hide unpriced</span>
                  </label>
                </div>

                <div className="glass-frosted rounded-[28px] overflow-hidden shadow-glass border border-white">
                  <div className="hidden md:grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider py-3.5 px-6 border-b border-navy-100/60 bg-white/40">
                    <div className="col-span-4">Asset</div>
                    <div className="col-span-3">Balance</div>
                    <div className="col-span-2 text-right">Unit price</div>
                    <div className="col-span-3 text-right">Value &amp; allocation</div>
                  </div>

                  <div className="divide-y divide-navy-100/40">
                    {filteredRows.length === 0 ? (
                      <div className="p-8 text-center text-xs text-navy-400">
                        {rows.length === 0
                          ? "No tracked assets with a balance were found for this wallet."
                          : "No assets matched your filter."}
                      </div>
                    ) : (
                      filteredRows.map((row) => (
                        <div key={row.key} className="hover:bg-white/60 transition-colors">
                          {/* Mobile View (< md) */}
                          <div className="md:hidden p-3.5 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <GlassSquareIcon coin={coinKeyForSymbol(row.symbol)} size="sm" />
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-navy-900 flex items-center gap-1.5 flex-wrap">
                                    <span className="truncate">{row.name}</span>
                                    <span className="text-[11px] font-extrabold text-navy-400 font-mono">
                                      {row.symbol}
                                    </span>
                                    {row.isNative && (
                                      <span className="text-[9px] font-bold uppercase tracking-wide text-primary-600 bg-primary-50 border border-primary-100 px-1 rounded">
                                        native
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-semibold text-navy-400">
                                    {detectedChain !== null ? chainLabel(detectedChain) : ""}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                {row.valueUsd === undefined ? (
                                  <span className="text-xs text-navy-400 italic">
                                    Pending pricing
                                  </span>
                                ) : (
                                  <div className="text-sm font-black text-navy-900">
                                    {formatUsd(row.valueUsd)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-navy-100/40 text-xs">
                              <div className="font-mono font-bold text-navy-700">
                                {formatAmount(row.amount) ?? row.amount}{" "}
                                <span className="text-navy-400 font-semibold">{row.symbol}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {row.unitPriceUsd === undefined ? (
                                  <UnpricedTag />
                                ) : (
                                  <span className="font-mono text-[11px] font-semibold text-navy-500">
                                    {formatUsd(row.unitPriceUsd)}
                                  </span>
                                )}
                                {row.allocationPct !== undefined && (
                                  <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                    {row.allocationPct.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Desktop View (md+) */}
                          <div className="hidden md:grid grid-cols-12 items-center gap-3 p-4 sm:px-6 md:py-3.5">
                            <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                              <GlassSquareIcon coin={coinKeyForSymbol(row.symbol)} size="md" />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-navy-900 flex items-center gap-1.5 flex-wrap">
                                  <span>{row.name}</span>
                                  <span className="text-[11px] font-extrabold text-navy-400 font-mono">
                                    {row.symbol}
                                  </span>
                                  {row.isNative && (
                                    <span className="text-[9px] font-bold uppercase tracking-wide text-primary-600 bg-primary-50 border border-primary-100 px-1.5 rounded">
                                      native
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-semibold text-navy-400">
                                  {detectedChain !== null ? chainLabel(detectedChain) : ""}
                                </div>
                              </div>
                            </div>

                            <div className="md:col-span-3 text-xs font-mono font-bold text-navy-800">
                              {formatAmount(row.amount) ?? row.amount}{" "}
                              <span className="text-navy-400 font-semibold">{row.symbol}</span>
                            </div>

                            <div className="md:col-span-2 md:text-right">
                              {row.unitPriceUsd === undefined ? (
                                <UnpricedTag />
                              ) : (
                                <div className="text-xs font-mono font-semibold text-navy-700">
                                  {formatUsd(row.unitPriceUsd)}
                                </div>
                              )}
                            </div>

                            <div className="md:col-span-3 flex flex-col md:items-end justify-center">
                              {row.valueUsd === undefined ? (
                                <span className="text-xs text-navy-400 font-normal italic">
                                  Pending pricing
                                </span>
                              ) : (
                                <div className="text-sm font-black text-navy-900">
                                  {formatUsd(row.valueUsd)}
                                </div>
                              )}

                              {row.allocationPct !== undefined && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-bold text-navy-500">
                                    {row.allocationPct.toFixed(2)}%
                                  </span>
                                  <div className="w-16 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                                    <div
                                      className="h-full bg-primary-500 rounded-full"
                                      style={{ width: `${Math.min(row.allocationPct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-navy-400 font-medium leading-relaxed">
                  Discovered from a curated token list for{" "}
                  {detectedChain !== null ? chainLabel(detectedChain) : "this chain"}. Assets
                  outside that list are not read yet, so this is a priced view of what Growtrack
                  tracks — not a claim of complete on-chain coverage.
                </p>
              </div>
            )}

            {/* 7. Honest not-yet-supported tabs */}
            {activeTab === "nfts" && (
              <ComingSoon
                title="NFT positions"
                description="The read layer returns an explicit empty collection for NFTs; there is no indexer wired for it yet."
                detail="Rather than render placeholder cards that look like real holdings, this tab stays empty until a real NFT data source is connected. Your token and native balances above are unaffected."
              />
            )}

            {activeTab === "transactions" &&
              (data.transactions.length === 0 ? (
                <div className="glass-frosted rounded-[28px] p-8 sm:p-12 border border-white text-center shadow-glass space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto text-primary-500 shadow-xs">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-navy-900">
                    No Recent Transactions Indexed
                  </h3>
                  <p className="text-xs sm:text-sm text-navy-500 max-w-md mx-auto leading-relaxed">
                    The {detectedChain !== null ? chainLabel(detectedChain) : "chain"} indexer
                    returned no recent public transactions for this address, or transactions have
                    not settled yet.
                  </p>
                  {detectedChain !== null && explorerUrl(detectedChain, selected) !== null && (
                    <div className="pt-2">
                      <a
                        href={explorerUrl(detectedChain, selected) as string}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 hover:bg-white border border-navy-100 text-xs font-bold text-primary-600 hover:text-primary-700 shadow-xs transition-all"
                      >
                        <span>View raw history on {explorerName(detectedChain)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="glass-frosted rounded-[28px] p-5 sm:p-6 shadow-glass border border-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-navy-100/60">
                      <div>
                        <h3 className="text-base font-black text-navy-900 tracking-tight">
                          Recent On-Chain Activity
                        </h3>
                        <p className="text-xs text-navy-500 font-medium">
                          Showing {data.transactions.length} verified transaction
                          {data.transactions.length === 1 ? "" : "s"} indexed directly from{" "}
                          {detectedChain !== null ? chainLabel(detectedChain) : "chain"}.
                        </p>
                      </div>
                      {detectedChain !== null && explorerUrl(detectedChain, selected) !== null && (
                        <a
                          href={explorerUrl(detectedChain, selected) as string}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-navy-100/80 text-xs font-bold text-navy-700 hover:text-primary-600 shadow-xs transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-primary-500" />
                          <span>Full history on {explorerName(detectedChain)}</span>
                        </a>
                      )}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-navy-100/60 text-navy-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Tx Hash</th>
                            <th className="py-2.5 px-3">From / To</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3">Time</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-100/40">
                          {data.transactions.map((tx) => {
                            const isOutgoing =
                              tx.fromAddress &&
                              tx.fromAddress.toLowerCase() === selected.toLowerCase();
                            const isIncoming =
                              tx.toAddress && tx.toAddress.toLowerCase() === selected.toLowerCase();
                            const txLink = transactionUrl(detectedChain || "", tx.hash);

                            const formattedVal =
                              tx.rawValue && tx.rawValue !== "0"
                                ? toWholeUnits(
                                    tx.rawValue,
                                    detectedChain === "bitcoin"
                                      ? 8
                                      : detectedChain === "algorand"
                                        ? 6
                                        : detectedChain === "solana"
                                          ? 9
                                          : 18
                                  )
                                : null;

                            return (
                              <tr key={tx.hash} className="hover:bg-white/60 transition-colors">
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                      isOutgoing
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : isIncoming
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-primary-50 text-primary-700 border border-primary-200"
                                    }`}
                                  >
                                    {isOutgoing ? (
                                      <ArrowUpRight className="w-3 h-3" />
                                    ) : isIncoming ? (
                                      <ArrowDownLeft className="w-3 h-3" />
                                    ) : (
                                      <FileCode className="w-3 h-3" />
                                    )}
                                    <span>
                                      {tx.activityType ??
                                        (isOutgoing
                                          ? "Sent"
                                          : isIncoming
                                            ? "Received"
                                            : "Interaction")}
                                    </span>
                                  </span>
                                </td>

                                <td className="py-3 px-3 font-mono font-bold text-navy-800">
                                  {txLink ? (
                                    <a
                                      href={txLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
                                      title={tx.hash}
                                    >
                                      <span>{shorten(tx.hash, 8, 6)}</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  ) : (
                                    <span>{shorten(tx.hash, 8, 6)}</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 font-mono text-[11px] text-navy-600">
                                  {tx.fromAddress && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-navy-400">From:</span>
                                      <span title={tx.fromAddress}>
                                        {shorten(tx.fromAddress, 6, 4)}
                                      </span>
                                    </div>
                                  )}
                                  {tx.toAddress && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-navy-400">To:</span>
                                      <span title={tx.toAddress}>
                                        {shorten(tx.toAddress, 6, 4)}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-navy-900">
                                  {formattedVal !== null ? (
                                    <span
                                      className={
                                        isOutgoing
                                          ? "text-amber-700"
                                          : isIncoming
                                            ? "text-emerald-700"
                                            : "text-navy-900"
                                      }
                                    >
                                      {isOutgoing ? "-" : isIncoming ? "+" : ""}
                                      {formatAmount(formattedVal) ?? formattedVal}{" "}
                                      {tx.assetSymbol ?? ""}
                                    </span>
                                  ) : (
                                    <span className="text-navy-400 font-normal italic">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-navy-500 font-medium whitespace-nowrap">
                                  {tx.occurredAt ? formatRelativeTime(tx.occurredAt) : "Recently"}
                                </td>

                                <td className="py-3 px-3 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      tx.status === "confirmed" || !tx.status
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : tx.status === "failed"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {tx.status === "confirmed" || !tx.status ? (
                                      <Check className="w-2.5 h-2.5" />
                                    ) : null}
                                    <span className="capitalize">{tx.status ?? "confirmed"}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                      {data.transactions.map((tx) => {
                        const isOutgoing =
                          tx.fromAddress && tx.fromAddress.toLowerCase() === selected.toLowerCase();
                        const isIncoming =
                          tx.toAddress && tx.toAddress.toLowerCase() === selected.toLowerCase();
                        const txLink = transactionUrl(detectedChain || "", tx.hash);

                        const formattedVal =
                          tx.rawValue && tx.rawValue !== "0"
                            ? toWholeUnits(
                                tx.rawValue,
                                detectedChain === "bitcoin"
                                  ? 8
                                  : detectedChain === "algorand"
                                    ? 6
                                    : detectedChain === "solana"
                                      ? 9
                                      : 18
                              )
                            : null;

                        return (
                          <div
                            key={tx.hash}
                            className="glass-card-subtle rounded-xl p-3.5 border border-white/90 space-y-2.5 text-xs shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  isOutgoing
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : isIncoming
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-primary-50 text-primary-700 border border-primary-200"
                                }`}
                              >
                                {isOutgoing ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : isIncoming ? (
                                  <ArrowDownLeft className="w-3 h-3" />
                                ) : (
                                  <FileCode className="w-3 h-3" />
                                )}
                                <span>
                                  {tx.activityType ??
                                    (isOutgoing ? "Sent" : isIncoming ? "Received" : "Interaction")}
                                </span>
                              </span>

                              <span className="text-navy-400 text-[11px] font-medium">
                                {tx.occurredAt ? formatRelativeTime(tx.occurredAt) : "Recently"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 font-mono">
                              <span className="text-navy-500 text-[11px]">Hash</span>
                              {txLink ? (
                                <a
                                  href={txLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary-600 font-bold hover:underline"
                                >
                                  <span>{shorten(tx.hash, 6, 4)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="font-bold text-navy-800">
                                  {shorten(tx.hash, 6, 4)}
                                </span>
                              )}
                            </div>

                            {formattedVal !== null && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-navy-500 text-[11px]">Amount</span>
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    isOutgoing
                                      ? "text-amber-700"
                                      : isIncoming
                                        ? "text-emerald-700"
                                        : "text-navy-900"
                                  }`}
                                >
                                  {isOutgoing ? "-" : isIncoming ? "+" : ""}
                                  {formatAmount(formattedVal) ?? formattedVal}{" "}
                                  {tx.assetSymbol ?? ""}
                                </span>
                              </div>
                            )}

                            {(tx.fromAddress || tx.toAddress) && (
                              <div className="text-[11px] font-mono text-navy-600 bg-white/50 p-2 rounded-lg space-y-1">
                                {tx.fromAddress && (
                                  <div className="flex justify-between">
                                    <span className="text-navy-400">From:</span>
                                    <span>{shorten(tx.fromAddress, 6, 4)}</span>
                                  </div>
                                )}
                                {tx.toAddress && (
                                  <div className="flex justify-between">
                                    <span className="text-navy-400">To:</span>
                                    <span>{shorten(tx.toAddress, 6, 4)}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-navy-100/40 text-[10px]">
                              <span className="text-navy-400 capitalize">
                                {detectedChain !== null ? chainLabel(detectedChain) : "Chain"}
                              </span>
                              <span
                                className={`font-bold capitalize ${
                                  tx.status === "confirmed" || !tx.status
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {tx.status ?? "confirmed"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === "defi" && (
              <ComingSoon
                title="DeFi positions"
                description="Lending, staking and liquidity positions are not decoded yet; the API returns an empty positions list."
                detail="Showing invented protocol positions would be worse than showing none, so this stays empty until the protocols are actually read on-chain."
              />
            )}
          </>
        )}
      </main>

      {showReport && (
        <PortfolioReportModal addresses={tracked} onClose={() => setShowReport(false)} />
      )}

      <Footer />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  noteTone = "neutral"
}: {
  label: string;
  value: string;
  note: string;
  noteTone?: "ok" | "warn" | "neutral";
}) {
  const toneClass =
    noteTone === "ok"
      ? "text-accentGreen"
      : noteTone === "warn"
        ? "text-amber-600"
        : "text-navy-500";

  return (
    <div className="glass-frosted rounded-[24px] p-5 shadow-glass border border-white flex flex-col justify-between">
      <div className="text-xs font-bold uppercase tracking-wider text-navy-400">{label}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-black text-navy-900 tracking-tight break-words">
        {value}
      </div>
      <div className={`mt-2 text-xs font-semibold ${toneClass} flex items-center gap-1.5`}>
        {noteTone === "warn" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        <span>{note}</span>
      </div>
    </div>
  );
}

function UnpricedTag() {
  return (
    <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
      Unpriced
    </span>
  );
}

function LoadingPanel({ address }: { address: string }) {
  return (
    <div className="glass-frosted rounded-[28px] p-10 border border-white shadow-glass flex flex-col items-center gap-3 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      <div className="text-sm font-bold text-navy-800">Reading {shorten(address, 8, 6)}</div>
      <div className="text-xs text-navy-500 font-medium max-w-sm leading-relaxed">
        Balances and token holdings are read live from the chain, then priced. This can take a few
        seconds on a first lookup.
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  hint,
  onRetry,
  onSearch
}: {
  message: string;
  hint?: string;
  onRetry: () => void;
  onSearch: (value: string) => void;
}) {
  const [candidate, setCandidate] = useState("");

  return (
    <div className="glass-frosted rounded-[28px] p-6 sm:p-8 border border-white shadow-glass space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0 text-rose-600">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-black text-navy-900">Could not read that wallet</h2>
          <p className="mt-1 text-xs text-navy-600 leading-relaxed">{message}</p>
          {hint !== undefined && (
            <p className="mt-1 text-[11px] text-navy-500 leading-relaxed">{hint}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <input
          type="text"
          value={candidate}
          onChange={(event) => setCandidate(event.target.value)}
          placeholder="Try a different address…"
          className="flex-1 w-full px-4 py-2.5 rounded-xl bg-white/90 border border-navy-100 text-navy-900 placeholder-navy-400 text-xs font-mono outline-none focus:border-primary-400"
        />
        <button
          type="button"
          onClick={() => {
            const value = candidate.trim();
            if (value.length > 0) {
              onSearch(value);
              setCandidate("");
            }
          }}
          className="btn-connect-wallet text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer w-full sm:w-auto"
        >
          Analyze
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white border border-navy-100 text-navy-700 font-bold text-xs cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary-500" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}

function ComingSoon({
  title,
  description,
  detail
}: {
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="glass-frosted rounded-[28px] p-6 sm:p-10 border border-white shadow-glass">
      <div className="flex flex-col items-center text-center gap-3 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Hourglass className="w-5 h-5" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <X className="w-3 h-3" />
          Not supported yet
        </div>
        <h3 className="text-lg font-black text-navy-900">{title}</h3>
        <p className="text-xs text-navy-600 leading-relaxed">{description}</p>
        <p className="text-[11px] text-navy-500 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

/**
 * Turns an API failure into something the visitor can act on. The address-shaped
 * failures (unrecognized, ambiguous, invalid checksum) are the common ones and get
 * specific guidance rather than a generic error.
 */
function describeLoadError(error: unknown, address: string): { message: string; hint?: string } {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return {
        message:
          "The Growtrack API is unreachable right now. If you are running this locally, make sure the API process is running.",
        hint: "Nothing was displayed because no data could be read — no placeholder figures are shown in its place."
      };
    }
    switch (error.code) {
      case "UNRECOGNIZED_ADDRESS":
        return {
          message: `"${shorten(address, 10, 8)}" is not an address Growtrack recognizes.`,
          hint: "Supported forms: EVM (0x + 40 hex), Algorand (58-character base32), Solana (base58), Bitcoin (bech32 or legacy)."
        };
      case "AMBIGUOUS_ADDRESS":
        return {
          message: `"${shorten(address, 10, 8)}" matches more than one supported chain.`,
          hint: error.message
        };
      case "INVALID_WALLET_ADDRESS":
        return {
          message: `That address failed validation for the chain it matched.`,
          hint: "Algorand addresses carry a checksum, so a single wrong character invalidates them."
        };
      case "UNSUPPORTED_CHAIN":
        return { message: error.message, hint: "Only the chains listed by the API can be read." };
      case "VALIDATION_ERROR":
        return { message: "That address could not be accepted by the API.", hint: error.message };
      default:
        if (error.status === 429) {
          return {
            message: "Too many lookups from this browser in the last minute.",
            hint: "Free lookups hit public chain endpoints, so they are rate limited. Wait a moment and retry."
          };
        }
        return { message: error.message };
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "An unexpected error occurred while reading that wallet." };
}
