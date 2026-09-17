"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, Shield, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#1A2333] bg-[#000000] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Manifesto */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1A2333] bg-[#0D111A] shadow-md">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#00ECB5]"
                >
                  <path
                    d="M4 19L11 5L15 12L13 15.5L10.5 11L6.5 19H4ZM14 19L20 9L18 5.5L10.5 19H14Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <span className="font-sans font-black text-white tracking-wider text-xl">
                GROWTRACK
              </span>
              <span className="rounded-full border border-[#00ECB5]/30 bg-[#00ECB5]/10 px-3 py-0.5 text-xs font-mono font-semibold text-[#00ECB5]">
                Powered by Algorand x402
              </span>
            </div>

            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md font-sans">
              Growtrack is an institutional multichain intelligence layer engineered for
              uncompromising data truthfulness. Built on Algorand payment rails to power autonomous
              agent finance without subscriptions or synthetic zero-dollar illusions.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#94A3B8]">
                <Shield className="h-4 w-4 text-[#00ECB5]" />
                <span>100% Non-Custodial Architecture</span>
              </span>
            </div>
          </div>

          {/* Developer Protocol Links */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Developer APIs
            </h4>
            <ul className="space-y-2.5 text-xs font-mono text-[#94A3B8]">
              <li>
                <a
                  href="/docs"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>Fastify OpenAPI Docs</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="/v1/chains"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>Chain Registry</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="/health"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>Health Check & Ping</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="/metrics"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>Prometheus Metrics</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Ecosystem & Rails */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Ecosystem & Challenge
            </h4>
            <ul className="space-y-2.5 text-xs font-mono text-[#94A3B8]">
              <li>
                <a
                  href="https://algorand.co"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>Algorand Official</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://x402.org"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>x402 Protocol Spec</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#1A2333] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#94A3B8]">
          <div>
            Official Entry for the{" "}
            <strong className="text-white font-normal">Algorand Global x402 Challenge</strong>.
          </div>
          <div className="flex items-center gap-3">
            <span>RFC 9110 HTTP 402</span>
            <span>•</span>
            <span>Zero Fabricated Balances</span>
            <span>•</span>
            <span>© 2026 Growtrack</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
