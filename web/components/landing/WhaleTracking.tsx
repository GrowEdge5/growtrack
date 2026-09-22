"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  Loader2,
  Sparkles
} from "lucide-react";
import {
  AlgorandCoinImg,
  BitcoinCoinImg,
  EthereumCoinImg,
  BnbCoinImg,
  SolanaCoinImg,
  CurvedArrowDoodle
} from "./CryptoIcons";
import { GlassSquareIcon } from "@/components/wallet/GlassSquareIcon";
import { analyzeWallet, type AnalyzeResponse } from "@/lib/api";
import { formatUsd, shorten, toWholeUnits, formatRelativeTime } from "@/lib/format";

const VITALIK_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const SATOSHI_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

interface WhaleState {
  data: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
}

export function WhaleTracking() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [vitalik, setVitalik] = useState<WhaleState>({
    data: null,
    loading: true,
    error: null
  });

  const [satoshi, setSatoshi] = useState<WhaleState>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let active = true;

    async function loadWhales() {
      // 1. Vitalik
      try {
        const res = await analyzeWallet(VITALIK_ADDRESS);
        if (active) setVitalik({ data: res, loading: false, error: null });
      } catch (err) {
        if (active) setVitalik({ data: null, loading: false, error: "Unavailable" });
      }

      // 2. Satoshi
      try {
        const res = await analyzeWallet(SATOSHI_ADDRESS);
        if (active) setSatoshi({ data: res, loading: false, error: null });
      } catch (err) {
        if (active) setSatoshi({ data: null, loading: false, error: "Unavailable" });
      }
    }

    void loadWhales();
    return () => {
      active = false;
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <section id="whales" className="relative py-16 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 z-10">
        {/* Section Header */}
        <div className="relative text-center max-w-3xl mx-auto mb-12">
          {/* Hand-drawn annotation "Real Wallets Real Insights" */}
          <div className="hidden lg:flex absolute -right-20 -top-8 flex-col items-center pointer-events-none">
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide -rotate-6 drop-shadow-sm">
              Real Wallets <br /> Real Insights
            </span>
            <CurvedArrowDoodle direction="down-left" className="w-8 h-8 text-primary-500 mt-1" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy-900 tracking-tight">
            Tracking any <span className="text-primary-500">Whale's Portfolio</span>
          </h2>
          <p className="mt-3 text-base sm:text-lg text-navy-500 font-normal">
            Explore real wallet balances, assets, and on-chain activity.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1.5 text-[11px] font-bold text-primary-800 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live on-chain indexed data · Real market valuations</span>
          </div>
        </div>

        {/* Flanking Floating 3D Elements */}
        <div className="hidden xl:block absolute -left-6 top-32 pointer-events-none">
          <div className="glass-coin-tile w-20 h-20 rounded-2xl p-2 flex items-center justify-center transform -rotate-12 pointer-events-auto animate-float-1">
            <AlgorandCoinImg className="w-12 h-12" />
          </div>
        </div>

        <div className="hidden xl:block absolute -right-6 top-40 pointer-events-none">
          <div className="glass-coin-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform rotate-12 pointer-events-auto animate-float-3">
            <SolanaCoinImg className="w-12 h-12" />
          </div>
        </div>

        {/* Detailed Whale Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: vitalik.eth */}
          <WhaleCard
            name="vitalik.eth"
            address={VITALIK_ADDRESS}
            avatarEmoji="🦄"
            avatarGradient="from-indigo-500 to-purple-600"
            chainSlug="ethereum"
            chainLabel="Ethereum (EVM)"
            state={vitalik}
            copiedAddress={copiedAddress}
            onCopy={copyToClipboard}
          />

          {/* Card 2: Satoshi */}
          <WhaleCard
            name="Satoshi"
            address={SATOSHI_ADDRESS}
            avatarEmoji="🪙"
            avatarGradient="from-amber-400 to-orange-600"
            chainSlug="bitcoin"
            chainLabel="Bitcoin (Genesis)"
            state={satoshi}
            copiedAddress={copiedAddress}
            onCopy={copyToClipboard}
          />
        </div>
      </div>
    </section>
  );
}

interface WhaleCardProps {
  name: string;
  address: string;
  avatarEmoji: string;
  avatarGradient: string;
  chainSlug: string;
  chainLabel: string;
  state: WhaleState;
  copiedAddress: string | null;
  onCopy: (text: string) => void;
}

function WhaleCard({
  name,
  address,
  avatarEmoji,
  avatarGradient,
  chainSlug,
  chainLabel,
  state,
  copiedAddress,
  onCopy
}: WhaleCardProps) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const snapshot = state.data?.data;
  const isCopied = copiedAddress === address;

  // Build rows from snapshot: native + tokens
  const rows = React.useMemo(() => {
    if (!snapshot) return [];
    const items: {
      key: string;
      coinKey: string;
      symbol: string;
      name: string;
      amount: string;
      valueUsd?: string;
      allocationPct?: number;
    }[] = [];

    const totalVal = snapshot.totalValueUsd ? Number(snapshot.totalValueUsd) : null;

    // Native row
    const nativeDecimals = chainSlug === "bitcoin" ? 8 : chainSlug === "algorand" ? 6 : 18;
    const nativeAmt = toWholeUnits(snapshot.nativeBalance, nativeDecimals);
    const nativeShare =
      totalVal && snapshot.nativeValueUsd
        ? (Number(snapshot.nativeValueUsd) / totalVal) * 100
        : undefined;

    items.push({
      key: `native-${snapshot.nativeSymbol}`,
      coinKey: snapshot.nativeSymbol.toLowerCase(),
      symbol: snapshot.nativeSymbol,
      name:
        snapshot.nativeSymbol === "ETH"
          ? "Ethereum"
          : snapshot.nativeSymbol === "BTC"
            ? "Bitcoin"
            : snapshot.nativeSymbol,
      amount: `${Number(nativeAmt).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${snapshot.nativeSymbol}`,
      valueUsd: snapshot.nativeValueUsd,
      allocationPct: nativeShare
    });

    // Token rows
    for (const h of snapshot.holdings) {
      const amt = toWholeUnits(h.rawAmount, h.decimals);
      const share = totalVal && h.valueUsd ? (Number(h.valueUsd) / totalVal) * 100 : undefined;
      items.push({
        key: `token-${h.tokenAddress}`,
        coinKey: h.symbol.toLowerCase(),
        symbol: h.symbol,
        name: h.name,
        amount: `${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${h.symbol}`,
        valueUsd: h.valueUsd,
        allocationPct: share
      });
    }

    // Sort: highest value first
    return items.sort((a, b) => {
      if (a.valueUsd === undefined && b.valueUsd === undefined) return 0;
      if (a.valueUsd === undefined) return 1;
      if (b.valueUsd === undefined) return -1;
      return Number(b.valueUsd) - Number(a.valueUsd);
    });
  }, [snapshot, chainSlug]);

  return (
    <div className="glass-frosted rounded-[32px] p-6 sm:p-7 shadow-glass border border-white flex flex-col justify-between hover:shadow-glassHover transition-all duration-300">
      <div>
        {/* Header: User Identity & Total Valuation */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-navy-100/60">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} p-0.5 shadow-md flex items-center justify-center flex-shrink-0`}
            >
              <div className="w-full h-full rounded-[14px] bg-white/95 flex items-center justify-center text-2xl shadow-inner">
                {avatarEmoji}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xl text-navy-900 truncate">{name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-100 text-primary-700 border border-primary-200">
                  {chainLabel}
                </span>
              </div>
              <p className="text-xs text-navy-400 font-mono mt-0.5" title={address}>
                {shortAddress}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider">
              Total Verified Value
            </div>
            {state.loading ? (
              <div className="flex items-center justify-end gap-1.5 text-navy-400 mt-1">
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                <span className="text-sm font-semibold">Reading chain…</span>
              </div>
            ) : snapshot?.totalValueUsd ? (
              <div className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                {formatUsd(snapshot.totalValueUsd)}
              </div>
            ) : (
              <div className="text-lg font-bold text-amber-700">Unpriced</div>
            )}
          </div>
        </div>

        {/* Portfolio Stats Bar (Replaces old social metrics) */}
        <div className="grid grid-cols-3 gap-3 py-3.5 my-3 bg-white/60 rounded-2xl px-4 border border-white/80 text-center">
          <div>
            <div className="text-[10px] font-bold text-navy-400 uppercase">Tracked Assets</div>
            <div className="text-sm font-black text-navy-900 mt-0.5">
              {state.loading ? "—" : `${rows.length} Assets`}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-navy-400 uppercase">Pricing Status</div>
            <div className="text-sm font-black text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {state.loading
                  ? "Checking"
                  : snapshot?.status === "complete"
                    ? "100% Verified"
                    : "Partial"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-navy-400 uppercase">Last Updated</div>
            <div className="text-sm font-black text-navy-900 mt-0.5">
              {snapshot ? formatRelativeTime(snapshot.capturedAt) : "Live"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 my-4">
          <button
            type="button"
            onClick={() => onCopy(address)}
            className="flex-1 btn-connect-wallet text-white py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? "Copied" : "Copy address"}</span>
          </button>
          <Link
            href={`/wallet/${address}`}
            className="flex-1 glass-frosted text-navy-800 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer hover:text-primary-600"
          >
            <span>View Full Dashboard</span>
            <ExternalLink className="w-4 h-4 text-primary-500" />
          </Link>
        </div>

        {/* Asset Allocation Table */}
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="min-w-[340px] space-y-2">
            <div className="grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider pb-1 px-1">
              <div className="col-span-4">ASSET</div>
              <div className="col-span-3">AMOUNT</div>
              <div className="col-span-2 text-right">VALUE</div>
              <div className="col-span-3 text-right">ALLOCATION</div>
            </div>

            {state.loading ? (
              <div className="py-8 text-center text-xs text-navy-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                <span>Fetching live on-chain balances…</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-6 text-center text-xs text-navy-400">
                No active token holdings found on this address.
              </div>
            ) : (
              rows.slice(0, 5).map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-12 items-center text-xs py-2 px-1 border-b border-navy-100/40 last:border-b-0 hover:bg-white/40 rounded-lg transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800 min-w-0">
                    <GlassSquareIcon coin={row.coinKey} size="sm" />
                    <span className="truncate">{row.name}</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium truncate">
                    {row.amount}
                  </div>
                  <div className="col-span-2 text-right font-bold text-navy-900 font-mono">
                    {row.valueUsd ? (
                      formatUsd(row.valueUsd)
                    ) : (
                      <span className="text-amber-600 text-[10px]">Unpriced</span>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px] font-mono min-w-[34px] text-right">
                      {row.allocationPct !== undefined ? `${row.allocationPct.toFixed(1)}%` : "—"}
                    </span>
                    <div className="w-12 h-1.5 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, row.allocationPct ?? 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
