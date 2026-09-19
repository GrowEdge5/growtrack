"use client";

import React from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { BrandLogoIcon } from "./CryptoIcons";
import { useWalletModal } from "@/context/WalletModalContext";

export function Navbar() {
  const { openWalletModal } = useWalletModal();

  return (
    <header className="sticky top-4 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6">
      <div className="glass-frosted rounded-full px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-300">
        {/* Brand: Blue glass Growtrack search icon + "Growtrack" */}
        <Link href="/" className="flex items-center gap-3 group">
          <BrandLogoIcon className="w-10 h-10 group-hover:scale-105 transition-transform" />
          <div className="flex items-baseline text-2xl font-black tracking-tight">
            <span className="text-navy-900">Grow</span>
            <span className="text-primary-500">track</span>
          </div>
        </Link>

        {/* Center Navigation Links matching Image 5 */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-navy-700">
          <Link
            href="#portfolio"
            className="hover:text-primary-500 transition-colors cursor-pointer"
          >
            Portfolio
          </Link>
          <Link href="#whales" className="hover:text-primary-500 transition-colors cursor-pointer">
            Capabilities
          </Link>
          <Link
            href="#capabilities"
            className="hover:text-primary-500 transition-colors cursor-pointer"
          >
            x402 Protocol
          </Link>
          <Link
            href="#capabilities"
            className="hover:text-primary-500 transition-colors cursor-pointer"
          >
            Capabilities
          </Link>
        </nav>

        {/* Right Connect Wallet button with soft glass treatment */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openWalletModal}
            className="btn-connect-wallet text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-white/90" />
            <span>Connect Wallet</span>
          </button>
        </div>
      </div>
    </header>
  );
}
