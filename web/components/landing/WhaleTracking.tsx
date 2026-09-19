"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Calendar,
  Trophy,
  ExternalLink,
  ChevronDown,
  Info,
  HelpCircle,
  Users
} from "lucide-react";
import {
  AlgorandCoinImg,
  BitcoinCoinImg,
  EthereumCoinImg,
  BnbCoinImg,
  HyperliquidCoinImg,
  CurvedArrowDoodle
} from "./CryptoIcons";

export function WhaleTracking() {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [activeTabLeft, setActiveTabLeft] = useState("Portfolio");
  const [activeTabRight, setActiveTabRight] = useState("Portfolio");
  const [followedWhales, setFollowedWhales] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const toggleFollow = (name: string) => {
    setFollowedWhales((prev) => ({ ...prev, [name]: !prev[name] }));
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
            Enter any wallet address and get a complete, real-time view across all chains.
          </p>
        </div>

        {/* Flanking Floating 3D Elements */}
        <div className="hidden xl:block absolute -left-6 top-32 pointer-events-none">
          <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2 flex items-center justify-center transform -rotate-12 pointer-events-auto">
            <AlgorandCoinImg className="w-12 h-12" />
          </div>
        </div>

        <div className="hidden xl:block absolute -right-6 top-40 pointer-events-none">
          <div className="glass-frosted-tile w-20 h-20 rounded-2xl p-2.5 flex items-center justify-center transform rotate-12 pointer-events-auto">
            <Users className="w-9 h-9 text-primary-500" />
          </div>
        </div>

        {/* Top Mini Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Mini Card 1: nmstarchild */}
          <div className="glass-frosted rounded-[26px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-2xl">
                    🎩
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-navy-900 leading-tight">
                    nmstarchild
                  </h3>
                  <p className="text-xs text-navy-400 font-mono mt-0.5">0x7b1...e2d6</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                  $210,873
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-navy-100/60 text-xs text-navy-600">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-primary-500" /> TVF{" "}
                <strong className="text-navy-900 font-bold">$936.1M</strong>
              </span>
              <span>•</span>
              <span className="font-medium">
                Followers <strong className="text-navy-900 font-bold">14.1k</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-navy-400" /> Earnings{" "}
                <strong className="text-navy-900 font-bold">2,195.8</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-navy-400">
              <span className="font-medium text-navy-500">Major assets</span>
              <div className="flex items-center gap-1.5 ml-2">
                <EthereumCoinImg className="w-5 h-5" />
                <AlgorandCoinImg className="w-5 h-5" />
                <BitcoinCoinImg className="w-5 h-5" />
                <HyperliquidCoinImg className="w-5 h-5" />
                <BnbCoinImg className="w-5 h-5" />
                <span className="text-[11px] font-bold text-navy-500 bg-white/80 border border-navy-100 px-1.5 py-0.5 rounded-md">
                  +3
                </span>
              </div>
            </div>
          </div>

          {/* Mini Card 2: an0n */}
          <div className="glass-frosted rounded-[26px] p-5 shadow-glass border border-white flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-navy-900 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full rounded-[14px] bg-navy-900 flex items-center justify-center text-2xl">
                    🥷
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-navy-900 leading-tight">an0n</h3>
                  <p className="text-xs text-navy-400 font-mono mt-0.5">0x7bfe...c060</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                  $33,389,759
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-navy-100/60 text-xs text-navy-600">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-primary-500" /> TVF{" "}
                <strong className="text-navy-900 font-bold">$2.2B</strong>
              </span>
              <span>•</span>
              <span className="font-medium">
                Followers <strong className="text-navy-900 font-bold">70.3k</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-navy-400" /> Earnings{" "}
                <strong className="text-navy-900 font-bold">1,864.4</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-navy-400">
              <span className="font-medium text-navy-500">Major assets</span>
              <div className="flex items-center gap-1.5 ml-2">
                <EthereumCoinImg className="w-5 h-5" />
                <AlgorandCoinImg className="w-5 h-5" />
                <BitcoinCoinImg className="w-5 h-5" />
                <HyperliquidCoinImg className="w-5 h-5" />
                <BnbCoinImg className="w-5 h-5" />
                <span className="text-[11px] font-bold text-navy-500 bg-white/80 border border-navy-100 px-1.5 py-0.5 rounded-md">
                  +3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Full Detail Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Full Card 1: nmstarchild */}
          <div className="glass-frosted rounded-[30px] p-6 shadow-glass border border-white flex flex-col justify-between">
            <div>
              {/* User Identity & Total Valuation Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-2xl">
                      🎩
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xl text-navy-900">nmstarchild</h3>
                      <span className="text-[10px] font-black tracking-wider text-white bg-primary-500 px-2 py-0.5 rounded-full uppercase shadow-sm">
                        VIP
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-navy-400 mt-1 font-mono">
                      <button
                        onClick={() => copyToClipboard("0x7b1c3a7d9018e2d6")}
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                      >
                        {copiedAddress === "0x7b1c3a7d9018e2d6" ? (
                          <Check className="w-3.5 h-3.5 text-accentGreen" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>0x7b1...e2d6</span>
                      </button>
                      <span className="flex items-center gap-1 font-sans text-navy-500">
                        <Calendar className="w-3.5 h-3.5" /> On-chain since 2021
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                    $210,873
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-xs font-bold text-accentGreen bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      +12.48%
                    </span>
                    <span className="text-navy-400 text-xs">⌄</span>
                  </div>
                </div>
              </div>

              {/* Badges & Socials Row */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100 shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-primary-500" /> Top 1%
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  𝕏
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  👾
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  ✈
                </span>
                <span className="text-xs font-semibold text-navy-600 bg-white/80 border border-navy-100 px-2.5 py-1 rounded-full">
                  1804 days
                </span>
              </div>

              {/* Sparkline Curve */}
              <div className="mt-3 h-14 w-full">
                <svg viewBox="0 0 400 60" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="whaleCurve1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,45 Q 60,30 110,40 T 200,25 T 300,15 T 400,20 L 400,60 L 0,60 Z"
                    fill="url(#whaleCurve1)"
                  />
                  <path
                    d="M 0,45 Q 60,30 110,40 T 200,25 T 300,15 T 400,20"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-2 text-center py-3 my-2 border-y border-navy-100/60">
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">TVF</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">$936.1M</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Followers</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">14.1K</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Following</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">320</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Earnings</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">2,195.8</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 my-4">
                <button
                  onClick={() => toggleFollow("nmstarchild")}
                  className="flex-1 btn-connect-wallet text-white py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>{followedWhales["nmstarchild"] ? "Following" : "Follow"}</span>
                </button>
                <Link
                  href="/wallet/0x7b1c3a7d9018e2d6"
                  className="flex-1 glass-frosted text-navy-800 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Wallet</span>
                  <ExternalLink className="w-4 h-4 text-primary-500" />
                </Link>
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-navy-100/70 pt-2 pb-1 text-xs font-bold text-navy-500">
                <div className="flex items-center gap-6">
                  {["Portfolio", "NFTs", "Transactions", "Defi"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTabLeft(tab)}
                      className={`pb-2 transition-colors relative cursor-pointer ${
                        activeTabLeft === tab
                          ? "text-primary-500 border-b-2 border-primary-500 font-black"
                          : "hover:text-navy-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-navy-600 hover:text-navy-900 cursor-pointer pb-2 font-semibold">
                  <span>All Chains</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Asset Allocation Table */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider pb-1">
                  <div className="col-span-4">ASSET</div>
                  <div className="col-span-3">AMOUNT</div>
                  <div className="col-span-2 text-right">VALUE</div>
                  <div className="col-span-3 text-right">ALLOCATION</div>
                </div>

                {/* Row 1: Ethereum */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5 border-b border-navy-100/40">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <EthereumCoinImg className="w-5 h-5" />
                    <span>Ethereum</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">4.2300 ETH</div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$8,924.34</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">42.3%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: "42.3%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Algorand */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5 border-b border-navy-100/40">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <AlgorandCoinImg className="w-5 h-5" />
                    <span>Algorand</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">125,000 ALGO</div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$7,500.00</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">35.6%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: "35.6%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Bitcoin */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <BitcoinCoinImg className="w-5 h-5" />
                    <span>Bitcoin</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">0.0850 BTC</div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$5,420.21</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">12.8%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: "12.8%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Card 2: an0n */}
          <div className="glass-frosted rounded-[30px] p-6 shadow-glass border border-white flex flex-col justify-between">
            <div>
              {/* User Identity & Total Valuation Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-600 to-navy-900 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-navy-900 flex items-center justify-center text-2xl">
                      🥷
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xl text-navy-900">an0n</h3>
                      <span className="text-[10px] font-black tracking-wider text-white bg-primary-500 px-2 py-0.5 rounded-full uppercase shadow-sm">
                        VIP
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-navy-400 mt-1 font-mono">
                      <button
                        onClick={() => copyToClipboard("0x7bfe294c06019a")}
                        className="flex items-center gap-1 hover:text-primary-600 transition-colors"
                      >
                        {copiedAddress === "0x7bfe294c06019a" ? (
                          <Check className="w-3.5 h-3.5 text-accentGreen" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>0x7bfe...c060</span>
                      </button>
                      <span className="flex items-center gap-1 font-sans text-navy-500">
                        <Calendar className="w-3.5 h-3.5" /> On-chain since 2018
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                    $33,389,759
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-xs font-bold text-accentGreen bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      +3.08%
                    </span>
                    <span className="text-navy-400 text-xs font-bold">?</span>
                  </div>
                </div>
              </div>

              {/* Badges & Socials Row */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100 shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-primary-500" /> Top 0.1%
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  𝕏
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  👾
                </span>
                <span className="w-7 h-7 rounded-full bg-white/80 border border-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 cursor-pointer hover:border-primary-300 transition-colors">
                  ✈
                </span>
                <span className="text-xs font-semibold text-navy-600 bg-white/80 border border-navy-100 px-2.5 py-1 rounded-full">
                  2497 days
                </span>
              </div>

              {/* Sparkline Curve */}
              <div className="mt-3 h-14 w-full">
                <svg viewBox="0 0 400 60" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="whaleCurve2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,35 Q 70,45 130,30 T 230,15 T 310,25 T 400,20 L 400,60 L 0,60 Z"
                    fill="url(#whaleCurve2)"
                  />
                  <path
                    d="M 0,35 Q 70,45 130,30 T 230,15 T 310,25 T 400,20"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-2 text-center py-3 my-2 border-y border-navy-100/60">
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">TVF</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">$2.2B</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Followers</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">70.3K</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Following</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">1,079</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase">Earnings</div>
                  <div className="text-sm font-black text-navy-900 mt-0.5">1,864.4</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 my-4">
                <button
                  onClick={() => toggleFollow("an0n")}
                  className="flex-1 btn-connect-wallet text-white py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>{followedWhales["an0n"] ? "Following" : "Follow"}</span>
                </button>
                <Link
                  href="/wallet/0x7bfe294c06019a"
                  className="flex-1 glass-frosted text-navy-800 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View Wallet</span>
                  <ExternalLink className="w-4 h-4 text-primary-500" />
                </Link>
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-navy-100/70 pt-2 pb-1 text-xs font-bold text-navy-500">
                <div className="flex items-center gap-6">
                  {["Portfolio", "NFTs", "Transactions", "Defi"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTabRight(tab)}
                      className={`pb-2 transition-colors relative cursor-pointer ${
                        activeTabRight === tab
                          ? "text-primary-500 border-b-2 border-primary-500 font-black"
                          : "hover:text-navy-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-navy-600 hover:text-navy-900 cursor-pointer pb-2 font-semibold">
                  <span>All Chains</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Asset Allocation Table */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-12 text-[11px] font-bold text-navy-400 uppercase tracking-wider pb-1">
                  <div className="col-span-4">ASSET</div>
                  <div className="col-span-3">AMOUNT</div>
                  <div className="col-span-2 text-right">VALUE</div>
                  <div className="col-span-3 text-right">ALLOCATION</div>
                </div>

                {/* Row 1: Ethereum */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5 border-b border-navy-100/40">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <EthereumCoinImg className="w-5 h-5" />
                    <span>Ethereum</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">102.50 ETH</div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$168,240.20</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">50.4%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: "50.4%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Algorand */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5 border-b border-navy-100/40">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <AlgorandCoinImg className="w-5 h-5" />
                    <span>Algorand</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">
                    1,250,000 ALGO
                  </div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$250,000.00</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">28.1%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: "28.1%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: BNB / USDC */}
                <div className="grid grid-cols-12 items-center text-xs py-1.5">
                  <div className="col-span-4 flex items-center gap-2 font-bold text-navy-800">
                    <BnbCoinImg className="w-5 h-5" />
                    <span>BNB Chain</span>
                  </div>
                  <div className="col-span-3 text-navy-600 font-mono font-medium">
                    1,000,000 BNB
                  </div>
                  <div className="col-span-2 text-right font-bold text-navy-900">$1,000,000.00</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="text-navy-500 font-semibold text-[11px]">12.3%</span>
                    <div className="w-14 h-2 rounded-full bg-navy-100/80 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: "12.3%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
