"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wallet, CheckCircle2, Menu, X } from "lucide-react";

import { BrandLogoIcon } from "./CryptoIcons";
import { useWalletModal } from "@/context/WalletModalContext";
import { useWalletSession } from "@/context/WalletSessionContext";
import { shorten } from "@/lib/format";

/**
 * Each label points at the section it names. Anchors are the toolbar's own sections
 * (#portfolio, #whales, #capabilities, #x402) — every target exists on the landing
 * page, so no link is a dead end.
 */
const NAV_LINKS: readonly { href: string; label: string }[] = [
  { href: "#portfolio", label: "Portfolio" },
  { href: "#whales", label: "Whales" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#x402", label: "x402 Protocol" }
];

export function Navbar() {
  const { openWalletModal } = useWalletModal();
  const { session, isConnected } = useWalletSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-3 sm:top-4 z-50 w-full max-w-7xl mx-auto px-3 sm:px-6">
      <div className="glass-frosted rounded-full px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all duration-300">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <BrandLogoIcon className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform" />
          <div className="flex items-baseline text-xl sm:text-2xl font-black tracking-tight">
            <span className="text-navy-900">Grow</span>
            <span className="text-primary-500">track</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[15px] font-semibold text-navy-700">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-primary-500 transition-colors cursor-pointer"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && session !== null ? (
            <button
              type="button"
              onClick={() => openWalletModal()}
              title={session.address}
              className="glass-frosted px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-xs text-navy-800 hover:text-primary-600 flex items-center gap-1.5 sm:gap-2 border border-white shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accentGreen" />
              <span className="font-mono">{shorten(session.address, 4, 3)}</span>
              <span className="hidden sm:inline text-navy-400 font-semibold">{session.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openWalletModal()}
              className="btn-connect-wallet text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
              <span>
                Connect<span className="hidden xs:inline sm:inline"> Wallet</span>
              </span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="md:hidden w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-navy-100/70 text-navy-700 flex items-center justify-center transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 glass-frosted rounded-2xl p-3.5 border border-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1 text-sm font-bold text-navy-800">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2 rounded-xl hover:bg-white/80 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
