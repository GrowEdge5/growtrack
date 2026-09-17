"use client";

import React, { useState } from "react";
import { Check, Clock, ArrowRight } from "lucide-react";

interface ChainItem {
  id: string;
  name: string;
  symbol: string;
  symbolStyle: string;
  status: "live" | "live_native" | "upcoming";
  statusLabel: string;
  statusBadge: string;
  standards: string;
  description: string;
}

const CHAINS: ChainItem[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "Ξ",
    symbolStyle:
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white",
    status: "live",
    statusLabel: "Live ✓",
    statusBadge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    standards: "ERC-20 & Native ETH",
    description: "Multi-contract asset tracking & verified valuations"
  },
  {
    id: "algorand",
    name: "Algorand",
    symbol: "A",
    symbolStyle:
      "bg-[#00D2B4]/10 text-[#00D2B4] border-[#00D2B4]/30 group-hover:bg-[#00D2B4] group-hover:text-[#090A0F]",
    status: "live_native",
    statusLabel: "Live Native ✓",
    statusBadge: "border-[#00D2B4]/30 bg-[#00D2B4]/10 text-[#00D2B4]",
    standards: "ASA & Native ALGO",
    description: "Native asset indexer & x402 payment settlement"
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "S",
    symbolStyle:
      "bg-purple-500/10 text-purple-400 border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white",
    status: "upcoming",
    statusLabel: "Coming Q3",
    statusBadge: "border-[#1E2436] bg-[#090A0F] text-[#94A3B8]",
    standards: "SPL & Native SOL",
    description: "High-throughput token accounting in development"
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "₿",
    symbolStyle:
      "bg-amber-500/10 text-amber-400 border-amber-500/30 group-hover:bg-amber-500 group-hover:text-[#090A0F]",
    status: "upcoming",
    statusLabel: "Coming Q3",
    statusBadge: "border-[#1E2436] bg-[#090A0F] text-[#94A3B8]",
    standards: "UTXO & Taproot",
    description: "Multi-address balance aggregation in development"
  }
];

export function ChainStatusGrid() {
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  return (
    <section
      id="supported-chains"
      className="py-16 border-b border-[#1E2436] bg-[#090A0F] relative"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Strip Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight">
              Supported Ecosystems
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">
              Seamlessly unified multichain balance aggregation.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white">Live Ingestion</span>
            </span>
            <span className="text-[#1E2436]">•</span>
            <span>Non-Custodial</span>
          </div>
        </div>

        {/* Sleek Interactive Horizontal Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CHAINS.map((chain) => {
            const isHovered = hoveredChain === chain.id;
            return (
              <div
                key={chain.id}
                onMouseEnter={() => setHoveredChain(chain.id)}
                onMouseLeave={() => setHoveredChain(null)}
                className={`group relative flex items-center justify-between rounded-2xl border p-4 bg-[#111523] transition-all duration-300 ${
                  chain.status !== "upcoming"
                    ? "border-[#1E2436] hover:border-[#00D2B4]/50 hover:shadow-lg hover:-translate-y-1"
                    : "border-[#1E2436]/70 opacity-75 hover:opacity-100 hover:border-[#1E2436]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Circular Icon */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-base font-bold transition-all duration-300 ${chain.symbolStyle}`}
                  >
                    {chain.symbol}
                  </div>

                  {/* Name & Standard highlight on hover */}
                  <div>
                    <div className="font-sans font-bold text-white text-sm">{chain.name}</div>
                    <div className="text-xs font-mono transition-colors duration-200 text-[#94A3B8] group-hover:text-[#00D2B4]">
                      {chain.standards}
                    </div>
                  </div>
                </div>

                {/* Status Pill */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border ${chain.statusBadge}`}
                  >
                    {chain.statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
