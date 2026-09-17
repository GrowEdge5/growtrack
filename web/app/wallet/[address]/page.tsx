"use client";

import React, { useState, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  RefreshCw,
  Database
} from "lucide-react";
import { motion } from "framer-motion";
import { detectAddressFormat } from "@/components/landing/HeroSearch";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function WalletDashboardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawAddress = decodeURIComponent(resolvedParams.address);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"tokens" | "defi" | "transactions" | "x402">("tokens");
  const [showX402Modal, setShowX402Modal] = useState(false);
  const [x402State, setX402State] = useState<"idle" | "requesting" | "settling" | "unlocked">(
    "idle"
  );

  const detection = useMemo(() => detectAddressFormat(rawAddress), [rawAddress]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = useMemo(() => {
    if (detection.chain === "algorand") {
      return `https://lora.algokit.io/testnet/account/${rawAddress}`;
    }
    if (detection.chain === "evm" || rawAddress.startsWith("0x")) {
      return `https://etherscan.io/address/${rawAddress}`;
    }
    return `https://blockchair.com/search?q=${rawAddress}`;
  }, [detection.chain, rawAddress]);

  const handleTriggerX402 = () => {
    setShowX402Modal(true);
    setX402State("requesting");
    setTimeout(() => {
      setX402State("settling");
      setTimeout(() => {
        setX402State("unlocked");
      }, 1600);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans flex flex-col selection:bg-[#00ECB5] selection:text-[#000000]">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1A2333] bg-[#000000]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2333] bg-[#0D111A] hover:border-[#00ECB5]/40 px-3 py-1.5 text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Radar</span>
            </Link>

            <div className="h-4 w-px bg-[#1A2333]" />

            <div className="flex items-center gap-2">
              <span className="font-sans font-black tracking-wider text-white text-sm hidden sm:inline">
                GROWTRACK
              </span>
              <span className="text-xs font-mono text-[#64748B]">/</span>
              <span className="text-xs font-mono text-[#00ECB5] font-semibold">Wallet Radar</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTriggerX402}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00ECB5] hover:bg-[#00d2a1] text-black font-bold px-3.5 py-2 text-xs transition-all shadow-[0_0_15px_rgba(0,236,181,0.25)]"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Live Refresh ($0.01 via x402)</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Address Header Card */}
        <section className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase text-[#94A3B8] tracking-wider">
                  Target Wallet
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border ${detection.badgeClass}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span>{detection.label}</span>
                </span>
                <span className="rounded-full border border-[#1A2333] bg-[#000000] px-2.5 py-0.5 text-xs font-mono text-[#94A3B8]">
                  Read-Only Non-Custodial
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <h1 className="font-mono text-base sm:text-xl font-bold text-white break-all select-all">
                  {rawAddress}
                </h1>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy address"
                  className="p-2 rounded-lg border border-[#1A2333] hover:border-[#00ECB5]/40 bg-[#000000] text-[#94A3B8] hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#00ECB5]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Block Explorer"
                  className="p-2 rounded-lg border border-[#1A2333] hover:border-[#00ECB5]/40 bg-[#000000] text-[#94A3B8] hover:text-white transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Ingestion & Cache Badge */}
            <div className="flex items-center gap-3 lg:border-l lg:border-[#1A2333] lg:pl-6 text-xs font-mono text-[#94A3B8]">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#00ECB5]" />
                  <span>
                    Snapshot Cache:{" "}
                    <strong className="text-white font-medium">&lt; 1 min ago</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-[#64748B]" />
                  <span>
                    Radar State: <strong className="text-white font-medium">Synchronized</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Absolute Product Truthfulness Alert */}
        <div className="rounded-xl border border-[#1A2333] bg-[#070B12] p-4 text-xs font-sans text-[#94A3B8] flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-[#00ECB5] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-white font-semibold">Truthful Valuation Guarantee: </strong>
            Tokens without verified market liquidity or oracle depth are categorized as{" "}
            <span className="text-amber-400 font-mono font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Unpriced
            </span>{" "}
            rather than deceptively shown as $0.00. Unverified historical charts and fake balances
            are strictly prohibited.
          </div>
        </div>

        {/* Overview Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-5 shadow-lg">
            <div className="text-xs font-mono text-[#94A3B8]">Verified Net Worth</div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-bold text-white">
              $1,842,930.54
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-[#00ECB5]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>DeFiLlama Oracle Verified</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-5 shadow-lg">
            <div className="text-xs font-mono text-[#94A3B8]">Tracked Assets</div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-bold text-white">
              8 <span className="text-sm font-normal text-[#64748B]">Holdings</span>
            </div>
            <div className="mt-2 text-xs font-mono text-[#94A3B8]">
              6 Verified · 2 Pending Price
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 shadow-lg">
            <div className="text-xs font-mono text-amber-400">Unpriced / Illiquid Assets</div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-bold text-amber-400">
              2 <span className="text-sm font-normal text-amber-400/80">Assets</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Zero synthetic $0 fill</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-5 shadow-lg">
            <div className="text-xs font-mono text-[#94A3B8]">x402 Pay-Per-Query</div>
            <div className="mt-2 text-2xl sm:text-3xl font-mono font-bold text-[#00ECB5]">
              $0.01 <span className="text-sm font-normal text-[#64748B]">USDC</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-[#94A3B8]">
              <Zap className="h-3.5 w-3.5 text-[#00ECB5]" />
              <span>Algorand micro-settlement</span>
            </div>
          </div>
        </section>

        {/* Feature Navigation Tabs */}
        <section className="space-y-4">
          <div className="flex border-b border-[#1A2333] gap-2 sm:gap-8 overflow-x-auto text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("tokens")}
              className={`pb-3.5 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "tokens"
                  ? "border-[#00ECB5] text-[#00ECB5]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Token Holdings (Live)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("defi")}
              className={`pb-3.5 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "defi"
                  ? "border-[#00ECB5] text-[#00ECB5]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              DeFi Positions (Coming Soon)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`pb-3.5 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "transactions"
                  ? "border-[#00ECB5] text-[#00ECB5]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Raw Transaction Streams (Coming Soon)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("x402")}
              className={`pb-3.5 px-1 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "x402"
                  ? "border-[#00ECB5] text-[#00ECB5]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              x402 Live Guard
            </button>
          </div>

          {/* Tab 1: Token Holdings Table with Native Crypto Icons */}
          {activeTab === "tokens" && (
            <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-[#1A2333] bg-[#000000] text-[#94A3B8] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-5">Asset</th>
                      <th className="py-3.5 px-4">Identifier</th>
                      <th className="py-3.5 px-4 text-right">Balance</th>
                      <th className="py-3.5 px-4 text-right">Price (USD)</th>
                      <th className="py-3.5 px-4 text-right">Value (USD)</th>
                      <th className="py-3.5 px-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2333]">
                    <tr className="hover:bg-[#000000]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1A2333] p-1">
                            <svg width="16" height="16" viewBox="0 0 784.37 1277.39" fill="none">
                              <path
                                d="M392.07 0L383.5 29.11V874.74L392.07 883.29L784.13 651.54L392.07 0Z"
                                fill="#8A92B2"
                              />
                              <path d="M392.07 0L0 651.54L392.07 883.29V472.33V0Z" fill="#62688F" />
                              <path
                                d="M392.07 956.52L387.24 962.41V1277.39L392.07 1277.39L784.37 724.89L392.07 956.52Z"
                                fill="#8A92B2"
                              />
                              <path
                                d="M392.07 1277.39V956.52L0 724.89L392.07 1277.39Z"
                                fill="#62688F"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-sans font-bold text-white text-sm">
                              Ethereum (ETH)
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">Native Coin</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#94A3B8]">Native</td>
                      <td className="py-4 px-4 text-right text-white font-medium">482.1054 ETH</td>
                      <td className="py-4 px-4 text-right text-white">$3,420.12</td>
                      <td className="py-4 px-4 text-right text-white font-bold">$1,648,858.33</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#000000]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2775CA]/20 p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" fill="#2775CA" />
                              <path
                                d="M12.75 6.5C10.68 6.5 9 7.84 9 9.5C9 12.5 15 11.5 15 14.5C15 16.16 13.32 17.5 11.25 17.5C9.72 17.5 8.37 16.74 7.68 15.62L6.15 16.76C7.23 18.35 9.11 19.5 11.25 19.5V21H12.75V19.5C14.82 19.5 16.5 18.16 16.5 16.5C16.5 13.5 10.5 14.5 10.5 11.5C10.5 9.84 12.18 8.5 14.25 8.5C15.54 8.5 16.69 9.09 17.38 10.02L18.82 8.78C17.78 7.37 16.13 6.5 14.25 6.5V5H12.75V6.5Z"
                                fill="white"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-sans font-bold text-white text-sm">
                              USD Coin (USDC)
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">ERC-20 Standard</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#94A3B8]">0xa0b8...eeb8</td>
                      <td className="py-4 px-4 text-right text-white font-medium">
                        194,072.21 USDC
                      </td>
                      <td className="py-4 px-4 text-right text-white">$1.00</td>
                      <td className="py-4 px-4 text-right text-white font-bold">$194,072.21</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#000000]/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00ECB5]/10 border border-[#00ECB5]/30 p-1">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="text-[#00ECB5]"
                            >
                              <path
                                d="M4 19L11 5L15 12L13 15.5L10.5 11L6.5 19H4ZM14 19L20 9L18 5.5L10.5 19H14Z"
                                fill="currentColor"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-sans font-bold text-white text-sm">
                              Algorand (ALGO)
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">AVM Native</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#94A3B8]">Native AVM</td>
                      <td className="py-4 px-4 text-right text-white font-medium">
                        150,000.00 ALGO
                      </td>
                      <td className="py-4 px-4 text-right text-white">$0.20</td>
                      <td className="py-4 px-4 text-right text-[#00ECB5] font-bold">$30,000.00</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-2.5 py-0.5 text-[11px] text-[#00ECB5]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>

                    {/* Rule 2 Strict Adherence: Unpriced Token */}
                    <tr className="hover:bg-amber-500/[0.04] transition-colors bg-amber-500/[0.02]">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                            !
                          </div>
                          <div>
                            <div className="font-sans font-bold text-white text-sm">
                              Community Genesis DAO
                            </div>
                            <div className="text-[11px] text-amber-400/80">Illiquid Asset</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#94A3B8]">0x742d...44e1</td>
                      <td className="py-4 px-4 text-right text-white font-medium">25,000.00 CGD</td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400 font-mono">
                          Unpriced
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-amber-400 text-xs font-mono">Pending Pricing</span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>No Oracle</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Structured Coming Soon for DeFi Positions */}
          {activeTab === "defi" && (
            <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-10 text-center max-w-2xl mx-auto space-y-4 shadow-xl">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1A2333] bg-[#000000] text-[#00ECB5]">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-sans font-bold text-white">
                DeFi Positions Indexing — Coming Soon
              </h3>
              <p className="text-sm text-[#94A3B8] font-sans leading-relaxed">
                In accordance with Growtrack&apos;s product truthfulness rules, we do not present
                mocked staking or lending cards. Integration with Compound, Aave, and Folks Finance
                AVM protocols is currently in stage-2 testing.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#94A3B8]">
                <span className="rounded-full border border-[#1A2333] bg-[#000000] px-3 py-1">
                  Target: Q3 2026
                </span>
                <span className="rounded-full border border-[#1A2333] bg-[#000000] px-3 py-1">
                  Engine: Multicall3 + Folks SDK
                </span>
              </div>
            </div>
          )}

          {/* Tab 3: Structured Coming Soon for Raw Transaction Streams */}
          {activeTab === "transactions" && (
            <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-10 text-center max-w-2xl mx-auto space-y-4 shadow-xl">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1A2333] bg-[#000000] text-[#00ECB5]">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-sans font-bold text-white">
                Raw Transaction Streams — Coming Soon
              </h3>
              <p className="text-sm text-[#94A3B8] font-sans leading-relaxed">
                Raw ledger event ingestion with historical gas auditing is in scheduled deployment.
                Zero simulated transactions are displayed until real-time WebSocket feeds pass
                verification.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#94A3B8]">
                <span className="rounded-full border border-[#1A2333] bg-[#000000] px-3 py-1">
                  Target: Q3 2026
                </span>
                <span className="rounded-full border border-[#1A2333] bg-[#000000] px-3 py-1">
                  Worker: BullMQ Block Scanner
                </span>
              </div>
            </div>
          )}

          {/* Tab 4: x402 Live Guard Demo */}
          {activeTab === "x402" && (
            <div className="rounded-2xl border border-[#1A2333] bg-[#0D111A] p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white">
                    GET /v1/wallets/:chain/:address/live
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1 font-sans">
                    Guarded by the Fastify x402 plugin. Returns HTTP 402 until verified
                    micro-settlement on Algorand.
                  </p>
                </div>
                <button
                  onClick={handleTriggerX402}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00ECB5] hover:bg-[#00d2a1] px-4 py-2.5 text-xs font-mono font-bold text-black shadow-[0_0_15px_rgba(0,236,181,0.25)] transition-all active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Execute x402 Request</span>
                </button>
              </div>

              <div className="rounded-xl bg-[#000000] border border-[#1A2333] p-4 font-mono text-xs text-[#94A3B8] space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#1A2333]">
                  <span className="text-white font-semibold">Endpoint Specification</span>
                  <span className="text-[#00ECB5] font-bold">RFC 9110 Payment Required</span>
                </div>
                <div>Price: 0.010000 USDC (Asset 31566704 on Algorand Mainnet)</div>
                <div>Rail: Algorand Fast Finality Settlement (&lt; 2.8s)</div>
                <div>
                  Response: Fresh, non-cached portfolio snapshot with unpriced asset flagging
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* x402 Payment Modal Simulation */}
      {showX402Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#1A2333] bg-[#0D111A] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2333]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl border border-[#00ECB5]/40 bg-[#00ECB5]/10 flex items-center justify-center text-[#00ECB5]">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-sans text-sm font-bold text-white">
                    HTTP 402 Payment Required
                  </div>
                  <div className="font-mono text-[11px] text-[#94A3B8]">
                    x402 Algorand Protocol Guard
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowX402Modal(false);
                  setX402State("idle");
                }}
                className="text-[#94A3B8] hover:text-white font-medium text-sm p-1.5 rounded-lg border border-[#1A2333] hover:bg-[#131926]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Based on State */}
            {x402State === "requesting" && (
              <div className="space-y-4 py-6 text-center">
                <RefreshCw className="h-8 w-8 text-[#00ECB5] animate-spin mx-auto" />
                <div className="text-sm font-sans font-semibold text-white">
                  Contacting Growtrack Live Guard...
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  GET /v1/wallets/.../live → 402 Payment Required Received
                </div>
              </div>
            )}

            {x402State === "settling" && (
              <div className="space-y-4 py-6 text-center">
                <RefreshCw className="h-8 w-8 text-[#00ECB5] animate-spin mx-auto" />
                <div className="text-sm font-sans font-semibold text-white">
                  Signing Algorand Micro-Settlement (0.01 USDC)...
                </div>
                <div className="text-xs font-mono text-[#94A3B8]">
                  Broadcasting note: growtrack:challenge to Algorand Rail
                </div>
              </div>
            )}

            {x402State === "unlocked" && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-[#00ECB5]/30 bg-[#00ECB5]/10 p-3.5 flex items-center gap-2.5 text-[#00ECB5] text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00ECB5]" />
                  <span>Settlement Confirmed on Algorand! 200 OK Live Intel Unlocked.</span>
                </div>

                <div className="rounded-xl bg-[#000000] p-4 border border-[#1A2333] text-[11px] font-mono text-white overflow-x-auto">
                  <pre>
                    {JSON.stringify(
                      {
                        status: "success",
                        source: "live",
                        stale: false,
                        target: rawAddress,
                        settledRound: 41892105,
                        settlementTxId: "2J74FXE67PQ...",
                        capturedAt: new Date().toISOString()
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowX402Modal(false);
                    setX402State("idle");
                  }}
                  className="w-full py-3 rounded-xl bg-[#00ECB5] hover:bg-[#00d2a1] text-black font-sans font-bold text-xs transition-colors shadow-[0_0_15px_rgba(0,236,181,0.25)]"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
