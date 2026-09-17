"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, ArrowRight, Menu, X, Zap } from "lucide-react";
import { motion } from "framer-motion";

export const DEMO_WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

export function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDemoClick = () => {
    router.push(`/wallet/${DEMO_WALLET}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1A2333] bg-[#000000]/90 backdrop-blur-md">
      {/* Top Algorand Ecosystem Live Network Stats Bar */}
      <div className="hidden lg:flex items-center justify-center border-b border-[#1A2333]/60 bg-[#070B12] px-4 py-1 text-[11px] font-mono text-[#94A3B8]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ECB5] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ECB5]" />
            </span>
            <span className="text-white font-medium">Algorand Mainnet</span>
          </div>
          <span className="text-[#1A2333]">|</span>
          <span>
            Block Time: <strong className="text-[#00ECB5] font-semibold">2.8s</strong>
          </span>
          <span className="text-[#1A2333]">|</span>
          <span>
            Finality: <strong className="text-white font-semibold">Instant</strong>
          </span>
          <span className="text-[#1A2333]">|</span>
          <span>
            Avg Fee: <strong className="text-white font-semibold">&lt;$0.001</strong>
          </span>
          <span className="text-[#1A2333]">|</span>
          <span className="text-[#00ECB5]">x402 Protocol Guard Active</span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Official Algorand Ecosystem Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5 text-decoration-none">
            {/* Algorand Angle Geometric Monogram */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1A2333] bg-[#0D111A] group-hover:border-[#00ECB5]/60 transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(0,236,181,0.2)]">
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
            <div className="flex items-baseline gap-1">
              <span className="font-sans font-black tracking-wider text-white text-lg">
                GROWTRACK
              </span>
              <span className="text-xs font-mono font-bold text-[#00ECB5]">.PRO</span>
            </div>
          </Link>

          {/* Official Algorand Ecosystem Pill */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#00ECB5]/40 bg-[#00ECB5]/10 px-3 py-1 text-xs font-mono font-semibold text-[#00ECB5] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ECB5] animate-pulse" />
            <span>Powered by Algorand x402</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#94A3B8]">
          <a href="#features" className="hover:text-white transition-colors">
            Capabilities
          </a>
          <a href="#supported-chains" className="hover:text-white transition-colors">
            Ecosystems
          </a>
          <a href="#developer-specs" className="hover:text-white transition-colors">
            x402 Protocol
          </a>
          <a href="/docs" className="flex items-center gap-1 hover:text-white transition-colors">
            <span>API Docs</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDemoClick}
            type="button"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-[#00ECB5] hover:bg-[#00d2a1] px-4 py-2.5 text-xs font-bold text-black transition-all shadow-[0_0_20px_rgba(0,236,181,0.3)]"
          >
            <span>Explore Demo</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </motion.button>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex md:hidden items-center justify-center p-2 rounded-lg border border-[#1A2333] bg-[#0D111A] text-[#94A3B8] hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-[#1A2333] bg-[#0D111A] px-4 py-4 space-y-3 shadow-2xl">
          <div className="inline-flex sm:hidden items-center gap-1.5 rounded-full border border-[#00ECB5]/40 bg-[#00ECB5]/10 px-3 py-1 text-xs font-mono font-semibold text-[#00ECB5] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ECB5]" />
            <span>Powered by Algorand x402</span>
          </div>

          <div className="py-2 border-y border-[#1A2333] text-[11px] font-mono text-[#94A3B8] space-y-1">
            <div>
              Algorand Block Time: <strong className="text-[#00ECB5]">2.8s</strong>
            </div>
            <div>
              Finality: <strong className="text-white">Instant</strong> · Fee:{" "}
              <strong className="text-white">&lt;$0.001</strong>
            </div>
          </div>

          <nav className="flex flex-col space-y-2 text-sm text-[#94A3B8]">
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-white font-medium"
            >
              Capabilities
            </a>
            <a
              href="#supported-chains"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-white font-medium"
            >
              Ecosystems
            </a>
            <a
              href="#developer-specs"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 hover:text-white font-medium"
            >
              x402 Protocol
            </a>
            <a
              href="/docs"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1 py-1.5 hover:text-white font-medium"
            >
              <span>API Docs</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>
          <div className="pt-2 border-t border-[#1A2333]">
            <button
              onClick={() => {
                setMobileOpen(false);
                handleDemoClick();
              }}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00ECB5] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(0,236,181,0.25)]"
            >
              <span>Explore Demo Wallet</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
