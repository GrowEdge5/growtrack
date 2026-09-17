"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { motion } from "framer-motion";

export const DEMO_EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
export const DEMO_ALGO = "JJNPNF2I5D5V3I6V5XOMN5C3VAYUHYC7K5EQ5N4U3L446TXF7M6Z46MTB4";

interface DetectedFormat {
  chain: "evm" | "algorand" | "ens" | "solana" | "bitcoin" | "unknown";
  label: string;
  badgeClass: string;
  isValid: boolean;
  hint: string;
}

export function detectAddressFormat(raw: string): DetectedFormat {
  const query = raw.trim();

  if (!query) {
    return {
      chain: "unknown",
      label: "Awaiting Input",
      badgeClass: "border-[#1A2333] bg-[#0D111A] text-[#94A3B8]",
      isValid: false,
      hint: "Enter an EVM address, Algorand address, or ENS domain"
    };
  }

  if (/^[a-zA-Z0-9-]+\.(eth|algo|sol|xyz)$/i.test(query)) {
    return {
      chain: "ens",
      label: "ENS Domain",
      badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium",
      isValid: true,
      hint: "Valid decentralized domain name"
    };
  }

  if (query.startsWith("0x") || query.startsWith("0X")) {
    const isFull = /^0x[0-9a-fA-F]{40}$/.test(query);
    if (isFull) {
      return {
        chain: "evm",
        label: "Ethereum (EVM)",
        badgeClass: "border-[#00ECB5]/40 bg-[#00ECB5]/10 text-[#00ECB5] font-medium",
        isValid: true,
        hint: "Valid 42-character hex format"
      };
    }
    return {
      chain: "evm",
      label: `EVM (${query.length}/42 chars)`,
      badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      isValid: false,
      hint: "Requires 40 hexadecimal characters after 0x"
    };
  }

  const isAlgoChars = /^[A-Z2-7a-z]+$/.test(query);
  if (isAlgoChars && query.length === 58) {
    return {
      chain: "algorand",
      label: "Algorand Standard",
      badgeClass: "border-[#00ECB5]/40 bg-[#00ECB5]/10 text-[#00ECB5] font-medium",
      isValid: true,
      hint: "Valid 58-character Algorand address"
    };
  } else if (isAlgoChars && query.length > 20 && query.length < 58) {
    return {
      chain: "algorand",
      label: `Algorand (${query.length}/58 chars)`,
      badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      isValid: false,
      hint: "Algorand addresses are exactly 58 characters"
    };
  }

  if (
    /^(bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{8,87}$/i.test(query) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(query)
  ) {
    return {
      chain: "bitcoin",
      label: "Bitcoin",
      badgeClass: "border-[#1A2333] bg-[#0D111A] text-[#94A3B8]",
      isValid: true,
      hint: "Bitcoin address format (scheduled for Q3)"
    };
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
    return {
      chain: "solana",
      label: "Solana",
      badgeClass: "border-[#1A2333] bg-[#0D111A] text-[#94A3B8]",
      isValid: true,
      hint: "Solana public key format (scheduled for Q3)"
    };
  }

  return {
    chain: "unknown",
    label: "Unrecognized Format",
    badgeClass: "border-[#1A2333] bg-[#0D111A] text-[#94A3B8]",
    isValid: false,
    hint: "Provide an EVM (0x...), Algorand, or ENS address"
  };
}

export function HeroSearch() {
  const router = useRouter();
  const [addressInput, setAddressInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const detection = useMemo(() => detectAddressFormat(addressInput), [addressInput]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = addressInput.trim();
    if (!clean) {
      setErrorMsg("Please paste or enter a wallet address first.");
      return;
    }

    router.push(`/wallet/${encodeURIComponent(clean)}`);
  };

  const handleApplyDemo = (demoAddr: string) => {
    setAddressInput(demoAddr);
    setErrorMsg("");
    router.push(`/wallet/${encodeURIComponent(demoAddr)}`);
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36 bg-[#000000] border-b border-[#1A2333]">
      {/* Official Algorand Mint Ambient Radial Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[650px] w-[1100px] opacity-100 blur-[130px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0, 236, 181, 0.12) 0%, rgba(0, 236, 181, 0.04) 40%, transparent 70%)"
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle Algorand Ecosystem Header Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-4 py-1.5 text-xs font-mono text-[#00ECB5] mb-6 shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-[#00ECB5] animate-pulse" />
          <span className="font-semibold text-white">Institutional Multichain Intelligence</span>
          <span className="text-[#1A2333]">|</span>
          <span className="text-[#00ECB5]">x402 Algorand Rails</span>
        </motion.div>

        {/* Official Algorand Brand Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-sans font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.12]"
        >
          The Multichain Wallet Radar{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ECB5] via-[#2CE8BD] to-[#38BDF8]">
            Built on Algorand Rails.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-xl text-[#94A3B8] max-w-2xl mx-auto leading-relaxed font-sans"
        >
          Real balances, verified oracle pricing, and instant intelligence across Ethereum and
          Algorand. Zero fake valuations. Zero custody required.
        </motion.p>

        {/* Ingestion Search Box with Algorand Electric Mint CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 max-w-2xl mx-auto"
        >
          <form
            onSubmit={handleSubmit}
            className="group relative rounded-2xl border border-[#1A2333] bg-[#0D111A]/95 backdrop-blur-md p-2.5 shadow-2xl transition-all focus-within:border-[#00ECB5] focus-within:ring-2 focus-within:ring-[#00ECB5]/25"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex flex-1 items-center">
                <Search className="absolute left-3.5 h-5 w-5 text-[#94A3B8] pointer-events-none group-focus-within:text-[#00ECB5] transition-colors" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter EVM (0x...), Algorand, or ENS domain..."
                  aria-label="Multichain Wallet Address"
                  className="w-full rounded-xl bg-transparent pl-11 pr-28 py-3 text-sm sm:text-base font-mono text-white placeholder:text-[#64748B] placeholder:font-sans focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />

                {/* Real-time Address Format Badge */}
                <div className="absolute right-2.5 flex items-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-mono font-medium border transition-colors ${detection.badgeClass}`}
                  >
                    {detection.isValid ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-current" />
                    ) : addressInput.trim().length > 0 ? (
                      <AlertCircle className="h-3.5 w-3.5 text-current" />
                    ) : null}
                    <span>{detection.label}</span>
                  </span>
                </div>
              </div>

              {/* Algorand Electric Mint Submit CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00ECB5] text-black font-bold hover:bg-[#00d2a1] transition px-6 py-3.5 text-sm shadow-[0_0_20px_rgba(0,236,181,0.3)] whitespace-nowrap"
              >
                <span>Analyze Wallet</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </motion.button>
            </div>
          </form>

          {/* Feedback & Hint */}
          <div className="mt-2.5 flex items-center justify-between px-2 text-xs font-mono">
            <span className={errorMsg ? "text-amber-400 font-medium" : "text-[#94A3B8]"}>
              {errorMsg || detection.hint}
            </span>
            <span className="hidden sm:inline text-[#64748B]">
              Sub-second cached reads · Non-custodial
            </span>
          </div>

          {/* Demo Action Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            <span className="text-[#94A3B8] font-medium text-xs">Explore Demo:</span>

            <motion.button
              whileHover={{ y: -2 }}
              type="button"
              onClick={() => handleApplyDemo(DEMO_EVM)}
              className="inline-flex items-center gap-2 rounded-full border border-[#1A2333] bg-[#0D111A] hover:border-[#00ECB5]/50 hover:bg-[#131926] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-[#00ECB5]" />
              <span>vitalik.eth</span>
              <span className="text-[#64748B] font-mono text-[11px]">(0xd8dA...6045)</span>
            </motion.button>

            <motion.button
              whileHover={{ y: -2 }}
              type="button"
              onClick={() => handleApplyDemo(DEMO_ALGO)}
              className="inline-flex items-center gap-2 rounded-full border border-[#1A2333] bg-[#0D111A] hover:border-[#00ECB5]/50 hover:bg-[#131926] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-[#00ECB5]" />
              <span>Algorand Genesis</span>
              <span className="text-[#64748B] font-mono text-[11px]">(JJNP...MTB4)</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Floating Interactive Portfolio Preview Card with Framer Motion Float */}
        <div className="relative mt-16 max-w-3xl mx-auto text-left">
          {/* Floating Stat Chip A (Top-Right) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-4 -right-2 sm:-right-6 z-20 hidden sm:flex items-center gap-2 rounded-full border border-[#1A2333] bg-[#0D111A]/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white shadow-xl"
          >
            <span>🛡️</span>
            <span>100% Non-Custodial</span>
          </motion.div>

          {/* Floating Stat Chip B (Bottom-Left) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute -bottom-4 -left-2 sm:-left-6 z-20 hidden sm:flex items-center gap-2 rounded-full border border-[#1A2333] bg-[#0D111A]/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white shadow-xl"
          >
            <span>⚡</span>
            <span>Real-Time On-Chain Indexing</span>
          </motion.div>

          {/* Floating Stat Chip C (Bottom-Right) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="absolute -bottom-4 -right-2 sm:-right-6 z-20 hidden sm:flex items-center gap-2 rounded-full border border-[#00ECB5]/40 bg-[#0D111A]/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-[#00ECB5] shadow-xl"
          >
            <span>✨</span>
            <span>Native x402 Micropayments</span>
          </motion.div>

          {/* Main Card with Gentle Floating Animation */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            onClick={() => handleApplyDemo(DEMO_EVM)}
            className="group relative cursor-pointer rounded-2xl border border-[#1A2333] bg-[#0D111A] p-5 sm:p-7 shadow-2xl hover:border-[#00ECB5]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,236,181,0.15)]"
          >
            {/* Window Top Bar with Animated Radar Beacon Ping */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1A2333]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#2A3146]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#2A3146]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#2A3146]" />
                </div>
                <span className="text-[#1A2333] mx-1">|</span>
                <span className="font-mono text-xs text-[#94A3B8]">
                  vitalik.eth · Multichain Portfolio Overview
                </span>
              </div>

              {/* Animated Live Block Ingestion Radar Ping */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-3 py-1 text-xs font-mono text-[#00ECB5]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ECB5] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ECB5]" />
                </span>
                <span>Live Block Ingestion Active</span>
              </div>
            </div>

            {/* Total Balance Headline */}
            <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#1A2333]/60">
              <div>
                <div className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider">
                  Aggregated Net Worth
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    $24,819.50
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8]">USD</span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-[#00ECB5] bg-[#00ECB5]/10 px-2.5 py-0.5 rounded-md border border-[#00ECB5]/30 font-semibold">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              <div className="text-xs font-mono text-[#94A3B8]">
                <span>EVM + Algorand Assets</span>
              </div>
            </div>

            {/* Asset Rows with Native SVG Token Badges */}
            <div className="pt-4 space-y-2.5 font-mono text-xs">
              {/* ETH Native Row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#000000] border border-[#1A2333] hover:border-[#1A2333]/80 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Authentic Native ETH SVG */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A2333] p-1.5">
                    <svg width="20" height="20" viewBox="0 0 784.37 1277.39" fill="none">
                      <path
                        d="M392.07 0L383.5 29.11V874.74L392.07 883.29L784.13 651.54L392.07 0Z"
                        fill="#8A92B2"
                      />
                      <path d="M392.07 0L0 651.54L392.07 883.29V472.33V0Z" fill="#62688F" />
                      <path
                        d="M392.07 956.52L387.24 962.41V1277.39L392.07 1277.39L784.37 724.89L392.07 956.52Z"
                        fill="#8A92B2"
                      />
                      <path d="M392.07 1277.39V956.52L0 724.89L392.07 1277.39Z" fill="#62688F" />
                      <path d="M392.07 883.29L784.13 651.54L392.07 472.33V883.29Z" fill="#454A75" />
                      <path d="M0 651.54L392.07 883.29V472.33L0 651.54Z" fill="#62688F" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-sans font-bold text-white text-sm">Ethereum</div>
                    <div className="text-[11px] text-[#94A3B8]">ETH · Native Coin</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">4.8500 ETH</div>
                  <div className="text-[11px] text-[#94A3B8]">$16,587.00 · 66.8%</div>
                </div>
              </div>

              {/* ALGO Native Row with Official Algorand SVG */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#000000] border border-[#1A2333] hover:border-[#1A2333]/80 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Official Algorand Vector SVG */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00ECB5]/10 border border-[#00ECB5]/20 p-1.5">
                    <svg
                      width="20"
                      height="20"
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
                    <div className="font-sans font-bold text-white text-sm">Algorand</div>
                    <div className="text-[11px] text-[#94A3B8]">ALGO · AVM Native</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">15,000.00 ALGO</div>
                  <div className="text-[11px] text-[#00ECB5]">$3,000.00 · 12.1%</div>
                </div>
              </div>

              {/* USDC Row with Native SVG */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#000000] border border-[#1A2333] hover:border-[#1A2333]/80 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Official USDC Vector SVG */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2775CA]/15 border border-[#2775CA]/30 p-1.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#2775CA" />
                      <path
                        d="M12.75 6.5C10.68 6.5 9 7.84 9 9.5C9 12.5 15 11.5 15 14.5C15 16.16 13.32 17.5 11.25 17.5C9.72 17.5 8.37 16.74 7.68 15.62L6.15 16.76C7.23 18.35 9.11 19.5 11.25 19.5V21H12.75V19.5C14.82 19.5 16.5 18.16 16.5 16.5C16.5 13.5 10.5 14.5 10.5 11.5C10.5 9.84 12.18 8.5 14.25 8.5C15.54 8.5 16.69 9.09 17.38 10.02L18.82 8.78C17.78 7.37 16.13 6.5 14.25 6.5V5H12.75V6.5Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-sans font-bold text-white text-sm">USD Coin</div>
                    <div className="text-[11px] text-[#94A3B8]">USDC · Multichain Stablecoin</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">5,232.50 USDC</div>
                  <div className="text-[11px] text-[#94A3B8]">$5,232.50 · 21.1%</div>
                </div>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="mt-4 pt-3 border-t border-[#1A2333] flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="text-[#00ECB5] font-medium group-hover:underline flex items-center gap-1">
                Explore Live Wallet Radar →
              </span>
              <span className="text-[#64748B] font-mono text-[11px]">
                Truthful Valuation Engine
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
