import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Cpu, Database, Award } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between selection:bg-primary-500/30">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="space-y-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Award className="w-3.5 h-3.5" />
              <span>Algorand Global x402 Challenge</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">About Growtrack</h1>
            <p className="mt-4 text-gray-400 text-base sm:text-lg leading-relaxed">
              Growtrack is a multichain wallet intelligence platform engineered for the Algorand
              Global x402 Challenge. We convert raw public blockchain ledger states into
              institutional financial intelligence, powered by zero-friction x402 micropayments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Shield className="w-6 h-6 text-emerald-400 mb-3" />
              <h3 className="font-bold text-base mb-1">Non-Custodial</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Growtrack never requests or stores private keys, recovery phrases, or credentials.
                All reads are derived strictly from public block ledgers.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Cpu className="w-6 h-6 text-primary-400 mb-3" />
              <h3 className="font-bold text-base mb-1">40+ Blockchains</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Aggregating real-time holdings across Ethereum, Base, Arbitrum, Algorand, Solana,
                Bitcoin, and 35+ EVM Layer 1 and Layer 2 networks.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Database className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="font-bold text-base mb-1">x402 Micropayments</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Paying per query in USDC on Algorand rails. No subscription lock-in, no API keys,
                and pure web-standard HTTP 402 payment requirements.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <h2 className="text-xl font-bold">Open-Source & Verifiable</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Growtrack is developed transparently for builders, analysts, and automated LLM agents.
              All payment settlements occur on Algorand MainNet and are publicly verifiable on-chain
              via block explorers.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/GrowEdge5/growtrack"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold underline underline-offset-4"
              >
                View Repository on GitHub &rarr;
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
