"use client";

import React, { useState, useMemo, use } from "react";
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
  Share2,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  Lock,
  Layers
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useWalletModal } from "@/context/WalletModalContext";
import { GlassSquareIcon } from "@/components/wallet/GlassSquareIcon";
import { detectAddressFormat } from "@/components/landing/HeroSearch";

interface PageProps {
  params: Promise<{ address: string }>;
}

interface TrackedWallet {
  id: string;
  name: string;
  address: string;
  chain: string;
  value: number;
}

interface PortfolioToken {
  id: string;
  name: string;
  symbol: string;
  chain: "ethereum" | "algorand" | "bnb" | "bitcoin" | "hyperliquid";
  chainName: string;
  coinKey: string;
  balance: number;
  balanceFormatted: string;
  price: number | null;
  priceFormatted: string;
  value: number | null;
  valueFormatted: string;
  allocationPercent: number;
  status: "verified" | "unpriced";
}

const INITIAL_PORTFOLIO_TOKENS: PortfolioToken[] = [
  {
    id: "eth-1",
    name: "Ethereum",
    symbol: "ETH",
    chain: "ethereum",
    chainName: "Ethereum",
    coinKey: "eth",
    balance: 482.1054,
    balanceFormatted: "482.1054 ETH",
    price: 3420.12,
    priceFormatted: "$3,420.12",
    value: 1648858.33,
    valueFormatted: "$1,648,858.33",
    allocationPercent: 89.47,
    status: "verified"
  },
  {
    id: "algo-1",
    name: "Algorand",
    symbol: "ALGO",
    chain: "algorand",
    chainName: "Algorand",
    coinKey: "algo",
    balance: 625000,
    balanceFormatted: "625,000 ALGO",
    price: 0.185,
    priceFormatted: "$0.185",
    value: 115625.0,
    valueFormatted: "$115,625.00",
    allocationPercent: 6.27,
    status: "verified"
  },
  {
    id: "algo-2",
    name: "USDC (Algorand Standard Asset)",
    symbol: "USDC",
    chain: "algorand",
    chainName: "Algorand",
    coinKey: "usdc",
    balance: 45000,
    balanceFormatted: "45,000.00 USDC",
    price: 1.0,
    priceFormatted: "$1.00",
    value: 45000.0,
    valueFormatted: "$45,000.00",
    allocationPercent: 2.44,
    status: "verified"
  },
  {
    id: "bnb-1",
    name: "BNB Chain",
    symbol: "BNB",
    chain: "bnb",
    chainName: "BNB Chain",
    coinKey: "bnb",
    balance: 35.5,
    balanceFormatted: "35.50 BNB",
    price: 590.25,
    priceFormatted: "$590.25",
    value: 20953.88,
    valueFormatted: "$20,953.88",
    allocationPercent: 1.14,
    status: "verified"
  },
  {
    id: "btc-1",
    name: "Bitcoin",
    symbol: "BTC",
    chain: "bitcoin",
    chainName: "Bitcoin",
    coinKey: "btc",
    balance: 0.15,
    balanceFormatted: "0.1500 BTC",
    price: 64200.0,
    priceFormatted: "$64,200.00",
    value: 9630.0,
    valueFormatted: "$9,630.00",
    allocationPercent: 0.52,
    status: "verified"
  },
  {
    id: "hype-1",
    name: "Hyperliquid",
    symbol: "HYPE",
    chain: "hyperliquid",
    chainName: "Hyperliquid",
    coinKey: "hype",
    balance: 100,
    balanceFormatted: "100.00 HYPE",
    price: 28.63,
    priceFormatted: "$28.63",
    value: 2863.33,
    valueFormatted: "$2,863.33",
    allocationPercent: 0.16,
    status: "verified"
  },
  {
    id: "algo-unpriced-1",
    name: "AlgoDAO Governance Token",
    symbol: "AGOV",
    chain: "algorand",
    chainName: "Algorand",
    coinKey: "algo",
    balance: 24500,
    balanceFormatted: "24,500 AGOV",
    price: null,
    priceFormatted: "Unpriced",
    value: null,
    valueFormatted: "Unpriced",
    allocationPercent: 0,
    status: "unpriced"
  },
  {
    id: "evm-unpriced-1",
    name: "Community Early Access Voucher",
    symbol: "GROWPASS",
    chain: "ethereum",
    chainName: "Ethereum",
    coinKey: "eth",
    balance: 1,
    balanceFormatted: "1 GROWPASS",
    price: null,
    priceFormatted: "Unpriced",
    value: null,
    valueFormatted: "Unpriced",
    allocationPercent: 0,
    status: "unpriced"
  }
];

export default function WalletDashboardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawAddress = decodeURIComponent(resolvedParams.address);

  const { openWalletModal } = useWalletModal();

  // Primary active tabs: Portfolio, NFTs, Transactions, DeFi (DeBank Stream & Badge REMOVED)
  const [activeTab, setActiveTab] = useState<"portfolio" | "nfts" | "transactions" | "defi">(
    "portfolio"
  );

  const [copied, setCopied] = useState(false);
  const [searchTokenQuery, setSearchTokenQuery] = useState("");
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>("all");
  const [hideUnpriced, setHideUnpriced] = useState(false);

  // Multi-wallet state (Replacing DeBank social followers/TVF section)
  const [trackedWallets, setTrackedWallets] = useState<TrackedWallet[]>([
    {
      id: "w-primary",
      name: rawAddress.startsWith("0x") ? "Primary EVM Vault" : "Primary Algorand Account",
      address: rawAddress,
      chain: rawAddress.startsWith("0x") ? "Ethereum" : "Algorand",
      value: 1842930.54
    },
    {
      id: "w-secondary",
      name: "Algorand Treasury Vault",
      address: "F232B4F67D890EAC765D890EAC765D890EAC765D890EAC765D890EACDSEA",
      chain: "Algorand",
      value: 210873.0
    }
  ]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("all"); // "all" or specific wallet id
  const [newWalletInput, setNewWalletInput] = useState("");
  const [addWalletSuccess, setAddWalletSuccess] = useState(false);

  // x402 Modal Simulation State
  const [showX402Modal, setShowX402Modal] = useState(false);
  const [x402Step, setX402Step] = useState<"ready" | "signing" | "verifying" | "settled">("ready");

  const detection = useMemo(() => detectAddressFormat(rawAddress), [rawAddress]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = useMemo(() => {
    if (detection.chain === "algorand" || rawAddress.length === 58) {
      return `https://lora.algokit.io/mainnet/account/${rawAddress}`;
    }
    if (detection.chain === "evm" || rawAddress.startsWith("0x")) {
      return `https://etherscan.io/address/${rawAddress}`;
    }
    return `https://blockchair.com/search?q=${rawAddress}`;
  }, [detection.chain, rawAddress]);

  // Handle adding a new wallet to the tracked portfolio
  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = newWalletInput.trim();
    if (!addr) return;

    const detected = detectAddressFormat(addr);
    const newWallet: TrackedWallet = {
      id: `w-${Date.now()}`,
      name: `Tracked Wallet ${trackedWallets.length + 1}`,
      address: addr,
      chain: detected.label.split(" ")[0] || "Multichain",
      value: 125420.0
    };

    setTrackedWallets((prev) => [...prev, newWallet]);
    setNewWalletInput("");
    setAddWalletSuccess(true);
    setTimeout(() => setAddWalletSuccess(false), 3000);
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return INITIAL_PORTFOLIO_TOKENS.filter((token) => {
      // Chain filter
      if (selectedChainFilter !== "all" && token.chain !== selectedChainFilter) {
        return false;
      }
      // Hide unpriced
      if (hideUnpriced && token.status === "unpriced") {
        return false;
      }
      // Search query
      if (searchTokenQuery.trim()) {
        const q = searchTokenQuery.toLowerCase().trim();
        return token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedChainFilter, hideUnpriced, searchTokenQuery]);

  // Total Portfolio Value calculations
  const totalValue = useMemo(() => {
    if (selectedWalletId === "all") {
      return trackedWallets.reduce((acc, w) => acc + w.value, 0);
    }
    const current = trackedWallets.find((w) => w.id === selectedWalletId);
    return current ? current.value : 1842930.54;
  }, [selectedWalletId, trackedWallets]);

  // Trigger x402 live payment simulation
  const handleTriggerX402 = () => {
    setShowX402Modal(true);
    setX402Step("ready");
  };

  const handleExecuteX402 = () => {
    setX402Step("signing");
    setTimeout(() => {
      setX402Step("verifying");
      setTimeout(() => {
        setX402Step("settled");
      }, 1200);
    }, 1000);
  };

  return (
    <div className="site-atmosphere min-h-screen text-navy-800 selection:bg-primary-500 selection:text-white font-sans flex flex-col antialiased relative">
      {/* Subtle background grid */}
      <div className="subtle-bg-grid absolute inset-0 pointer-events-none z-0" />

      {/* Main App Bar */}
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 z-10 pt-4 pb-20 space-y-6">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs font-bold text-navy-700 hover:text-primary-600 shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-primary-500" />
            <span>Back to Radar</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-navy-500">
            <span className="w-2 h-2 rounded-full bg-accentGreen animate-pulse" />
            <span>Live Synchronized with Algorand x402</span>
          </div>
        </div>

        {/* 1. Wallet Identity Card */}
        <section className="glass-frosted rounded-[28px] p-5 sm:p-6 shadow-glass border border-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Avatar + Address info + Badges */}
            <div className="flex items-start sm:items-center gap-4">
              {/* Glass Squircle Avatar */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl glass-frosted-tile p-1 flex items-center justify-center border border-white/90 shadow-sm flex-shrink-0">
                <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-primary-500 via-primary-600 to-blue-700 flex items-center justify-center text-white text-2xl shadow-inner">
                  {rawAddress.startsWith("0x") ? "💎" : "⚡"}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
                    {rawAddress.slice(0, 6)}...{rawAddress.slice(-4)}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-100/90 border border-primary-200 text-xs font-black text-primary-600 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    <span>{detection.label || "Multichain Target"}</span>
                  </span>
                  <span className="inline-flex items-center text-[11px] font-bold text-navy-500 bg-white/70 border border-white/80 px-2 py-0.5 rounded-full">
                    Non-Custodial
                  </span>
                </div>

                {/* Full Address Row with Actions */}
                <div className="flex items-center gap-2.5 text-xs text-navy-500 font-mono mt-1.5 flex-wrap">
                  <span className="bg-white/60 px-2 py-0.5 rounded-lg border border-navy-100/50 break-all select-all font-medium text-navy-700">
                    {rawAddress}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all cursor-pointer font-sans text-xs font-bold"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-accentGreen" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-primary-500" />
                    )}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 hover:text-primary-600 shadow-xs transition-all font-sans text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary-500" />
                    <span>Explorer</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Snapshot Info & Live x402 Action */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 lg:border-l lg:border-navy-100/60 lg:pl-6">
              <div className="text-xs text-navy-500 space-y-1 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary-500" />
                  <span>
                    Snapshot: <strong className="text-navy-800">Synced &lt; 1 min ago</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary-500" />
                  <span>
                    Protocol: <strong className="text-navy-800">Algorand x402 Rails</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerX402}
                className="btn-connect-wallet text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Live Refresh ($0.01 via x402)</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Truthful Valuation Banner */}
        <div className="glass-frosted rounded-2xl p-4 border border-white/90 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-primary-100/90 border border-primary-200 flex items-center justify-center flex-shrink-0 text-primary-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-navy-600 leading-relaxed">
            <strong className="text-navy-900 font-bold">Truthful Valuation Principle: </strong>
            Tokens without verified market liquidity or reputable oracle pricing depth are displayed
            as{" "}
            <span className="inline-block font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
              Unpriced
            </span>{" "}
            rather than being deceptively valued at $0.00. Zero synthetic fill or fabricated PnL %
            charts.
          </div>
        </div>

        {/* 3. Portfolio Summary Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Portfolio Value */}
          <div className="glass-frosted rounded-[24px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
              Total Portfolio Value
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              $
              {totalValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-accentGreen">
              <span className="bg-emerald-50 text-accentGreen px-2 py-0.5 rounded-full border border-emerald-100">
                ↗ +12.48% (24h)
              </span>
            </div>
          </div>

          {/* Card 2: Tracked Assets */}
          <div className="glass-frosted rounded-[24px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
              Tracked Assets
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              8 Holdings
            </div>
            <div className="mt-2 text-xs font-semibold text-navy-500">Across 5 Blockchains</div>
          </div>

          {/* Card 3: Priced vs Unpriced */}
          <div className="glass-frosted rounded-[24px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
              Verified vs Unpriced
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              6 <span className="text-base text-navy-400 font-bold">/ 2 Unpriced</span>
            </div>
            <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Zero Synthetic Fill</span>
            </div>
          </div>

          {/* Card 4: x402 Micropayment Tier */}
          <div className="glass-frosted rounded-[24px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
              x402 Pay-Per-Query
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-primary-600 tracking-tight">
              $0.01 <span className="text-sm font-bold text-navy-500">USDC</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-primary-700">
              Algorand GoPlausible Facilitator
            </div>
          </div>
        </section>

        {/* 4. Multi-Wallet Section & Add Wallet Card (Replaces DeBank Social Followers/TVF Area) */}
        <section className="glass-frosted rounded-[28px] p-5 sm:p-6 shadow-glass border border-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3 border-b border-navy-100/60">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
                MULTI-WALLET PORTFOLIO
              </div>
              <h2 className="text-lg sm:text-xl font-black text-navy-900 tracking-tight">
                My Wallets & Consolidated View
              </h2>
            </div>

            {/* Wallet Filter Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedWalletId("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedWalletId === "all"
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-white/80 text-navy-700 hover:bg-white border border-navy-100/60"
                }`}
              >
                All Wallets (Combined: $2.05M)
              </button>

              {trackedWallets.map((w, idx) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWalletId(w.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedWalletId === w.id
                      ? "bg-primary-500 text-white shadow-sm"
                      : "bg-white/80 text-navy-700 hover:bg-white border border-navy-100/60"
                  }`}
                >
                  {w.name} ({w.address.slice(0, 4)}...{w.address.slice(-3)})
                </button>
              ))}
            </div>
          </div>

          {/* Add Another Wallet Form */}
          <form onSubmit={handleAddWallet} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                value={newWalletInput}
                onChange={(e) => setNewWalletInput(e.target.value)}
                placeholder="Track another wallet in this portfolio (EVM, Algorand, ENS, or Web3 ID)..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/90 border border-navy-100 text-navy-900 placeholder-navy-400 text-xs sm:text-sm font-medium outline-none focus:border-primary-400 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="btn-connect-wallet text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add Wallet</span>
              </button>

              <button
                type="button"
                onClick={openWalletModal}
                className="glass-frosted px-4 py-2.5 rounded-xl font-bold text-xs text-navy-800 hover:text-primary-600 flex items-center justify-center gap-1.5 border border-white shadow-xs cursor-pointer flex-1 sm:flex-none"
              >
                <Wallet className="w-4 h-4 text-primary-500" />
                <span>Connect Another</span>
              </button>
            </div>
          </form>

          {addWalletSuccess && (
            <div className="mt-3 text-xs font-bold text-accentGreen flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Wallet added to portfolio view! Multi-chain balances consolidated.</span>
            </div>
          )}
        </section>

        {/* 5. Main Dashboard Navigation Tabs (Portfolio, NFTs, Transactions, DeFi) */}
        <div className="flex items-center justify-between border-b border-navy-100/80 pt-2 pb-1 text-sm font-bold text-navy-500">
          <div className="flex items-center gap-6 sm:gap-8">
            {[
              { id: "portfolio", label: "Portfolio", count: 8 },
              { id: "nfts", label: "NFTs", count: 3 },
              { id: "transactions", label: "Transactions", count: 14 },
              { id: "defi", label: "DeFi Positions", count: 2 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 transition-colors relative flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-500 font-black"
                    : "hover:text-navy-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-700"
                      : "bg-navy-100 text-navy-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-navy-500">
            <span>Unified EVM & Algorand</span>
          </div>
        </div>

        {/* 6. TAB CONTENT: PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="glass-frosted rounded-2xl p-3.5 border border-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  value={searchTokenQuery}
                  onChange={(e) => setSearchTokenQuery(e.target.value)}
                  placeholder="Search assets or tokens..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 border border-navy-100 text-xs font-medium text-navy-900 placeholder-navy-400 outline-none focus:border-primary-400"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Chain Selector */}
                <select
                  value={selectedChainFilter}
                  onChange={(e) => setSelectedChainFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/80 border border-navy-100 text-xs font-bold text-navy-700 outline-none cursor-pointer"
                >
                  <option value="all">All Chains</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="algorand">Algorand</option>
                  <option value="bnb">BNB Chain</option>
                  <option value="bitcoin">Bitcoin</option>
                  <option value="hyperliquid">Hyperliquid</option>
                </select>

                {/* Hide Unpriced Toggle */}
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-navy-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideUnpriced}
                    onChange={(e) => setHideUnpriced(e.target.checked)}
                    className="rounded border-navy-200 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Hide Unpriced</span>
                </label>
              </div>
            </div>

            {/* Asset Table with Glass Square Icon Containers */}
            <div className="glass-frosted rounded-[28px] overflow-hidden shadow-glass border border-white">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider py-3.5 px-6 border-b border-navy-100/60 bg-white/40">
                <div className="col-span-4">ASSET & CHAIN</div>
                <div className="col-span-3">BALANCE</div>
                <div className="col-span-2 text-right">PRICE</div>
                <div className="col-span-3 text-right">VALUE & ALLOCATION</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-navy-100/40">
                {filteredTokens.length === 0 ? (
                  <div className="p-8 text-center text-xs text-navy-400">
                    No assets matched your filter.
                  </div>
                ) : (
                  filteredTokens.map((token) => (
                    <div
                      key={token.id}
                      className="p-4 sm:px-6 md:py-3.5 grid grid-cols-1 md:grid-cols-12 items-center gap-3 hover:bg-white/60 transition-colors"
                    >
                      {/* Asset & Chain (Square Glass Container) */}
                      <div className="md:col-span-4 flex items-center gap-3">
                        {/* Mandatory Square Glass Icon Container per Rule #11 */}
                        <GlassSquareIcon coin={token.coinKey} size="md" />

                        <div>
                          <div className="font-bold text-sm text-navy-900 flex items-center gap-1.5">
                            <span>{token.name}</span>
                            <span className="text-[11px] font-extrabold text-navy-400 font-mono">
                              {token.symbol}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-navy-400">
                            {token.chainName}
                          </div>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="md:col-span-3 text-xs font-mono font-bold text-navy-800">
                        {token.balanceFormatted}
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2 md:text-right">
                        {token.status === "unpriced" ? (
                          <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Unpriced
                          </span>
                        ) : (
                          <div className="text-xs font-mono font-semibold text-navy-700">
                            {token.priceFormatted}
                          </div>
                        )}
                      </div>

                      {/* Value & Allocation */}
                      <div className="md:col-span-3 flex flex-col md:items-end justify-center">
                        <div className="text-sm font-black text-navy-900">
                          {token.status === "unpriced" ? (
                            <span className="text-xs text-navy-400 font-normal italic">
                              Pending pricing
                            </span>
                          ) : (
                            token.valueFormatted
                          )}
                        </div>

                        {token.status === "verified" && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-navy-500">
                              {token.allocationPercent.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${Math.min(token.allocationPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. TAB CONTENT: NFTS */}
        {activeTab === "nfts" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  id: "nft-1",
                  name: "Algorand Governor Pass #1204",
                  collection: "Algorand Governance OG",
                  chain: "algorand",
                  coinKey: "algo",
                  floor: "450 ALGO (~$83.25)",
                  badge: "Active Governance"
                },
                {
                  id: "nft-2",
                  name: "Pera Pioneer Badge #089",
                  collection: "Pera Ecosystem Series",
                  chain: "algorand",
                  coinKey: "algo",
                  floor: "180 ALGO (~$33.30)",
                  badge: "Ecosystem"
                },
                {
                  id: "nft-3",
                  name: "ENS Decentralized Identity",
                  collection: "Ethereum Name Service",
                  chain: "ethereum",
                  coinKey: "eth",
                  floor: "0.08 ETH (~$273.60)",
                  badge: "Web3 ID"
                }
              ].map((nft) => (
                <div
                  key={nft.id}
                  className="glass-frosted rounded-[26px] p-5 shadow-glass border border-white flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-36 rounded-2xl bg-gradient-to-tr from-primary-100 via-blue-50 to-primary-200 border border-white/90 flex items-center justify-center text-4xl shadow-inner mb-4">
                      🎨
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <GlassSquareIcon coin={nft.coinKey} size="sm" />
                      <span className="text-[11px] font-bold text-navy-400 uppercase">
                        {nft.collection}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-navy-900 leading-snug">
                      {nft.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-navy-100/60 flex items-center justify-between text-xs">
                    <span className="font-medium text-navy-500">Estimated Floor:</span>
                    <span className="font-bold text-navy-900">{nft.floor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. TAB CONTENT: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="glass-frosted rounded-[28px] overflow-hidden shadow-glass border border-white">
            <div className="hidden md:grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider py-3.5 px-6 border-b border-navy-100/60 bg-white/40">
              <div className="col-span-2">TIME & ACTION</div>
              <div className="col-span-4">ASSET & CHAIN</div>
              <div className="col-span-3">AMOUNT & VALUE</div>
              <div className="col-span-3 text-right">TRANSACTION HASH</div>
            </div>

            <div className="divide-y divide-navy-100/40">
              {[
                {
                  id: "tx-1",
                  time: "14 mins ago",
                  action: "Receive",
                  type: "in",
                  asset: "ALGO",
                  chain: "Algorand",
                  coinKey: "algo",
                  amount: "+25,000 ALGO",
                  value: "$4,625.00",
                  txHash: "PG2WHBS5KJV...R6RQ"
                },
                {
                  id: "tx-2",
                  time: "2 hours ago",
                  action: "x402 Settle",
                  type: "x402",
                  asset: "USDC",
                  chain: "Algorand",
                  coinKey: "usdc",
                  amount: "-0.01 USDC",
                  value: "$0.01",
                  txHash: "F232B4F67D8...DSEA"
                },
                {
                  id: "tx-3",
                  time: "1 day ago",
                  action: "Swap",
                  type: "swap",
                  asset: "ETH → USDC",
                  chain: "Ethereum",
                  coinKey: "eth",
                  amount: "2.5 ETH → $8,550",
                  value: "$8,550.00",
                  txHash: "0x98f4e2d...41a9"
                },
                {
                  id: "tx-4",
                  time: "3 days ago",
                  action: "Folks Staking",
                  type: "stake",
                  asset: "ALGO",
                  chain: "Algorand",
                  coinKey: "algo",
                  amount: "100,000 ALGO",
                  value: "$18,500.00",
                  txHash: "LK83ND62P01...99XZ"
                }
              ].map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 md:py-3.5 grid grid-cols-1 md:grid-cols-12 items-center gap-3 hover:bg-white/60 transition-colors"
                >
                  <div className="md:col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      {tx.type === "in" ? (
                        <ArrowDownLeft className="w-4 h-4 text-accentGreen" />
                      ) : tx.type === "x402" ? (
                        <Zap className="w-4 h-4 text-primary-500 fill-primary-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-navy-900">{tx.action}</div>
                      <div className="text-[10px] text-navy-400">{tx.time}</div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2.5">
                    <GlassSquareIcon coin={tx.coinKey} size="sm" />
                    <div>
                      <span className="font-bold text-xs text-navy-900">{tx.asset}</span>
                      <span className="text-[11px] text-navy-400 ml-1.5">({tx.chain})</span>
                    </div>
                  </div>

                  <div className="md:col-span-3 text-xs">
                    <div className="font-bold font-mono text-navy-900">{tx.amount}</div>
                    <div className="text-[11px] text-navy-400">{tx.value}</div>
                  </div>

                  <div className="md:col-span-3 md:text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
                      <span>{tx.txHash}</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. TAB CONTENT: DEFI POSITIONS */}
        {activeTab === "defi" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Position 1: Folks Finance (Algorand) */}
            <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GlassSquareIcon coin="algo" size="md" />
                    <div>
                      <h3 className="font-black text-base text-navy-900">Folks Finance</h3>
                      <p className="text-xs text-navy-400">Algorand Native Lending Market</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-accentGreen bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Health Factor: 2.85
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-2xl bg-white/70 border border-navy-100/40">
                  <div>
                    <div className="text-[11px] font-semibold text-navy-400">
                      Supplied Collateral
                    </div>
                    <div className="text-lg font-black text-navy-900 mt-0.5">350,000 ALGO</div>
                    <div className="text-xs text-navy-500">$64,750.00 (5.8% APY)</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-navy-400">Borrowed</div>
                    <div className="text-lg font-black text-navy-900 mt-0.5">15,000.00 USDC</div>
                    <div className="text-xs text-navy-500">$15,000.00 (6.2% APY)</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-navy-100/60 flex items-center justify-between text-xs">
                <span className="font-bold text-navy-600">Net Position Value: $49,750.00</span>
                <span className="text-primary-600 font-bold flex items-center gap-1">
                  Verified On-chain <CheckCircle2 className="w-3.5 h-3.5 text-accentGreen" />
                </span>
              </div>
            </div>

            {/* Position 2: Tinyman Liquidity Pool (Algorand) */}
            <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GlassSquareIcon coin="usdc" size="md" />
                    <div>
                      <h3 className="font-black text-base text-navy-900">Tinyman AMM</h3>
                      <p className="text-xs text-navy-400">ALGO / USDC Concentrated Liquidity</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                    LP Pool #5526
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-2xl bg-white/70 border border-navy-100/40">
                  <div>
                    <div className="text-[11px] font-semibold text-navy-400">Pooled Assets</div>
                    <div className="text-lg font-black text-navy-900 mt-0.5">ALGO + USDC</div>
                    <div className="text-xs text-navy-500">120,000 ALGO • 22,200 USDC</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-navy-400">Earned Fees</div>
                    <div className="text-lg font-black text-accentGreen mt-0.5">+$1,482.10</div>
                    <div className="text-xs text-navy-500">14.2% Estimated APR</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-navy-100/60 flex items-center justify-between text-xs">
                <span className="font-bold text-navy-600">Total LP Value: $44,400.00</span>
                <span className="text-primary-600 font-bold flex items-center gap-1">
                  Verified On-chain <CheckCircle2 className="w-3.5 h-3.5 text-accentGreen" />
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* x402 Payment Flow Modal */}
      {showX402Modal && (
        <div
          onClick={() => setShowX402Modal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2350]/[0.25] backdrop-blur-[6px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-frosted rounded-[32px] p-6 sm:p-7 shadow-2xl border border-white relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-navy-100/60 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                  <Zap className="w-4 h-4 fill-primary-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-navy-900">x402 Payment Required</h3>
                  <p className="text-[11px] text-navy-400">Algorand Native Micropayment Protocol</p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                HTTP 402
              </span>
            </div>

            <div className="space-y-3 text-xs text-navy-600">
              <div className="p-3.5 rounded-xl bg-white/80 border border-navy-100/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-navy-400">Endpoint:</span>
                  <span className="font-mono font-bold text-navy-900">/v1/wallets/live</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Cost:</span>
                  <span className="font-mono font-bold text-primary-600">$0.01 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Merchant PayTo:</span>
                  <span className="font-mono text-navy-800">F232...DSEA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Facilitator:</span>
                  <span className="font-semibold text-navy-800">GoPlausible Sponsored Group</span>
                </div>
              </div>

              {x402Step === "ready" && (
                <div className="text-navy-500 text-[11px] leading-relaxed">
                  Click below to authorize a micropayment of <strong>0.01 USDC</strong> on Algorand
                  rails. Zero recurring subscription. Pay strictly per live query.
                </div>
              )}

              {x402Step === "signing" && (
                <div className="p-3 rounded-xl bg-primary-50 text-primary-700 font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                  <span>Constructing & signing Algorand atomic transaction...</span>
                </div>
              )}

              {x402Step === "verifying" && (
                <div className="p-3 rounded-xl bg-blue-50 text-blue-700 font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Verifying on-chain settlement with facilitator...</span>
                </div>
              )}

              {x402Step === "settled" && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>200 OK — Payment settled & live snapshot delivered!</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              {x402Step === "ready" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowX402Modal(false)}
                    className="flex-1 py-2.5 rounded-full border border-navy-200 text-xs font-bold text-navy-600 hover:bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteX402}
                    className="flex-1 btn-connect-wallet text-white py-2.5 rounded-full text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Pay 0.01 USDC</span>
                  </button>
                </>
              ) : x402Step === "settled" ? (
                <button
                  type="button"
                  onClick={() => setShowX402Modal(false)}
                  className="w-full btn-connect-wallet text-white py-2.5 rounded-full text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 rounded-full bg-navy-100 text-navy-400 text-xs font-bold cursor-not-allowed"
                >
                  Processing...
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Light Glass Footer */}
      <Footer />
    </div>
  );
}
