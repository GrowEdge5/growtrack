"use client";

import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AlgorandCoinImg } from "./CryptoIcons";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/90 bg-white/60 backdrop-blur-xl py-7 mt-12 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand + Badge + Motto */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-md border border-white/90 flex items-center justify-center p-2">
            <AlgorandCoinImg className="w-6 h-6" />
          </div>
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

        {/* Center: Social Links */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-navy-500 mr-1">Find us on</span>

          {/* Discord */}
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Discord"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs transition-all hover:scale-110"
          >
            👾
          </a>

          {/* X / Twitter */}
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
          >
            𝕏
          </a>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
          >
            🐙
          </a>

          {/* Telegram */}
          <a
            href="https://telegram.org"
            target="_blank"
            rel="noreferrer"
            aria-label="Telegram"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs font-bold transition-all hover:scale-110"
          >
            ✈
          </a>

          {/* Email */}
          <a
            href="mailto:contact@growtrack.io"
            aria-label="Email"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center text-xs transition-all hover:scale-110"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Right: Legal & Assets */}
        <div className="flex items-center gap-4 text-xs font-semibold text-navy-500">
          <Link href="#capabilities" className="hover:text-primary-600 transition-colors">
            Brand Assets
          </Link>
          <span className="text-navy-300">|</span>
          <Link href="#whales" className="hover:text-primary-600 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
