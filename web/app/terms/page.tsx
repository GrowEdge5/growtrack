import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function TermsPage() {
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

        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
              <p className="text-xs text-gray-400 mt-1">Last updated: October 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-sm text-gray-400 space-y-6 leading-relaxed">
            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">1. Nature of the Service</h2>
              <p>
                Growtrack provides multichain ledger data inspection, asset valuation, and on-chain
                intelligence. All figures and valuations are derived from public third-party pricing
                feeds and decentralized RPC endpoints for informational purposes only.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">2. Not Financial Advice</h2>
              <p>
                Information displayed on Growtrack does not constitute financial, investment, legal,
                or tax advice. Blockchain assets and DeFi protocols carry inherent volatility and
                smart contract risks.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">3. Non-Custodial & Autonomous Usage</h2>
              <p>
                You retain complete control of your cryptographic keys and wallets. Growtrack cannot
                execute transactions, move funds, or alter state on any blockchain on your behalf.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">4. x402 Micropayments & Finality</h2>
              <p>
                x402 payments are executed on the Algorand blockchain. Once a transaction is
                confirmed by consensus on Algorand, the settlement is final and non-reversible.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
