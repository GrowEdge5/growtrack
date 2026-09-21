"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wallet, BarChart3, Globe, AlertCircle, CheckCircle2 } from "lucide-react";

import { useWalletModal } from "@/context/WalletModalContext";
import { AnimatedChainText } from "./AnimatedChainText";
import { detectAddressFormat } from "@/lib/address";
import {
  BrandLogoIcon,
  AlgorandCoinImg,
  BnbCoinImg,
  EthereumCoinImg,
  HyperliquidCoinImg,
  BitcoinCoinImg,
  CurvedArrowDoodle
} from "./CryptoIcons";

export function Hero() {
  const router = useRouter();
  const { openWalletModal } = useWalletModal();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const detection = useMemo(() => detectAddressFormat(address), [address]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = address.trim();

    // An empty search must not silently analyse someone else's wallet: the user
    // asked for nothing, so they are told that rather than navigated somewhere
    // unrelated.
    if (query.length === 0) {
      setError("Enter a wallet address to analyse.");
      return;
    }
    if (!detection.isValid) {
      setError(detection.hint);
      return;
    }

    setError(null);
    router.push(`/wallet/${encodeURIComponent(query)}`);
  };

  return (
    <section id="portfolio" className="relative pt-2 sm:pt-4 pb-12 sm:pb-16 overflow-hidden">
      {/* Subtle background grid */}
      <div className="subtle-bg-grid absolute inset-0 pointer-events-none z-0" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 z-10">
        {/* Main Front-Facing Dashboard Showcase with Floating Coin Tiles */}
        <div className="relative mx-auto max-w-5xl pt-1 pb-4 flex items-center justify-center">
          {/* Left Floating Doodles & Glass Coin Tiles: 1. Algorand, 2. Bitcoin, 3. Ethereum */}
          <div className="hidden lg:block absolute -left-4 xl:-left-12 top-2 w-60 z-20 pointer-events-none">
            {/* Callout: "All Chains One View" with comfortable breathing room */}
            <div className="flex items-center gap-2 mb-3 ml-2">
              <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide -rotate-6 drop-shadow-sm">
                All Chains <br /> One View
              </span>
              <CurvedArrowDoodle direction="down-right" className="w-8 h-8 text-primary-500 mt-1" />
            </div>

            {/* Tile 1: Algorand (Large Floating Tile) */}
            <div className="glass-frosted-tile w-24 h-24 rounded-3xl p-3 flex items-center justify-center transform -rotate-12 hover:rotate-0 pointer-events-auto shadow-md">
              <AlgorandCoinImg className="w-14 h-14" />
            </div>

            {/* Tile 2: Bitcoin (Smaller Floating Tile near Left) */}
            <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform rotate-6 translate-x-14 -translate-y-4 hover:rotate-0 pointer-events-auto shadow-md">
              <BitcoinCoinImg className="w-12 h-12" />
            </div>

            {/* Tile 3: Ethereum (Third Left Floating Tile per User Correction) */}
            <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform -rotate-6 translate-x-6 translate-y-3 hover:rotate-0 pointer-events-auto shadow-md">
              <EthereumCoinImg className="w-13 h-13" />
            </div>
          </div>

          {/* Right Floating Doodles & Glass Coin Tiles: 1. Hyperliquid, 2. BNB, 3. Dots */}
          <div className="hidden lg:block absolute -right-4 xl:-right-12 top-0 w-60 z-20 pointer-events-none">
            {/* Callout: "More Possibilities" with comfortable breathing room */}
            <div className="flex items-center justify-end gap-2 mb-3 mr-2">
              <CurvedArrowDoodle direction="down-left" className="w-8 h-8 text-primary-500 mt-1" />
              <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide rotate-6 drop-shadow-sm">
                More <br /> Possibilities
              </span>
            </div>

            {/* Tile 1: Hyperliquid (Clean HYPE mark, NO dark background, sitting cleanly in glass tile) */}
            <div className="glass-frosted-tile w-24 h-24 rounded-3xl p-3 flex items-center justify-center transform rotate-12 ml-auto hover:rotate-0 pointer-events-auto shadow-md">
              <HyperliquidCoinImg className="w-14 h-11" />
            </div>

            {/* Tile 2: BNB (Smaller Floating Tile near Right Side) */}
            <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform -rotate-6 -translate-x-8 -translate-y-3 hover:rotate-0 pointer-events-auto shadow-md">
              <BnbCoinImg className="w-12 h-12" />
            </div>

            {/* Tile 3: Three Dots Tile */}
            <div className="glass-frosted-tile w-16 h-16 rounded-2xl p-2 flex items-center justify-center transform rotate-6 -translate-x-2 translate-y-2 hover:rotate-0 pointer-events-auto shadow-md">
              <div className="flex gap-1.5 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary-300" />
              </div>
            </div>
          </div>

          {/* Central Front-Facing Glass Dashboard.
              The figures in this preview are a fixed illustration of the product's
              layout, NOT live data and not any particular wallet — the label below
              says so, because unlabelled sample numbers read as a real portfolio. */}
          <div className="w-full max-w-2xl glass-frosted rounded-[30px] p-4 sm:p-5 shadow-glass border border-white/90 relative z-10">
            {/* Dashboard Window Header */}
            <div className="flex items-center justify-between pb-3 border-b border-navy-100/60 mb-3.5">
              <div className="flex items-center gap-2.5">
                <BrandLogoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="font-bold text-sm text-navy-900 tracking-tight">Growtrack</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-500 bg-white/80 border border-navy-100/70 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-accentOrange" />
                  Sample layout
                </span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-100/80 border border-primary-200 flex items-center justify-center text-[10px] font-bold text-primary-700">
                  👤
                </div>
              </div>
            </div>

            {/* Dashboard Inner Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Column: Total Value & Area Chart */}
              <div className="md:col-span-7 bg-white/70 rounded-2xl p-3 sm:p-3.5 border border-white/85 shadow-sm">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-navy-400">
                  Total Portfolio Value
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-navy-900 tracking-tight">
                    $24,532.18
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                    illustrative
                  </span>
                </div>

                {/* Decorative chart shape. It is not derived from any wallet's history,
                    so it is not presented as growth. */}
                <div className="relative mt-3 h-24 sm:h-26 w-full">
                  {/* Floating tooltip */}
                  <div className="absolute top-1 right-2 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-xl shadow-md border border-primary-100 text-[10px] font-semibold text-navy-500 flex items-center gap-1.5 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-300" />
                    <span>Example layout, not live data</span>
                  </div>

                  {/* SVG Chart */}
                  <svg viewBox="0 0 300 95" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,76 Q 40,62 70,71 T 140,52 T 210,38 T 260,26 T 300,42 L 300,95 L 0,95 Z"
                      fill="url(#heroAreaGrad)"
                    />
                    <path
                      d="M 0,76 Q 40,62 70,71 T 140,52 T 210,38 T 260,26 T 300,42"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="260"
                      cy="26"
                      r="4"
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Right Column: Asset Breakdown Table with 20% larger logos */}
              <div className="md:col-span-5 bg-white/70 rounded-2xl p-3 sm:p-3.5 border border-white/85 shadow-sm space-y-2 text-xs">
                {/* 1. Algorand */}
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <AlgorandCoinImg className="w-5 h-5" />
                    <span className="text-navy-900 font-bold">Algorand</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy-900 font-bold">$8,420.21</span>
                    <span className="text-navy-400 text-[10px] ml-1">34.3%</span>
                  </div>
                </div>

                {/* 2. Bitcoin */}
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <BitcoinCoinImg className="w-5 h-5" />
                    <span className="text-navy-900 font-bold">Bitcoin</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy-900 font-bold">$5,210.32</span>
                    <span className="text-navy-400 text-[10px] ml-1">21.2%</span>
                  </div>
                </div>

                {/* 3. Ethereum */}
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <EthereumCoinImg className="w-5 h-5" />
                    <span className="text-navy-900 font-bold">Ethereum</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy-900 font-bold">$3,891.14</span>
                    <span className="text-navy-400 text-[10px] ml-1">15.9%</span>
                  </div>
                </div>

                {/* 4. BNB Chain */}
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <BnbCoinImg className="w-5 h-5" />
                    <span className="text-navy-900 font-bold">BNB Chain</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy-900 font-bold">$2,340.55</span>
                    <span className="text-navy-400 text-[10px] ml-1">9.5%</span>
                  </div>
                </div>

                {/* 5. Hyperliquid */}
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <HyperliquidCoinImg className="w-5 h-5" />
                    <span className="text-navy-900 font-bold">Hyperliquid</span>
                  </div>
                  <div className="text-right">
                    <span className="text-navy-900 font-bold">$1,120.18</span>
                    <span className="text-navy-400 text-[10px] ml-1">4.1%</span>
                  </div>
                </div>

                <div className="pt-1.5 text-center border-t border-navy-100/60">
                  <span className="text-[10px] font-medium text-navy-400">
                    Ethereum · Algorand · Solana · Bitcoin
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Headline (New 2-Part Animated Headline per User Requirements) */}
        <div className="text-center max-w-3xl mx-auto mt-4 sm:mt-5 mb-3 sm:mb-4">
          {/* First Line: Main bold headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy-900 tracking-tight leading-tight">
            Grow Your Portfolio with <span className="text-primary-500">Real Data.</span>
          </h1>

          {/* Second Line: Animated typing chain name */}
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy-900 tracking-tight mt-1 flex items-center justify-center gap-2 flex-wrap">
            <span>Track Across</span>
            <AnimatedChainText />
          </div>

          <p className="mt-2 text-xs sm:text-sm text-navy-500 max-w-xl mx-auto font-normal">
            Multi-chain portfolio tracking, DeFi insights, NFTs, and real-time data — powered by
            x402.
          </p>
        </div>

        {/* Search & Connect Bar (Visible above the fold without scrolling) */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSearch}
            className="glass-frosted p-1.5 sm:p-2 rounded-full flex items-center shadow-glass border border-white"
          >
            <div className="flex-1 flex items-center pl-3 sm:pl-4 pr-2 min-w-0">
              <input
                id="search-input"
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (error !== null) setError(null);
                }}
                placeholder="Search address/Web3 ID"
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-transparent text-navy-900 placeholder-navy-400 text-xs sm:text-base outline-none font-mono"
              />
            </div>

            {/* Blue Glass Search Button */}
            <button
              type="submit"
              aria-label="Search"
              className="logo-search-glass w-9 h-9 sm:w-11 sm:h-11 rounded-[14px] flex items-center justify-center text-white mr-1.5 sm:mr-2 cursor-pointer hover:scale-105 transition-transform flex-shrink-0 shadow-sm"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Connect Wallet Button (Desktop & Tablet) */}
            <button
              type="button"
              onClick={() => openWalletModal()}
              className="hidden sm:flex btn-connect-wallet text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base items-center gap-2 cursor-pointer flex-shrink-0 shadow-xs whitespace-nowrap"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </form>

          {/* Live format feedback: the address family is recognized as it is typed, so
              a malformed paste is caught before it becomes a request. */}
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium min-h-[1.25rem] px-2 text-center">
            {error !== null ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </span>
            ) : address.trim().length > 0 ? (
              <span
                className={`inline-flex items-center gap-1.5 ${
                  detection.isValid ? "text-accentGreen" : "text-amber-700"
                }`}
              >
                {detection.isValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>
                  {detection.label} — {detection.hint}
                </span>
              </span>
            ) : (
              <span className="text-navy-400">
                One wallet is free to look up — no wallet connection needed.
              </span>
            )}
          </div>

          {/* Under Search Prompt & Carousel Indicator */}
          <div className="mt-2.5 text-center">
            <div className="text-xs sm:text-sm font-semibold text-navy-800 tracking-tight">
              enter address and see the power of x402
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="w-5 h-1.5 rounded-full bg-navy-200" />
              <span className="w-8 h-1.5 rounded-full bg-primary-500" />
              <span className="w-5 h-1.5 rounded-full bg-navy-200" />
            </div>
          </div>
        </div>

        {/* Bottom Corner Floating Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 sm:mt-6 pt-2">
          <div className="glass-frosted px-3.5 py-2 rounded-2xl flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-navy-700 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
            <BarChart3 className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span>Real Data. Real Decisions.</span>
          </div>

          <div className="glass-frosted px-3.5 py-2 rounded-2xl flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-navy-700 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
            <Globe className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span>Track. Analyse. Grow.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
