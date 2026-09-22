"use client";

import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandLogoIcon } from "./CryptoIcons";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/90 bg-white/60 backdrop-blur-xl py-7 mt-12 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand + Badge + Motto */}
        <div className="flex items-center gap-3.5">
          <BrandLogoIcon className="w-11 h-11" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-navy-900 tracking-tight">GROWTRACK</span>
              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100 shadow-sm">
                Powered by Algorand x402
              </span>
            </div>
            <p className="text-xs text-navy-400 font-medium mt-0.5">
              Track. Analyse. Grow. Onchain.
            </p>
          </div>
        </div>

        {/* Center: Social Links. Only destinations that actually exist are links;
            the community channels have no accounts yet, so they are shown as
            unavailable rather than sending people to a platform homepage. */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-navy-500 mr-1">Find us on</span>

          <span
            aria-label="Discord — not available yet"
            title="No community server yet"
            className="w-8 h-8 rounded-full bg-white/60 border border-navy-100 text-navy-300 shadow-sm flex items-center justify-center text-xs cursor-not-allowed opacity-70"
          >
            👾
          </span>

          <span
            aria-label="X — not available yet"
            title="No X account yet"
            className="w-8 h-8 rounded-full bg-white/60 border border-navy-100 text-navy-300 shadow-sm flex items-center justify-center text-xs font-bold cursor-not-allowed opacity-70"
          >
            𝕏
          </span>

          <a
            href="https://github.com/GrowEdge5/growtrack"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            title="Growtrack on GitHub"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
          >
            🐙
          </a>

          <span
            aria-label="Telegram — not available yet"
            title="No Telegram channel yet"
            className="w-8 h-8 rounded-full bg-white/60 border border-navy-100 text-navy-300 shadow-sm flex items-center justify-center text-xs font-bold cursor-not-allowed opacity-70"
          >
            ✈
          </span>

          <a
            href="mailto:contact@growtrack.pro"
            aria-label="Email"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs transition-all hover:scale-110"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Right: developer entry points that actually exist */}
        <div className="flex items-center gap-4 text-xs font-semibold text-navy-500">
          <Link href="#x402" className="hover:text-primary-600 transition-colors">
            x402 Protocol
          </Link>
          <span className="text-navy-300">|</span>
          <Link href="#capabilities" className="hover:text-primary-600 transition-colors">
            Capabilities
          </Link>
        </div>
      </div>
    </footer>
  );
}
