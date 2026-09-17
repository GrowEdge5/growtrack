"use client";

import React, { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Check, Copy, Code2 } from "lucide-react";

interface StepDetail {
  id: number;
  title: string;
  badge: string;
  actor: "Client" | "Fastify Guard" | "Algorand Rail";
  summary: string;
  codeHeader: string;
  codeSnippet: string;
}

const FLOW_STEPS: StepDetail[] = [
  {
    id: 1,
    title: "Client Requests Protected Intelligence",
    badge: "HTTP GET",
    actor: "Client",
    summary:
      "The consumer (dApp, agent, or analyst) initiates a call to fetch fresh real-time wallet analytics without needing an API key or monthly SaaS subscription.",
    codeHeader: "Request (cURL)",
    codeSnippet: `curl -i -X GET "https://api.growtrack.pro/v1/wallets/ethereum/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/live" \\
  -H "Accept: application/json" \\
  -H "User-Agent: GrowtrackAgent/1.0"`
  },
  {
    id: 2,
    title: "Server Returns HTTP 402 Payment Required",
    badge: "STATUS 402",
    actor: "Fastify Guard",
    summary:
      "The x402 Fastify guard intercepts the unpaid request, returning Algorand settlement requirements directly in RFC-compliant response headers.",
    codeHeader: "Response Headers",
    codeSnippet: `HTTP/1.1 402 Payment Required
Content-Type: application/json
X-402-Version: 2.6.1
X-402-Network: algorand:testnet
X-402-Payment-Address: GROW402PAYOUT7K5EQ5N4U3L446TXF7M6Z46MTB4
X-402-Price-Asset-Id: 31566704 (USDC)
X-402-Price-Amount: 10000 (0.010000 USDC)
X-402-Challenge: 4f89ac3e-908b-4a77-a641-79e7be9401d4`
  },
  {
    id: 3,
    title: "Micro-Settlement Signed via Algorand Rails",
    badge: "AVM TXN",
    actor: "Algorand Rail",
    summary:
      "The client's wallet or agent signs a 0.01 USDC micro-transaction on Algorand testnet/mainnet with sub-3s finality and sub-cent network fee.",
    codeHeader: "Algorand Transaction Note & Verification",
    codeSnippet: `// Signed via @algorandfoundation/algokit-utils / @perawallet/connect
const signedPayment = await algodClient.sendRawTransaction({
  from: "USER_ALGORAND_ADDRESS",
  to: "GROW402PAYOUT7K5EQ5N4U3L446TXF7M6Z46MTB4",
  amount: 10000, // 0.01 USDC
  assetIndex: 31566704,
  note: "growtrack:challenge:4f89ac3e-908b"
});
// Confirmed in Round 41,892,104 (< 2.8s finality)`
  },
  {
    id: 4,
    title: "Premium Intelligence Payload Dispatched",
    badge: "STATUS 200",
    actor: "Fastify Guard",
    summary:
      "With the settlement proof verified on Algorand nodes, the server unlocks the live wallet intelligence payload immediately with zero credit card friction.",
    codeHeader: "Unlocked JSON Response",
    codeSnippet: `HTTP/1.1 200 OK
Content-Type: application/json
X-402-Settlement-Status: verified
X-402-TxID: 2J74FX...KLPQ

{
  "status": "success",
  "data": {
    "chain": "ethereum",
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "verifiedNetWorthUsd": "1842930.54",
    "pricingIntegrity": {
      "verifiedAssets": 14,
      "unpricedAssets": 2,
      "syntheticZeroFilled": false
    },
    "capturedAt": "2026-09-17T11:15:00.000Z"
  }
}`
  }
];

export function X402ProtocolFlow() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStepId, setActiveStepId] = useState(1);
  const [copied, setCopied] = useState(false);

  const currentStep = FLOW_STEPS.find((s) => s.id === activeStepId) ?? FLOW_STEPS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentStep.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="developer-specs" className="py-12 border-b border-[#1E2436] bg-[#090A0F] relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Sleek Minimalist Collapsible Drawer Header */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="group w-full max-w-2xl flex items-center justify-between rounded-2xl border border-[#1E2436] bg-[#111523] hover:border-[#00D2B4]/50 hover:bg-[#181E31] px-6 py-4 text-xs font-mono text-[#94A3B8] transition-all duration-200 shadow-md"
          >
            <div className="flex items-center gap-3">
              <Terminal className="h-4 w-4 text-[#00D2B4]" />
              <span className="text-white font-medium text-xs sm:text-sm">
                [+] Developer Protocol Specifications & Architecture Logs (Fastify, BullMQ, RFC
                9110)
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-white" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#94A3B8] group-hover:text-white" />
            )}
          </button>

          {/* Smooth Collapsed Content View (Only for Developers & Judges) */}
          {isOpen && (
            <div className="mt-6 w-full rounded-2xl border border-[#1E2436] bg-[#111523] overflow-hidden shadow-2xl transition-all duration-300">
              {/* Drawer Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1E2436] bg-[#0B0F19] px-6 py-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[#1E2436] mx-2">|</span>
                  <Code2 className="h-4 w-4 text-[#00D2B4]" />
                  <span className="font-mono text-xs text-white">
                    Fastify x402 Architecture Proof · Algorand Micro-Settlement Rail
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#94A3B8]">{currentStep.codeHeader}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 font-mono text-xs text-white hover:text-[#00D2B4] transition-colors px-3 py-1.5 rounded-lg border border-[#1E2436] bg-[#111523]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#94A3B8]" />
                        <span>Copy Spec</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step Navigation Tabs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#1E2436] bg-[#090A0F] text-xs font-mono">
                {FLOW_STEPS.map((step) => {
                  const isActive = step.id === activeStepId;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStepId(step.id)}
                      type="button"
                      className={`p-3.5 text-left border-r last:border-r-0 border-[#1E2436] transition-colors ${
                        isActive
                          ? "bg-[#111523] text-[#00D2B4] font-bold shadow-inner"
                          : "text-[#94A3B8] hover:text-white hover:bg-[#111523]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                        <span>0{step.id}</span>
                        <span className="rounded bg-[#1E2436] px-1.5 py-0.5 text-white">
                          {step.badge}
                        </span>
                      </div>
                      <div className="truncate text-xs font-sans">{step.title}</div>
                    </button>
                  );
                })}
              </div>

              {/* Console Body */}
              <div className="p-6 space-y-4">
                <div className="text-sm text-[#94A3B8] font-sans bg-[#090A0F] p-4 rounded-xl border border-[#1E2436]">
                  <strong className="text-[#00D2B4] font-mono">
                    Actor: {currentStep.actor} —{" "}
                  </strong>
                  {currentStep.summary}
                </div>

                <pre className="overflow-x-auto rounded-xl bg-[#070A0F] p-5 text-xs font-mono text-white leading-relaxed border border-[#1E2436]">
                  <code>{currentStep.codeSnippet}</code>
                </pre>
              </div>

              {/* Drawer Bottom Controls */}
              <div className="flex items-center justify-between border-t border-[#1E2436] bg-[#0B0F19] px-6 py-4 text-xs font-mono">
                <span className="text-[#94A3B8]">
                  Step {currentStep.id} of {FLOW_STEPS.length}
                </span>
                <div className="flex items-center gap-2">
                  {currentStep.id > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveStepId(currentStep.id - 1)}
                      className="px-4 py-1.5 rounded-lg border border-[#1E2436] bg-[#111523] text-white hover:border-[#00D2B4]/40"
                    >
                      ← Previous
                    </button>
                  )}
                  {currentStep.id < FLOW_STEPS.length ? (
                    <button
                      type="button"
                      onClick={() => setActiveStepId(currentStep.id + 1)}
                      className="px-4 py-1.5 rounded-lg border border-[#00D2B4]/40 bg-[#00D2B4]/10 text-[#00D2B4] hover:bg-[#00D2B4]/20 font-bold"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveStepId(1)}
                      className="px-4 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold"
                    >
                      Replay Flow ↺
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
