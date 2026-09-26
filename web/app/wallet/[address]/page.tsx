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
  chainSlug?: string;
  walletAddress?: string;
}

interface DisplayTransaction extends WalletTransaction {
  chainSlug?: string;
}

interface SupportedChain {
  slug: string;
  name: string;
  symbol: string;
  isEvm: boolean;
}

const ALL_SUPPORTED_CHAINS: readonly SupportedChain[] = [
  { slug: "ethereum", name: "Ethereum", symbol: "ETH", isEvm: true },
  { slug: "base", name: "Base", symbol: "ETH", isEvm: true },
  { slug: "arbitrum", name: "Arbitrum", symbol: "ETH", isEvm: true },
  { slug: "bsc", name: "BNB Chain", symbol: "BNB", isEvm: true },
  { slug: "polygon", name: "Polygon", symbol: "POL", isEvm: true },
  { slug: "optimism", name: "Optimism", symbol: "ETH", isEvm: true },
  { slug: "avalanche", name: "Avalanche", symbol: "AVAX", isEvm: true },
  { slug: "solana", name: "Solana", symbol: "SOL", isEvm: false },
  { slug: "bitcoin", name: "Bitcoin", symbol: "BTC", isEvm: false },
  { slug: "algorand", name: "Algorand", symbol: "ALGO", isEvm: false }
];

export default function WalletDashboardPage({ params }: PageProps) {
  const { address } = use(params);
  const rawAddress = decodeURIComponent(address);

  const { session, isConnected } = useWalletSession();
  const { requireWallet } = useWalletGate();

  // The wallet whose data is on screen. Can be "ALL" (consolidated across all wallets/chains)
  // or a specific address from tracked.
  const [selected, setSelected] = useState<string>(rawAddress);
  // Every wallet the visitor has added.
  const [tracked, setTracked] = useState<string[]>([rawAddress]);
  const [newWalletInput, setNewWalletInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Store snapshots indexed by lowercased wallet address
  const [snapshotsByAddress, setSnapshotsByAddress] = useState<Record<string, AnalyzeResponse>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<{ message: string; hint?: string } | null>(null);

  // Pending wallet to add when wallet connection or payment is needed
  const [pendingWalletToAdd, setPendingWalletToAdd] = useState<string | null>(null);
  const [reportModalAddresses, setReportModalAddresses] = useState<string[] | null>(null);

  const [chains, setChains] = useState<ChainDescriptor[]>([]);
  const [activeTab, setActiveTab] = useState<"portfolio" | "nfts" | "transactions" | "defi">(
    "portfolio"
  );
  const [selectedChainFilter, setSelectedChainFilter] = useState<string | null>(null);
  const [searchToken, setSearchToken] = useState("");
  const [hideUnpriced, setHideUnpriced] = useState(false);
  const [copied, setCopied] = useState(false);

  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});

  // A new address in the URL is a new primary wallet; reset the tracked set so the
  // page never mixes two different searches.
  const lastRouteAddress = useRef(rawAddress);
  useEffect(() => {
    if (lastRouteAddress.current !== rawAddress) {
      lastRouteAddress.current = rawAddress;
      setTracked([rawAddress]);
      setSelected(rawAddress);
      setSelectedChainFilter(null);
      setSnapshotsByAddress({});
      setFailedMap({});
    }
  }, [rawAddress]);

  useEffect(() => {
    void fetchChains()
      .then(setChains)
      .catch(() => setChains([]));
  }, []);

  const loadWallet = useCallback(async (walletAddress: string, chainSlug?: string) => {
    const key = walletAddress.toLowerCase();
    setLoadingMap((prev) => ({ ...prev, [key]: true }));
    setLoadError(null);
    try {
      const res = await analyzeWallet(walletAddress, chainSlug);
      setSnapshotsByAddress((prev) => ({ ...prev, [key]: res }));
      setFailedMap((prev) => ({ ...prev, [key]: false }));
    } catch (error) {
      setFailedMap((prev) => ({ ...prev, [key]: true }));
      setLoadError(describeLoadError(error, walletAddress));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  // Ensure all tracked wallets have their snapshots fetched
  useEffect(() => {
    for (const addr of tracked) {
      const key = addr.toLowerCase();
      if (!snapshotsByAddress[key] && !loadingMap[key] && !failedMap[key]) {
        void loadWallet(addr);
      }
    }
  }, [tracked, snapshotsByAddress, loadingMap, failedMap, loadWallet]);

  // When user was prompted to connect to add a wallet and now becomes connected:
  useEffect(() => {
    if (isConnected && pendingWalletToAdd !== null && reportModalAddresses === null) {
      setReportModalAddresses([...tracked, pendingWalletToAdd]);
    }
  }, [isConnected, pendingWalletToAdd, reportModalAddresses, tracked]);

  const isSelectedAll = selected === "ALL";
  const currentSnapshot = isSelectedAll
    ? null
    : (snapshotsByAddress[selected.toLowerCase()] ?? null);
  const data = currentSnapshot?.data;
  const detectedChain = isSelectedAll ? null : (currentSnapshot?.meta.chain ?? null);

  const loading = isSelectedAll
    ? tracked.some((addr) => loadingMap[addr.toLowerCase()])
    : Boolean(loadingMap[selected.toLowerCase()]);

  // Combined asset rows across all tracked wallets if isSelectedAll, or single wallet if not
  const rows = useMemo<AssetRow[]>(() => {
    const assets: AssetRow[] = [];
    const walletsToProcess = isSelectedAll ? tracked : currentSnapshot ? [selected] : [];

    for (const walletAddr of walletsToProcess) {
      const snap = snapshotsByAddress[walletAddr.toLowerCase()];
      if (!snap || !snap.data) continue;

      const d = snap.data;
      const snapChain = snap.meta.chain;
      const match = chains.find((chain) => chain.slug === snapChain);
      const nativeDec = match?.nativeDecimals ?? null;

      if (nativeDec !== null) {
        const nativeAmount = toWholeUnits(d.nativeBalance, nativeDec);
        assets.push({
          key: `${walletAddr}-native-${d.nativeSymbol}`,
          symbol: d.nativeSymbol,
          name: `${chainLabel(d.wallet.chain.slug)} native`,
          amount: nativeAmount,
          ...(d.nativeValueUsd !== undefined ? { valueUsd: d.nativeValueUsd } : {}),
          ...(d.nativeValueUsd !== undefined && Number(nativeAmount) > 0
            ? { unitPriceUsd: String(Number(d.nativeValueUsd) / Number(nativeAmount)) }
            : {}),
          isNative: true,
          chainSlug: d.wallet.chain.slug,
          walletAddress: walletAddr
        });
      }

      for (const holding of d.holdings) {
        const amount = toWholeUnits(holding.rawAmount, holding.decimals);
        assets.push({
          key: `${walletAddr}-token-${holding.tokenAddress}`,
          symbol: holding.symbol,
          name: holding.name,
          amount,
          ...(holding.valueUsd !== undefined ? { valueUsd: holding.valueUsd } : {}),
          ...(holding.valueUsd !== undefined && Number(amount) > 0
            ? { unitPriceUsd: String(Number(holding.valueUsd) / Number(amount)) }
            : {}),
          isNative: false,
          chainSlug: d.wallet.chain.slug,
          walletAddress: walletAddr
        });
      }
    }

    // Calculate allocation percentage relative to total priced assets in this view
    const totalPriced = assets.reduce(
      (sum, item) => sum + (item.valueUsd ? Number(item.valueUsd) : 0),
      0
    );

    if (totalPriced > 0) {
      for (const item of assets) {
        if (item.valueUsd !== undefined) {
          item.allocationPct = (Number(item.valueUsd) / totalPriced) * 100;
        }
      }
    }

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
  }, [isSelectedAll, tracked, selected, snapshotsByAddress, chains, currentSnapshot]);

  const totalPortfolioValueUsd = useMemo(() => {
    if (isSelectedAll) {
      let sum = 0;
      let hasAnyPriced = false;
      for (const addr of tracked) {
        const snap = snapshotsByAddress[addr.toLowerCase()];
        if (snap?.data?.totalValueUsd !== undefined) {
          sum += Number(snap.data.totalValueUsd);
          hasAnyPriced = true;
        }
      }
      return hasAnyPriced ? sum.toFixed(2) : undefined;
    }
    return currentSnapshot?.data?.totalValueUsd;
  }, [isSelectedAll, tracked, snapshotsByAddress, currentSnapshot]);

  const filteredRows = useMemo(() => {
    const query = searchToken.trim().toLowerCase();
    return rows.filter((row) => {
      if (hideUnpriced && row.valueUsd === undefined) {
        return false;
      }
      if (selectedChainFilter !== null && row.chainSlug !== selectedChainFilter) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      return row.symbol.toLowerCase().includes(query) || row.name.toLowerCase().includes(query);
    });
  }, [rows, hideUnpriced, searchToken, selectedChainFilter]);

  // Per-chain totals for the DeBank-style grid
  const chainTotals = useMemo(() => {
    const map: Record<string, { totalUsd: number; assetCount: number; hasAssets: boolean }> = {};
    for (const c of ALL_SUPPORTED_CHAINS) {
      map[c.slug] = { totalUsd: 0, assetCount: 0, hasAssets: false };
    }

    const walletsToProcess = isSelectedAll ? tracked : currentSnapshot ? [selected] : [];

    for (const walletAddr of walletsToProcess) {
      const snap = snapshotsByAddress[walletAddr.toLowerCase()];
      if (!snap || !snap.data) continue;

      const chainSlug = snap.data.wallet.chain.slug;
      if (map[chainSlug]) {
        map[chainSlug].hasAssets = true;
        map[chainSlug].assetCount += 1 + snap.data.holdings.length;
        if (snap.data.totalValueUsd !== undefined) {
          map[chainSlug].totalUsd += Number(snap.data.totalValueUsd);
        }
      }
    }
    return map;
  }, [isSelectedAll, tracked, selected, snapshotsByAddress, currentSnapshot]);

  const isCurrentEvm = useMemo(() => {
    if (detectedChain === null) return false;
    return ["ethereum", "base", "arbitrum", "bsc", "polygon", "optimism", "avalanche"].includes(
      detectedChain
    );
  }, [detectedChain]);

  const handleChainClick = (chainSlug: string) => {
    if (isSelectedAll) {
      // In consolidated view, clicking any chain filters the assets table to that chain
      setSelectedChainFilter((prev) => (prev === chainSlug ? null : chainSlug));
      return;
    }

    const targetChain = ALL_SUPPORTED_CHAINS.find((c) => c.slug === chainSlug);
    if (!targetChain) return;

    if (chainSlug === detectedChain) {
      // Toggle filter on current chain
      setSelectedChainFilter((prev) => (prev === chainSlug ? null : chainSlug));
      return;
    }

    if (isCurrentEvm && targetChain.isEvm) {
      setSelectedChainFilter(null);
      void loadWallet(selected, chainSlug);
    }
  };

  const transactions = useMemo<DisplayTransaction[]>(() => {
    if (!isSelectedAll) {
      return (currentSnapshot?.data?.transactions ?? []).map((t) => ({
        ...t,
        chainSlug: currentSnapshot?.data?.wallet?.chain?.slug
      }));
    }
    const allTx: DisplayTransaction[] = [];
    for (const addr of tracked) {
      const snap = snapshotsByAddress[addr.toLowerCase()];
      if (snap?.data?.transactions) {
        const chainSlug = snap.data.wallet.chain.slug;
        for (const t of snap.data.transactions) {
          allTx.push({ ...t, chainSlug });
        }
      }
    }
    return allTx.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }, [isSelectedAll, currentSnapshot, tracked, snapshotsByAddress]);

  const defiPositions = useMemo(() => {
    if (!isSelectedAll) {
      return currentSnapshot?.data?.positions ?? [];
    }
    const allPos = [];
    for (const addr of tracked) {
      const snap = snapshotsByAddress[addr.toLowerCase()];
      if (snap?.data?.positions) {
        allPos.push(...snap.data.positions);
      }
    }
    return allPos;
  }, [isSelectedAll, currentSnapshot, tracked, snapshotsByAddress]);

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

  const handleRefresh = () => {
    setFailedMap({});
    if (isSelectedAll) {
      for (const addr of tracked) {
        void loadWallet(addr);
      }
    } else {
      void loadWallet(selected, selectedChainFilter ?? undefined);
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

    const hint = detectAddressFormat(candidate);
    if (!hint.isValid) {
      setAddError(`${hint.label}: ${hint.hint}`);
      return;
    }

    // Adding a 2nd wallet requires wallet connection and $0.001 USDC (x402) on Algorand
    if (!isConnected) {
      setPendingWalletToAdd(candidate);
      requireWallet(
        "Connect your Algorand wallet to unlock multi-wallet tracking ($0.001 USDC via x402)"
      );
      return;
    }

    setPendingWalletToAdd(candidate);
    setReportModalAddresses([...tracked, candidate]);
  };

  const handleAddPreset = (presetAddress: string) => {
    setAddError(null);
    if (tracked.some((entry) => entry.toLowerCase() === presetAddress.toLowerCase())) {
      setSelected(presetAddress);
      return;
    }

    if (!isConnected) {
      setPendingWalletToAdd(presetAddress);
      requireWallet(
        "Connect your Algorand wallet to unlock multi-wallet tracking ($0.001 USDC via x402)"
      );
      return;
    }

    setPendingWalletToAdd(presetAddress);
    setReportModalAddresses([...tracked, presetAddress]);
  };

  const handleRemoveWallet = (entryToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tracked.length <= 1) return;
    const remaining = tracked.filter(
      (entry) => entry.toLowerCase() !== entryToRemove.toLowerCase()
    );
    setTracked(remaining);
    setSnapshotsByAddress((prev) => {
      const copy = { ...prev };
      delete copy[entryToRemove.toLowerCase()];
      return copy;
    });
    if (selected.toLowerCase() === entryToRemove.toLowerCase()) {
      setSelected(remaining.length > 1 ? "ALL" : remaining[0]);
    }
  };

  const handleGenerateReport = () => {
    if (!requireWallet("Generate the consolidated portfolio report ($0.001 USDC via x402)")) {
      return;
    }
    setReportModalAddresses(tracked);
  };

  const addressHint = isSelectedAll
    ? { label: "Multi-Chain", hint: "", isValid: true }
    : detectAddressFormat(selected);

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

          {isSelectedAll ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-500">
              <span className="w-2 h-2 rounded-full bg-accentGreen" />
              <span>Multi-Wallet Consolidated · {tracked.length} wallets · Live across chains</span>
            </div>
          ) : currentSnapshot !== null ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-500">
              <span className="w-2 h-2 rounded-full bg-accentGreen" />
              <span>
                {currentSnapshot.meta.source === "live"
                  ? "Read live from chain"
                  : "Served from cache"}{" "}
                · {formatRelativeTime(data?.capturedAt ?? "")}
              </span>
            </div>
          ) : null}
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
                {isSelectedAll ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
                        All Tracked Wallets
                      </h1>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-100/90 border border-primary-200 text-xs font-black text-primary-600 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <span>{tracked.length} Wallets · Multi-Chain Consolidated</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-navy-500 font-mono mt-2 flex-wrap">
                      {tracked.map((addr) => (
                        <button
                          key={addr}
                          type="button"
                          onClick={() => setSelected(addr)}
                          className="bg-white/70 hover:bg-white px-2 py-0.5 rounded-lg border border-navy-100 text-navy-700 font-medium cursor-pointer transition-all inline-flex items-center gap-1 text-xs"
                          title={`Click to view ${addr}`}
                        >
                          <span>{KNOWN_NAMES[addr.toLowerCase()] ?? shorten(addr, 6, 4)}</span>
                          <ArrowUpRight className="w-3 h-3 text-navy-400" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all cursor-pointer font-sans text-xs font-bold disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-primary-500 ${loading ? "animate-spin" : ""}`}
                        />
                        <span>Refresh all</span>
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-navy-500 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-primary-500" />
                        Multi-chain live indexer aggregated
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary-500" />
                        10 Layer 1 and Layer 2 chains
                      </span>
                    </div>
                  </>
                ) : (
                  <>
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
                        onClick={handleRefresh}
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
                  </>
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
                <span>Generate full report ($0.001 USDC)</span>
              </button>
              <p className="mt-1.5 text-[10px] text-navy-400 font-medium max-w-full lg:max-w-[15rem] text-center lg:text-left">
                Multi-wallet consolidation. Pay $0.001 USDC via x402 on Algorand.
              </p>
            </div>
          </div>
        </section>

        {/* Loading / error / data */}
        {loading &&
          (!isSelectedAll
            ? currentSnapshot === null
            : Object.keys(snapshotsByAddress).length === 0) && (
            <LoadingPanel address={isSelectedAll ? "all tracked wallets" : selected} />
          )}

        {loadError !== null && !loading && (
          <ErrorPanel
            message={loadError.message}
            hint={loadError.hint}
            onRetry={handleRefresh}
            onSearch={(value) => setSelected(value)}
          />
        )}

        {((!isSelectedAll && data !== undefined && currentSnapshot !== null) ||
          (isSelectedAll && Object.keys(snapshotsByAddress).length > 0)) && (
          <>
            {/* Compact Summary Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <SummaryCard
                label={isSelectedAll ? "Consolidated value (priced)" : "Wallet value (priced)"}
                value={formatUsd(totalPortfolioValueUsd) ?? "Pending pricing"}
                note={
                  totalPortfolioValueUsd === undefined
                    ? "No trusted price for these assets yet"
                    : unpricedCount > 0
                      ? `Excludes ${unpricedCount} unpriced asset${unpricedCount === 1 ? "" : "s"}`
                      : "Every discovered asset is priced"
                }
                noteTone={totalPortfolioValueUsd === undefined || unpricedCount > 0 ? "warn" : "ok"}
              />

              <SummaryCard
                label="Assets found"
                value={`${rows.length}${rows.length === 1 ? " asset" : " assets"}`}
                note={
                  isSelectedAll
                    ? `Across ${tracked.length} wallets`
                    : `On ${detectedChain !== null ? chainLabel(detectedChain) : "one chain"}`
                }
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
                value={
                  isSelectedAll
                    ? "Multi-Wallet Consolidated"
                    : data?.status === "complete"
                      ? "Fully priced"
                      : "Partially priced"
                }
                note="Curated token list per chain — not exhaustive"
                noteTone="ok"
              />
            </section>

            {/* DeBank-Style Multi-Chain Portfolio Breakdown */}
            <section className="glass-frosted rounded-2xl p-4 sm:p-5 shadow-glass border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-navy-100/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-100/80 border border-primary-200/80 flex items-center justify-center text-primary-600 flex-shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-navy-900 tracking-tight flex items-center gap-2">
                      <span>Multi-Chain Portfolio Breakdown</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-600">
                        10 Chains
                      </span>
                    </h3>
                    <p className="text-[11px] text-navy-500 font-medium">
                      DeBank-style coverage across Layer 1 networks and EVM Layer 2 rollups
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChainFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedChainFilter === null
                        ? "bg-primary-500 text-white shadow-xs"
                        : "bg-white/80 hover:bg-white text-navy-700 border border-navy-100/80"
                    }`}
                  >
                    All Chains
                  </button>
                  {detectedChain !== null && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-accentGreen animate-pulse" />
                      <span>{chainLabel(detectedChain)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of chains */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
                {ALL_SUPPORTED_CHAINS.map((chain) => {
                  const isActive = !isSelectedAll && detectedChain === chain.slug;
                  const isFiltered = selectedChainFilter === chain.slug;
                  const isCompatible = isSelectedAll || (isCurrentEvm && chain.isEvm) || isActive;

                  let displayValue = "—";
                  let displayPct: string | null = null;

                  if (isSelectedAll) {
                    const info = chainTotals[chain.slug];
                    if (info && info.hasAssets) {
                      displayValue = formatUsd(info.totalUsd.toString()) ?? "$0";
                      if (
                        totalPortfolioValueUsd &&
                        Number(totalPortfolioValueUsd) > 0 &&
                        info.totalUsd > 0
                      ) {
                        displayPct = `${((info.totalUsd / Number(totalPortfolioValueUsd)) * 100).toFixed(1)}%`;
                      }
                    } else {
                      displayValue = "$0";
                    }
                  } else {
                    if (isActive && data !== undefined) {
                      displayValue = formatUsd(data.totalValueUsd) ?? "Pending";
                      if (data.totalValueUsd !== undefined && Number(data.totalValueUsd) > 0) {
                        displayPct = "100%";
                      }
                    } else if (isCompatible) {
                      displayValue = "$0";
                    }
                  }

                  const hasBalance = isSelectedAll
                    ? (chainTotals[chain.slug]?.hasAssets ?? false)
                    : isActive;

                  return (
                    <div
                      key={chain.slug}
                      onClick={() => handleChainClick(chain.slug)}
                      className={`group p-2.5 rounded-xl border transition-all select-none flex items-center justify-between gap-2 ${
                        isActive || isFiltered
                          ? "bg-primary-50/90 border-primary-300 ring-1 ring-primary-400 shadow-xs cursor-pointer"
                          : isCompatible
                            ? "bg-white/75 hover:bg-white border-navy-100/70 hover:border-primary-200 hover:shadow-xs cursor-pointer"
                            : "bg-white/30 border-navy-100/30 opacity-40 cursor-not-allowed"
                      }`}
                      title={
                        isSelectedAll
                          ? `Click to filter assets on ${chain.name}`
                          : isActive
                            ? `Currently viewing on ${chain.name}`
                            : isCompatible
                              ? `Click to view ${chain.name} balances`
                              : `Not compatible with ${chainLabel(detectedChain ?? "")} address`
                      }
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                          <GlassSquareIcon coin={chain.slug} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-navy-900 truncate flex items-center gap-1">
                            <span>{chain.name}</span>
                            {(isActive || (isSelectedAll && hasBalance)) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-navy-600 flex items-center gap-1 mt-0.5">
                            <span
                              className={isActive || hasBalance ? "text-navy-900 font-black" : ""}
                            >
                              {displayValue}
                            </span>
                            {displayPct !== null && (
                              <span className="text-[10px] text-primary-600 font-bold">
                                {displayPct}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isActive ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-500 text-white">
                            Live
                          </span>
                        ) : isFiltered ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-600 text-white">
                            Filtered
                          </span>
                        ) : isCompatible ? (
                          <span className="text-[10px] font-bold text-navy-400 group-hover:text-primary-600 transition-colors">
                            &rarr;
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Compact Wallets in this view */}
            <section className="glass-frosted rounded-2xl p-3.5 sm:p-4 shadow-glass border border-white">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-navy-100/60">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                    Wallets
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
                    {tracked.length === 1
                      ? "Watching one wallet"
                      : `Watching ${tracked.length} wallets (Consolidated)`}
                  </h2>
                  <p className="text-[10px] text-navy-500 font-medium">
                    {tracked.length === 1
                      ? "Looking up a single wallet is free. Add another wallet to consolidate multi-chain net worth."
                      : "Click 'All Wallets' for unified net worth, or any wallet to inspect its individual holdings."}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {tracked.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelected("ALL")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer select-none ${
                        isSelectedAll
                          ? "bg-primary-500 text-white shadow-xs ring-2 ring-primary-300"
                          : "bg-white/80 text-navy-700 hover:bg-white border border-navy-100/60"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Wallets ({tracked.length}) · Consolidated</span>
                    </button>
                  )}

                  {tracked.map((entry, index) => {
                    const isSelected =
                      !isSelectedAll && selected.toLowerCase() === entry.toLowerCase();
                    const displayName =
                      KNOWN_NAMES[entry.toLowerCase()] ??
                      (index === 0 ? "Searched" : `Wallet ${index + 1}`);

                    return (
                      <div
                        key={entry}
                        onClick={() => setSelected(entry)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary-500 text-white shadow-xs"
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
                className="flex flex-col sm:flex-row items-center gap-2.5"
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
                    className="w-full px-3 py-2 rounded-xl bg-white/90 border border-navy-100 text-navy-900 placeholder-navy-400 text-xs font-mono outline-none focus:border-primary-400 shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="btn-connect-wallet text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer flex-1 sm:flex-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add wallet</span>
                  </button>
                </div>
              </form>

              {/* Quick Presets & Combined Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2.5 pt-2.5 border-t border-navy-100/40">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-navy-400 font-bold text-[10px] uppercase tracking-wider">
                    Quick Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddPreset("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white border border-navy-100/80 text-navy-700 hover:text-primary-600 font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary-500" />
                    <span>vitalik.eth (ETH)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPreset("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white border border-navy-100/80 text-navy-700 hover:text-primary-600 font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary-500" />
                    <span>Satoshi (BTC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddPreset("JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4")
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white border border-navy-100/80 text-navy-700 hover:text-primary-600 font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary-500" />
                    <span>Algorand Foundation (ALGO)</span>
                  </button>
                </div>

                {tracked.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Consolidate {tracked.length} Wallets ($0.001 USDC)</span>
                  </button>
                )}
              </div>

              {!isConnected && (
                <p className="mt-2 text-[10px] text-navy-500 font-medium flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-navy-400" />
                  <span>
                    Adding a second wallet needs a connected wallet — unlocked for $0.001 USDC via
                    x402 on Algorand.
                  </span>
                </p>
              )}

              {addError !== null && (
                <div className="mt-2 text-xs font-semibold text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
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
                    { id: "transactions", label: "Transactions", count: transactions.length },
                    { id: "defi", label: "DeFi Positions", count: defiPositions.length }
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
                                  <div className="text-[10px] font-semibold text-navy-400 flex items-center gap-1.5 mt-0.5">
                                    <span>
                                      {row.chainSlug
                                        ? chainLabel(row.chainSlug)
                                        : detectedChain !== null
                                          ? chainLabel(detectedChain)
                                          : ""}
                                    </span>
                                    {isSelectedAll && row.walletAddress && (
                                      <span className="text-[9px] text-navy-500 font-mono bg-navy-50 px-1 py-0.2 rounded border border-navy-100">
                                        {KNOWN_NAMES[row.walletAddress.toLowerCase()] ??
                                          shorten(row.walletAddress, 4, 3)}
                                      </span>
                                    )}
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
                                <div className="text-[11px] font-semibold text-navy-400 flex items-center gap-1.5 mt-0.5">
                                  <span>
                                    {row.chainSlug
                                      ? chainLabel(row.chainSlug)
                                      : detectedChain !== null
                                        ? chainLabel(detectedChain)
                                        : ""}
                                  </span>
                                  {isSelectedAll && row.walletAddress && (
                                    <span className="text-[10px] text-navy-500 font-mono bg-navy-50 px-1.5 py-0.5 rounded border border-navy-100">
                                      {KNOWN_NAMES[row.walletAddress.toLowerCase()] ??
                                        shorten(row.walletAddress, 4, 3)}
                                    </span>
                                  )}
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
              (transactions.length === 0 ? (
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
                          Showing {transactions.length} verified transaction
                          {transactions.length === 1 ? "" : "s"} indexed directly from chain.
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
                          {transactions.map((tx) => {
                            const isOutgoing =
                              Boolean(tx.fromAddress) &&
                              (tx.fromAddress.toLowerCase() === selected.toLowerCase() ||
                                tracked.some(
                                  (a) => a.toLowerCase() === tx.fromAddress.toLowerCase()
                                ));
                            const isIncoming =
                              Boolean(tx.toAddress) &&
                              (tx.toAddress!.toLowerCase() === selected.toLowerCase() ||
                                tracked.some(
                                  (a) => a.toLowerCase() === tx.toAddress!.toLowerCase()
                                ));
                            const txChain = tx.chainSlug || detectedChain || "";
                            const txLink = transactionUrl(txChain, tx.hash);

                            const formattedVal =
                              tx.rawValue && tx.rawValue !== "0"
                                ? toWholeUnits(
                                    tx.rawValue,
                                    txChain === "bitcoin"
                                      ? 8
                                      : txChain === "algorand"
                                        ? 6
                                        : txChain === "solana"
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
                      {transactions.map((tx) => {
                        const isOutgoing =
                          Boolean(tx.fromAddress) &&
                          (tx.fromAddress.toLowerCase() === selected.toLowerCase() ||
                            tracked.some((a) => a.toLowerCase() === tx.fromAddress.toLowerCase()));
                        const isIncoming =
                          Boolean(tx.toAddress) &&
                          (tx.toAddress!.toLowerCase() === selected.toLowerCase() ||
                            tracked.some((a) => a.toLowerCase() === tx.toAddress!.toLowerCase()));
                        const txChain = tx.chainSlug || detectedChain || "";
                        const txLink = transactionUrl(txChain, tx.hash);

                        const formattedVal =
                          tx.rawValue && tx.rawValue !== "0"
                            ? toWholeUnits(
                                tx.rawValue,
                                txChain === "bitcoin"
                                  ? 8
                                  : txChain === "algorand"
                                    ? 6
                                    : txChain === "solana"
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
                                {txChain ? chainLabel(txChain) : "Chain"}
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

      {reportModalAddresses !== null && (
        <PortfolioReportModal
          addresses={reportModalAddresses}
          onClose={() => {
            setReportModalAddresses(null);
            setPendingWalletToAdd(null);
          }}
          onSuccess={() => {
            if (pendingWalletToAdd !== null) {
              const toAdd = pendingWalletToAdd;
              setTracked((prev) =>
                prev.some((x) => x.toLowerCase() === toAdd.toLowerCase()) ? prev : [...prev, toAdd]
              );
              setSelected("ALL");
              setNewWalletInput("");
              setPendingWalletToAdd(null);
              setReportModalAddresses(null);
              void loadWallet(toAdd);
            }
          }}
        />
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
    <div className="glass-frosted rounded-2xl p-3.5 sm:p-4 shadow-glass border border-white flex flex-col justify-between">
      <div className="text-[11px] font-bold uppercase tracking-wider text-navy-400">{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-black text-navy-900 tracking-tight break-words">
        {value}
      </div>
      <div
        className={`mt-1.5 text-[11px] font-semibold ${toneClass} flex items-center gap-1.5 truncate`}
      >
        {noteTone === "warn" && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        )}
        <span className="truncate">{note}</span>
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
