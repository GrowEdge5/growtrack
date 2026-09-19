"use client";

import React, { useEffect, useState } from "react";
import { X, ArrowRight, ShieldCheck, Check, Sparkles } from "lucide-react";
import { useWalletModal } from "@/context/WalletModalContext";
import { BrandLogoIcon } from "@/components/landing/CryptoIcons";

interface WalletOption {
  id: string;
  name: string;
  image: string;
  badge?: string;
  subtext?: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "para",
    name: "Para Wallet",
    image: "/assets/wallets/para.png",
    subtext: "Algorand standard mobile & web wallet"
  },
  {
    id: "lute",
    name: "Lute Wallet",
    image: "/assets/wallets/lute.png",
    subtext: "Lightweight Algorand web wallet"
  },
  {
    id: "defly",
    name: "Defly Wallet",
    image: "/assets/wallets/defly.png",
    subtext: "DeFi-first mobile wallet"
  },
  {
    id: "trust",
    name: "Trust Wallet",
    image: "/assets/wallets/trust.jpg",
    subtext: "Multi-chain mobile & extension"
  },
  {
    id: "ledger",
    name: "Ledger Wallet",
    image: "/assets/wallets/ledger.webp",
    subtext: "Hardware cold storage"
  }
];

export function WalletConnectModal() {
  const { isWalletModalOpen, closeWalletModal, selectedWallet, selectWallet } = useWalletModal();
  const [animateIn, setAnimateIn] = useState(false);

  // Manage animation timing and body scroll locking
  useEffect(() => {
    if (isWalletModalOpen) {
      // Trigger smooth entrance animation
      const animTimer = setTimeout(() => setAnimateIn(true), 10);
      // Lock body scroll while keeping page mounted & scroll position intact
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      // Listen for ESC key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeWalletModal();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        clearTimeout(animTimer);
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      setAnimateIn(false);
    }
  }, [isWalletModalOpen, closeWalletModal]);

  if (!isWalletModalOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeWalletModal();
    }
  };

  const handleWalletSelect = (walletName: string) => {
    selectWallet(walletName);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 ease-out ${
        animateIn
          ? "bg-[#0A2350]/[0.22] backdrop-blur-[6px] opacity-100"
          : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      aria-modal="true"
      role="dialog"
      aria-labelledby="wallet-modal-title"
    >
      {/* Modal Card Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl sm:max-w-3xl glass-frosted rounded-[32px] p-6 sm:p-8 shadow-2xl border border-white/95 transition-all duration-200 ease-out transform ${
          animateIn ? "scale-100 translate-y-0 opacity-100" : "scale-[0.97] translate-y-2 opacity-0"
        } max-h-[90vh] overflow-y-auto`}
      >
        {/* Close Button X */}
        <button
          type="button"
          onClick={closeWalletModal}
          aria-label="Close wallet connection modal"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-navy-100/70 text-navy-500 hover:text-navy-900 flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left Column: Title + Subtitle + 5 Wallet Buttons */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="pr-8">
                <h3
                  id="wallet-modal-title"
                  className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight"
                >
                  Connect a Wallet
                </h3>
                <p className="text-xs sm:text-sm text-navy-500 mt-1 font-normal leading-relaxed">
                  Choose your preferred wallet to continue with Growtrack.
                </p>
              </div>

              {/* Five Wallet Options in exact order */}
              <div className="mt-5 space-y-2.5">
                {WALLET_OPTIONS.map((wallet) => {
                  const isSelected = selectedWallet === wallet.name;
                  return (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => handleWalletSelect(wallet.name)}
                      className={`w-full group rounded-2xl p-3 sm:py-3.5 sm:px-4 flex items-center justify-between border transition-all duration-200 cursor-pointer text-left ${
                        isSelected
                          ? "bg-primary-50/90 border-primary-400 shadow-sm ring-2 ring-primary-400/20"
                          : "bg-white/80 hover:bg-white border-white/90 hover:border-primary-300 shadow-xs hover:shadow-md"
                      }`}
                    >
                      {/* Left: Logo + Name */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/90 border border-navy-100/40 p-0.5 shadow-xs">
                          <img
                            src={wallet.image}
                            alt={wallet.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                        <div>
                          <span
                            className={`font-bold text-sm tracking-tight transition-colors ${
                              isSelected
                                ? "text-primary-600 font-extrabold"
                                : "text-navy-900 group-hover:text-primary-600"
                            }`}
                          >
                            {wallet.name}
                          </span>
                          <p className="text-[11px] text-navy-400 font-medium">{wallet.subtext}</p>
                        </div>
                      </div>

                      {/* Right: State / Arrow */}
                      <div className="flex items-center gap-1.5 pl-2">
                        {isSelected ? (
                          <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Status Banner if selected */}
            {selectedWallet && (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Selected <strong>{selectedWallet}</strong>. Ready to synchronize multichain data.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Clean Blue/White Glass Info Panel */}
          <div className="md:col-span-5 bg-gradient-to-br from-primary-50/80 via-blue-50/50 to-primary-100/30 rounded-[26px] p-6 border border-white/85 shadow-sm flex flex-col justify-between">
            {/* Top Badge & Brand Visual */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrandLogoIcon className="w-8 h-8" />
                <span className="font-extrabold text-sm text-navy-900 tracking-tight">
                  Growtrack Access
                </span>
              </div>

              {/* Main Message */}
              <h4 className="text-xl sm:text-2xl font-black text-navy-900 leading-snug tracking-tight">
                Your Wallet. <br />
                <span className="text-primary-500">More Possibilities.</span>
              </h4>

              {/* Supporting Text */}
              <p className="text-xs text-navy-600 mt-3 leading-relaxed font-normal">
                Connect your wallet to track, analyse and grow your portfolio across all chains with
                real on-chain data.
              </p>
            </div>

            {/* Subtle Feature Bullet points */}
            <div className="my-6 space-y-2 text-xs text-navy-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span>Zero synthetic fill or fake valuations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span>Unified EVM & Algorand view</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span>Pay-per-query intelligence via x402</span>
              </div>
            </div>

            {/* Bottom Assurance */}
            <div className="pt-4 border-t border-navy-100/60 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-700 bg-white/80 border border-white px-3 py-1.5 rounded-full shadow-xs">
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                <span>100% Non-Custodial</span>
              </div>
              <span className="text-[11px] text-navy-400 font-medium">Read-only sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
