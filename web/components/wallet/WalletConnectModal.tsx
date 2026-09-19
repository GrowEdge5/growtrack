"use client";

import React, { useEffect, useState } from "react";
import { X, ArrowRight, ShieldCheck, Check, AlertCircle, Loader2, Lock } from "lucide-react";

import { useWalletModal } from "@/context/WalletModalContext";
import { useWalletSession } from "@/context/WalletSessionContext";
import { BrandLogoIcon } from "@/components/landing/CryptoIcons";
import { WALLET_OPTIONS, isSupportedWalletId } from "@/lib/wallets";
import { shorten } from "@/lib/format";

/**
 * The connect modal. Every supported entry performs a real connection against that
 * wallet's own SDK; the unsupported entries say why they cannot be used instead of
 * appearing clickable. The connected state shows the real account address and a
 * disconnect action — never a stored name pretending to be a session.
 */
export function WalletConnectModal() {
  const { isWalletModalOpen, closeWalletModal, reason } = useWalletModal();
  const { status, session, error, connect, disconnect, dismissError } = useWalletSession();
  const [animateIn, setAnimateIn] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (!isWalletModalOpen) {
      setAnimateIn(false);
      setPendingWallet(null);
      setConfirmDisconnect(false);
      return;
    }

    const animTimer = setTimeout(() => setAnimateIn(true), 10);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeWalletModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(animTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isWalletModalOpen, closeWalletModal]);

  if (!isWalletModalOpen) return null;

  const handleWalletSelect = async (walletId: string) => {
    if (!isSupportedWalletId(walletId)) {
      return;
    }
    dismissError();
    setPendingWallet(walletId);
    const connected = await connect(walletId);
    setPendingWallet(null);
    if (connected) {
      // The modal closes on success: the address is now visible in the navbar.
      setTimeout(closeWalletModal, 700);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setConfirmDisconnect(false);
  };

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeWalletModal();
        }
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 ease-out ${
        animateIn
          ? "bg-[#0A2350]/[0.22] backdrop-blur-[6px] opacity-100"
          : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      aria-modal="true"
      role="dialog"
      aria-labelledby="wallet-modal-title"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-w-2xl sm:max-w-3xl glass-frosted rounded-[32px] p-6 sm:p-8 shadow-2xl border border-white/95 transition-all duration-200 ease-out transform ${
          animateIn ? "scale-100 translate-y-0 opacity-100" : "scale-[0.97] translate-y-2 opacity-0"
        } max-h-[90vh] overflow-y-auto`}
      >
        <button
          type="button"
          onClick={closeWalletModal}
          aria-label="Close wallet connection modal"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-navy-100/70 text-navy-500 hover:text-navy-900 flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left: wallet list or the live session */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <div className="pr-8">
                <h3
                  id="wallet-modal-title"
                  className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight"
                >
                  {session !== null ? "Wallet Connected" : "Connect a Wallet"}
                </h3>
                <p className="text-xs sm:text-sm text-navy-500 mt-1 font-normal leading-relaxed">
                  {session !== null
                    ? "This account signs your Algorand x402 payments. Growtrack never holds your keys."
                    : (reason ??
                      "Connect an Algorand wallet to unlock multi-wallet tracking and paid reports.")}
                </p>
              </div>

              {session === null ? (
                <div className="mt-5 space-y-2.5">
                  {WALLET_OPTIONS.map((wallet) => {
                    const supported = wallet.status === "supported";
                    const isPending = pendingWallet === wallet.id;

                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        disabled={!supported || pendingWallet !== null}
                        onClick={() => void handleWalletSelect(wallet.id)}
                        className={`w-full group rounded-2xl p-3 sm:py-3.5 sm:px-4 flex items-center justify-between border transition-all duration-200 text-left ${
                          supported
                            ? "bg-white/80 hover:bg-white border-white/90 hover:border-primary-300 shadow-xs hover:shadow-md cursor-pointer"
                            : "bg-white/50 border-navy-100/60 cursor-not-allowed opacity-75"
                        }`}
                      >
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
                              className={`font-bold text-sm tracking-tight ${
                                supported ? "text-navy-900 group-hover:text-primary-600" : "text-navy-600"
                              }`}
                            >
                              {wallet.name}
                            </span>
                            <p className="text-[11px] text-navy-400 font-medium">
                              {supported ? wallet.subtext : (wallet.unsupportedReason ?? "Not supported yet")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pl-2">
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                          ) : supported ? (
                            <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-navy-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{session.name}</span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-navy-700 break-all bg-white/70 rounded-lg p-2 border border-white">
                      {session.address}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      {session.explorerUrl !== null && (
                        <a
                          href={session.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-primary-600 hover:text-primary-700"
                        >
                          View on explorer →
                        </a>
                      )}
                      <span className="text-navy-500 font-medium">
                        {shorten(session.address, 8, 6)}
                      </span>
                    </div>
                  </div>

                  {confirmDisconnect ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-900 font-medium">
                        Disconnect {session.name}? Multi-wallet tracking and paid reports will need
                        a wallet again.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDisconnect()}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer hover:bg-amber-600"
                        >
                          Yes, disconnect
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnect(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-navy-200 text-xs font-bold text-navy-600 cursor-pointer"
                        >
                          Keep connected
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(true)}
                      className="text-xs font-bold text-navy-500 hover:text-navy-800 underline decoration-dotted cursor-pointer"
                    >
                      Disconnect wallet
                    </button>
                  )}
                </div>
              )}

              {error !== null && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {status === "connecting" && (
                <div className="mt-4 p-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-700 font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  <span>Waiting for your wallet to approve the connection…</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: what connecting unlocks */}
          <div className="md:col-span-5 bg-gradient-to-br from-primary-50/80 via-blue-50/50 to-primary-100/30 rounded-[26px] p-6 border border-white/85 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrandLogoIcon className="w-8 h-8" />
                <span className="font-extrabold text-sm text-navy-900 tracking-tight">
                  Growtrack Access
                </span>
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-navy-900 leading-snug tracking-tight">
                Look up one wallet <br />
                <span className="text-primary-500">free, no connection.</span>
              </h4>

              <p className="text-xs text-navy-600 mt-3 leading-relaxed font-normal">
                Keep browsing single wallets anonymously. Connect only when you want the features
                that need a signer.
              </p>
            </div>

            <div className="my-6 space-y-2 text-xs text-navy-600 font-medium">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                <span>Track and consolidate multiple wallets</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                <span>Generate the full portfolio report</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                <span>Pay per query in USDC via x402 — no subscription</span>
              </div>
            </div>

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
