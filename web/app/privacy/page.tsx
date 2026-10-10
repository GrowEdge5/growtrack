import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-gray-400 mt-1">Last updated: October 2026</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-sm text-gray-400 space-y-6 leading-relaxed">
            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">1. Zero Custody & Zero Secret Access</h2>
              <p>
                Growtrack is strictly read-only and non-custodial. We never request, access,
                transmit, or store private keys, seed phrases, passwords, or personal identity
                documentation.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">2. Public Ledger Data</h2>
              <p>
                Wallet addresses queried on Growtrack are public blockchain identifiers. We query
                decentralized public RPC nodes, indexers, and public market feeds to compute
                balances and valuations.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">3. Caching & Performance</h2>
              <p>
                To provide instantaneous query response times and respect public RPC rate limits,
                query results are cached temporarily in encrypted memory and time-to-live
                datastores. We do not track off-chain real-world identities.
              </p>
            </section>

            <section className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h2 className="text-lg font-bold text-white">4. x402 Micropayments</h2>
              <p>
                When you initiate an x402 micropayment on Algorand, the transaction is executed
                directly between your wallet and the merchant settlement address via the GoPlausible
                facilitator. Your transaction hash is recorded publicly on the Algorand blockchain
                as an immutable receipt.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
