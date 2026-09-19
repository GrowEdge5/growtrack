"use client";

import React from "react";
import Link from "next/link";
import { Wallet, CheckCircle2 } from "lucide-react";

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

  return (
    <header className="sticky top-4 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6">
      <div className="glass-frosted rounded-full px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-300">
        <Link href="/" className="flex items-center gap-3 group">
          <BrandLogoIcon className="w-10 h-10 group-hover:scale-105 transition-transform" />
          <div className="flex items-baseline text-2xl font-black tracking-tight">
            <span className="text-navy-900">Grow</span>
            <span className="text-primary-500">track</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-navy-700">
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

        <div className="flex items-center gap-3">
          {isConnected && session !== null ? (
            <button
              type="button"
              onClick={() => openWalletModal()}
              title={session.address}
              className="glass-frosted px-4 py-2 rounded-full font-bold text-xs text-navy-800 hover:text-primary-600 flex items-center gap-2 border border-white shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-accentGreen" />
              <span className="font-mono">{shorten(session.address, 4, 4)}</span>
              <span className="hidden sm:inline text-navy-400 font-semibold">{session.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openWalletModal()}
              className="btn-connect-wallet text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-white/90" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
