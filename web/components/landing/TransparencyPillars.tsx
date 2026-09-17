"use client";

import React, { useState } from "react";
import { ShieldCheck, Check, Zap, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function TransparencyPillars() {
  const [pricingMode, setPricingMode] = useState<"verified" | "unpriced">("verified");
  const [unlockedReceipt, setUnlockedReceipt] = useState(false);

  return (
    <section id="features" className="py-24 border-b border-[#1A2333] bg-[#000000] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-4 py-1.5 text-xs font-mono text-[#00ECB5] mb-4 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-semibold">Algorand Native Financial Architecture</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-sans font-black tracking-tight text-white leading-tight"
          >
            Built for Institutional Clarity. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ECB5] to-[#38BDF8]">
              Powered by Algorand Rails.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-[#94A3B8] leading-relaxed font-sans max-w-2xl mx-auto"
          >
            Real on-chain telemetry without synthetic zero valuations, slow polling, or recurring
            subscription lock-ins.
          </motion.p>
        </div>

        {/* Credix-Style Bento Grid with Framer Motion and Mint Glow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1 (Large Bento - Left): Unified Multichain Radar with Interactive SVG Balance Chart */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-[#1A2333] bg-[#0D111A] p-7 sm:p-9 shadow-2xl hover:border-[#00ECB5]/50 hover:shadow-[0_0_25px_rgba(0,236,181,0.15)] transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#1A2333] bg-[#000000] px-3.5 py-1 text-xs font-mono text-[#00ECB5]">
                  <span className="h-2 w-2 rounded-full bg-[#00ECB5]" />
                  <span>Cross-Chain Distribution</span>
                </span>
                <span className="text-xs font-mono text-[#64748B]">BENTO 01</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-sans font-black text-white tracking-tight leading-snug">
                Every asset across EVM & Algorand. <br />
                <span className="text-[#00ECB5]">One unified view.</span>
              </h3>

              <p className="mt-3 text-sm sm:text-base text-[#94A3B8] leading-relaxed font-sans">
                Connect any address to track net worth, token balances, and liquidity distribution
                without switching networks or wallets.
              </p>

              {/* Interactive Visual SVG Balance Chart */}
              <div className="mt-8 rounded-2xl border border-[#1A2333] bg-[#000000] p-6 space-y-5">
                {/* SVG Visual Arc & Distribution Chart */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Native SVG Donut / Balance Ring */}
                  <div className="relative flex items-center justify-center">
                    <svg width="130" height="130" viewBox="0 0 100 100" className="-rotate-90">
                      {/* Background Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#1A2333"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      {/* Ethereum Arc (68%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#38BDF8"
                        strokeWidth="12"
                        strokeDasharray="238.76"
                        strokeDashoffset="76.4"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      {/* Algorand Arc (32%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#00ECB5"
                        strokeWidth="12"
                        strokeDasharray="238.76"
                        strokeDashoffset="162.35"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-mono text-xs text-[#94A3B8]">Total</span>
                      <span className="font-mono font-bold text-white text-sm">$24.8k</span>
                    </div>
                  </div>

                  {/* Distribution Legend with Live Balances */}
                  <div className="flex-1 space-y-3 w-full font-mono text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D111A] border border-[#1A2333]">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#38BDF8]" />
                        <span className="text-white font-medium">Ethereum Holdings</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">$16,877.26</span>
                        <span className="text-[#94A3B8] text-[11px] ml-1.5">(68%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D111A] border border-[#00ECB5]/30">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#00ECB5]" />
                        <span className="text-white font-medium">Algorand Native Assets</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#00ECB5] font-bold">$7,942.24</span>
                        <span className="text-[#00ECB5]/80 text-[11px] ml-1.5">(32%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#1A2333] flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <Check className="h-4 w-4 text-[#00ECB5]" />
                <span>Instant Multichain Ingestion</span>
              </span>
              <span className="font-mono text-[11px] text-[#00ECB5]">100% Non-Custodial</span>
            </div>
          </motion.div>

          {/* Right Column (Stacked Bento Cards 2 & 3) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Card 2: Truthful Valuations Only with Oracle Verification Shield Graphic */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col justify-between rounded-3xl border border-[#1A2333] bg-[#0D111A] p-7 shadow-2xl hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono text-amber-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Oracle Shield</span>
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">BENTO 02</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-sans font-black text-white tracking-tight">
                  Truthful Valuations Only
                </h3>

                <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed font-sans">
                  Most trackers show synthetic zeros. Growtrack protects your actual net worth by
                  verifying oracle depth.
                </p>

                {/* Sleek Oracle Verification Shield Graphic */}
                <div className="mt-6 rounded-2xl border border-[#1A2333] bg-[#000000] p-4 space-y-3">
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0D111A] border border-[#1A2333]">
                    <button
                      type="button"
                      onClick={() => setPricingMode("verified")}
                      className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
                        pricingMode === "verified"
                          ? "bg-[#00ECB5] text-black font-bold shadow-sm"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Verified Asset
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingMode("unpriced")}
                      className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
                        pricingMode === "unpriced"
                          ? "bg-amber-500 text-black font-bold shadow-sm"
                          : "text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      Illiquid Asset
                    </button>
                  </div>

                  {pricingMode === "verified" ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D111A] border border-emerald-500/30 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00ECB5]">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-white font-bold">ETH / ALGO</div>
                          <div className="text-[#94A3B8] text-[11px]">DeFiLlama Feed Verified</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm">$3,450.20</div>
                        <div className="text-[#00ECB5] text-[11px] font-semibold">
                          100% Reliable
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D111A] border border-amber-500/30 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          !
                        </div>
                        <div>
                          <div className="text-white font-bold">Illiquid ASA Token</div>
                          <div className="text-[#94A3B8] text-[11px]">Pending Price Discovery</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Unpriced (No $0 Fake)
                        </span>
                        <div className="text-[#94A3B8] text-[10px] mt-1">Zero False Dilution</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Card 3: x402 Micropayment Receipt Widget on Algorand Rails */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col justify-between rounded-3xl border border-[#1A2333] bg-[#0D111A] p-7 shadow-2xl hover:border-[#00ECB5]/50 hover:shadow-[0_0_20px_rgba(0,236,181,0.15)] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-3.5 py-1 text-xs font-mono text-[#00ECB5]">
                    <Zap className="h-3.5 w-3.5" />
                    <span>x402 Protocol</span>
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">BENTO 03</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-sans font-black text-white tracking-tight">
                  Intelligence on Demand
                </h3>

                <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed font-sans">
                  No recurring SaaS fees or credit cards. Unlock deep wallet telemetry and risk
                  profiling per-query via Algorand micro-rails.
                </p>

                {/* Interactive x402 Algorand Micropayment Receipt Widget */}
                <div className="mt-6 rounded-2xl border border-[#1A2333] bg-[#000000] p-4">
                  <button
                    type="button"
                    onClick={() => setUnlockedReceipt(!unlockedReceipt)}
                    className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs font-mono ${
                      unlockedReceipt
                        ? "border-[#00ECB5]/50 bg-[#00ECB5]/10 text-[#00ECB5]"
                        : "border-[#1A2333] bg-[#0D111A] text-white hover:border-[#00ECB5]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center ${unlockedReceipt ? "bg-[#00ECB5] text-black" : "bg-[#1A2333] text-white"}`}
                      >
                        {unlockedReceipt ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-bold">
                          {unlockedReceipt ? "Receipt Verified" : "Pay $0.01 USDC"}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">via Algorand Mainnet</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] underline">
                        {unlockedReceipt ? "Round #41,892,104 ✓" : "Unlock Live Signal →"}
                      </span>
                    </div>
                  </button>

                  <div className="mt-2 text-center text-[11px] font-mono text-[#94A3B8]">
                    {unlockedReceipt
                      ? "0.01 USDC Fee Verified via Algorand Mainnet (<2.8s instant finality)"
                      : "Click to simulate autonomous x402 micro-settlement"}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
