"use client";

import React from "react";
import Link from "next/link";
import {
  Zap,
  Link as LinkIcon,
  Database,
  ShieldCheck,
  BarChart2,
  Wallet,
  Layers,
  FileText,
  Shield,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import {
  AlgorandCoinImg,
  BitcoinCoinImg,
  EthereumCoinImg,
  BnbCoinImg,
  HyperliquidCoinImg,
  CurvedArrowDoodle
} from "./CryptoIcons";

export function Capabilities() {
  return (
    <section id="capabilities" className="relative py-20 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 z-10">
        {/* Section Header */}
        <div className="relative text-center max-w-3xl mx-auto mb-16">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-100/80 border border-primary-200 text-xs font-black text-primary-600 mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-primary-600 fill-primary-600" />
            <span>Capabilities</span>
          </div>

          {/* Doodles "From Data to Decisions" with plenty of clearance from title */}
          <div className="hidden lg:flex absolute -right-24 top-2 xl:-right-28 flex-col items-center pointer-events-none">
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide rotate-6 drop-shadow-sm">
              From Data <br /> to Decisions
            </span>
            <CurvedArrowDoodle direction="down-left" className="w-8 h-8 text-primary-500 mt-1" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-navy-900 tracking-tight leading-[1.15]">
            Built for Real On-Chain Insights. <br />
            <span className="text-primary-500">Powered by Algorand.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-navy-500 font-normal max-w-2xl mx-auto">
            Everything you need to track, analyse, and grow your portfolio across Algorand and EVM
            chains — in one unified view.
          </p>
        </div>

        {/* Flanking Floating 3D Elements */}
        <div className="hidden xl:block absolute -left-8 top-64 pointer-events-none">
          <div className="glass-frosted-tile w-24 h-24 rounded-3xl p-3 flex items-center justify-center transform -rotate-12 pointer-events-auto">
            <AlgorandCoinImg className="w-14 h-14" />
          </div>
        </div>

        <div className="hidden xl:block absolute -right-8 top-72 pointer-events-none">
          <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform rotate-12 pointer-events-auto">
            <div className="w-10 h-10 rounded-xl bg-primary-100/90 border border-primary-300 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Main Grid: 4 Bento Cards on Left + Large Dashboard Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: 4 Bento Cards (2x2) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card 1: Multi-Chain Tracking */}
            <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between hover:shadow-glassHover transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-100/90 flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-navy-400 mb-1">
                  MULTI-CHAIN TRACKING
                </div>
                <h3 className="text-lg font-black text-navy-900 leading-snug">
                  Every Asset Across EVM & Algorand.{" "}
                  <span className="text-primary-500">One Unified View.</span>
                </h3>
                <p className="mt-2.5 text-xs text-navy-500 leading-relaxed">
                  Connect any address to track net worth, token balances, DeFi positions, NFTs and
                  more — without switching networks or wallets.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-navy-100/60">
                <Link
                  href="#portfolio"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group"
                >
                  <span>Explore Tracking</span>
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3 h-3 text-primary-600" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Card 2: Real-Time Data */}
            <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between hover:shadow-glassHover transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-100/90 flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                  <Database className="w-6 h-6" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-navy-400 mb-1">
                  REAL-TIME DATA
                </div>
                <h3 className="text-lg font-black text-navy-900 leading-snug">
                  Live On-Chain Insights. <span className="text-primary-500">No Delays.</span>
                </h3>
                <p className="mt-2.5 text-xs text-navy-500 leading-relaxed">
                  Get real-time portfolio updates, DeFi activity, and transaction history powered by
                  decentralized data sources.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-navy-100/60">
                <Link
                  href="#portfolio"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group"
                >
                  <span>See Live Data</span>
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3 h-3 text-primary-600" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Card 3: Truthful Valuations */}
            <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between hover:shadow-glassHover transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-100/90 flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-navy-400 mb-1">
                  TRUTHFUL VALUATIONS
                </div>
                <h3 className="text-lg font-black text-navy-900 leading-snug">
                  Verified & Transparent Data Only.
                </h3>
                <p className="mt-2.5 text-xs text-navy-500 leading-relaxed">
                  We fetch real on-chain data, no synthetic numbers, no guesswork. Know the real
                  value of your assets with confidence.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-navy-100/60">
                <Link
                  href="#x402"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group"
                >
                  <span>How valuation works</span>
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3 h-3 text-primary-600" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Card 4: x402 Protocol */}
            <div
              id="x402"
              className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex flex-col justify-between hover:shadow-glassHover transition-all duration-300"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-100/90 flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                  <Zap className="w-6 h-6 fill-primary-600" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-navy-400 mb-1">
                  x402 PROTOCOL
                </div>
                <h3 className="text-lg font-black text-navy-900 leading-snug">
                  Intelligence on Demand.
                </h3>
                <p className="mt-2.5 text-xs text-navy-500 leading-relaxed">
                  No recurring subscriptions. Pay per query using x402 and unlock powerful wallet
                  analytics, risk insights, and more.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-navy-100/60">
                <Link
                  href="#x402"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors group"
                >
                  <span>Learn about x402</span>
                  <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3 h-3 text-primary-600" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Large Interactive Analytics Card */}
          <div className="lg:col-span-6 glass-frosted rounded-[32px] p-6 sm:p-8 shadow-glass border border-white flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm flex-shrink-0">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy-900">Same Wallet. More Insights.</h3>
                  <p className="text-xs text-navy-400 mt-0.5">
                    Track, analyse and grow — powered by real on-chain data.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Sample allocation — not live data
                  </span>
                </div>
              </div>

              {/* Donut Chart & Holdings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-4">
                {/* Donut SVG Ring */}
                <div className="sm:col-span-6 relative flex items-center justify-center">
                  <svg
                    className="w-48 h-48 transform -rotate-90 overflow-visible"
                    viewBox="0 0 160 160"
                  >
                    {/* Algorand: 32% */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#00D2B4"
                      strokeWidth="16"
                      strokeDasharray="120.6 256.4"
                      strokeDashoffset="0"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                    {/* Ethereum: 26.6% */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#3B82F6"
                      strokeWidth="16"
                      strokeDasharray="100.2 276.8"
                      strokeDashoffset="-125"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                    {/* Bitcoin: 21.8% */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#F7931A"
                      strokeWidth="16"
                      strokeDasharray="82.1 294.9"
                      strokeDashoffset="-230"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                    {/* BNB: 12.6% */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke="#F3BA2F"
                      strokeWidth="16"
                      strokeDasharray="47.5 329.5"
                      strokeDashoffset="-315"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Inside Center of Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400">
                      Total Value
                    </span>
                    <span className="text-2xl font-black text-navy-900 tracking-tight mt-0.5">
                      $24,819
                    </span>
                    <span className="text-xs font-extrabold text-accentGreen flex items-center gap-0.5 mt-0.5">
                      ↗ +12.4%
                    </span>
                  </div>
                </div>

                {/* Right Holdings List */}
                <div className="sm:col-span-6 space-y-2.5 text-xs font-semibold">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-white/80 hover:bg-white/95 transition-colors">
                    <div className="flex items-center gap-2">
                      <AlgorandCoinImg className="w-5 h-5" />
                      <span className="text-navy-800">Algorand</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-navy-900 font-bold">$7,942.24</span>
                      <span className="text-navy-400 text-[11px]">32.0%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-navy-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-white/80 hover:bg-white/95 transition-colors">
                    <div className="flex items-center gap-2">
                      <EthereumCoinImg className="w-5 h-5" />
                      <span className="text-navy-800">Ethereum</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-navy-900 font-bold">$6,587.00</span>
                      <span className="text-navy-400 text-[11px]">26.6%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-navy-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-white/80 hover:bg-white/95 transition-colors">
                    <div className="flex items-center gap-2">
                      <BitcoinCoinImg className="w-5 h-5" />
                      <span className="text-navy-800">Bitcoin</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-navy-900 font-bold">$5,420.21</span>
                      <span className="text-navy-400 text-[11px]">21.8%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-navy-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-white/80 hover:bg-white/95 transition-colors">
                    <div className="flex items-center gap-2">
                      <BnbCoinImg className="w-5 h-5" />
                      <span className="text-navy-800">BNB Chain</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-navy-900 font-bold">$3,120.55</span>
                      <span className="text-navy-400 text-[11px]">12.6%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-navy-300" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-white/80 hover:bg-white/95 transition-colors">
                    <div className="flex items-center gap-2">
                      <HyperliquidCoinImg className="w-5 h-5" />
                      <span className="text-navy-800">Hyperliquid</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-navy-900 font-bold">$1,749.00</span>
                      <span className="text-navy-400 text-[11px]">7.0%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-navy-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Stat Pills Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 pb-2 border-t border-navy-100/60 text-center">
                <div className="p-2 rounded-xl bg-white/60 border border-white/80">
                  <div className="flex items-center justify-center gap-1 text-primary-500 mb-0.5">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-base font-black text-navy-900">12</div>
                  <div className="text-[10px] font-semibold text-navy-400">Wallets Tracked</div>
                </div>

                <div className="p-2 rounded-xl bg-white/60 border border-white/80">
                  <div className="flex items-center justify-center gap-1 text-primary-500 mb-0.5">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-base font-black text-navy-900">5+</div>
                  <div className="text-[10px] font-semibold text-navy-400">Chains Supported</div>
                </div>

                <div className="p-2 rounded-xl bg-white/60 border border-white/80">
                  <div className="flex items-center justify-center gap-1 text-primary-500 mb-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-base font-black text-navy-900">Real-Time</div>
                  <div className="text-[10px] font-semibold text-navy-400">Data Updates</div>
                </div>

                <div className="p-2 rounded-xl bg-white/60 border border-white/80">
                  <div className="flex items-center justify-center gap-1 text-primary-500 mb-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-base font-black text-navy-900">100%</div>
                  <div className="text-[10px] font-semibold text-navy-400">Non-Custodial</div>
                </div>
              </div>
            </div>

            {/* Bottom Primary CTA */}
            <div className="mt-6 pt-2">
              <Link
                href="#portfolio"
                className="w-full btn-connect-wallet text-white py-3.5 rounded-full font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Tracking Your Portfolio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Doodles */}
        <div className="flex items-center justify-between mt-10 pt-2 px-4 pointer-events-none">
          <div className="hidden sm:flex items-center gap-2">
            <CurvedArrowDoodle direction="right" className="w-8 h-8 text-primary-500 -rotate-12" />
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide drop-shadow-sm">
              Track Everything.
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide drop-shadow-sm">
              Grow Further.
            </span>
            <CurvedArrowDoodle direction="left" className="w-8 h-8 text-primary-500 rotate-12" />
          </div>
        </div>
      </div>
    </section>
  );
}
