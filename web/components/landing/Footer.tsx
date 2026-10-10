"use client";

import React from "react";
import Link from "next/link";
import { Github, Instagram, Mail } from "lucide-react";
import { BrandLogoIcon } from "./CryptoIcons";

function XLogoIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="w-full border-t border-white/90 bg-white/60 backdrop-blur-xl py-7 mt-12 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand + Badge + Motto */}
        <div className="flex items-center gap-3.5">
          <BrandLogoIcon className="w-11 h-11" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-navy-900 tracking-tight">GROWTRACK</span>
              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100 shadow-sm">
                Powered by Algorand x402
              </span>
            </div>
            <p className="text-xs text-navy-400 font-medium mt-0.5">
              Track. Analyse. Grow. Onchain.
            </p>
          </div>
        </div>

        {/* Center: Official Social Links */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-navy-500 mr-1">Find us on</span>

          {/* X (Twitter) */}
          <a
            href="https://x.com/growtrackpro"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            title="Growtrack on X (@growtrackpro)"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <XLogoIcon className="w-3.5 h-3.5" />
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/growtrackofficial/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            title="Growtrack on Instagram (@growtrackofficial)"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <Instagram className="w-3.5 h-3.5" />
          </a>

          {/* Telegram */}
          <a
            href="https://t.me/+FrsbafKWFWBjNzA1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            title="Growtrack on Telegram"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <TelegramIcon className="w-3.5 h-3.5" />
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/GrowEdge5/growtrack"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            title="Growtrack on GitHub"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <Github className="w-3.5 h-3.5" />
          </a>

          {/* Email Support */}
          <a
            href="mailto:growtrackofficial@gmail.com"
            aria-label="Email Support"
            title="Email us at growtrackofficial@gmail.com"
            className="w-8 h-8 rounded-full bg-white/90 border border-navy-100 hover:border-primary-300 hover:text-primary-600 text-navy-600 shadow-sm flex items-center justify-center transition-all hover:scale-110"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Right: developer and trust entry points */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-navy-500">
          <Link href="/about" className="hover:text-primary-600 transition-colors">
            About
          </Link>
          <span className="text-navy-300">·</span>
          <Link href="/privacy" className="hover:text-primary-600 transition-colors">
            Privacy
          </Link>
          <span className="text-navy-300">·</span>
          <Link href="/terms" className="hover:text-primary-600 transition-colors">
            Terms
          </Link>
          <span className="text-navy-300">·</span>
          <Link href="#x402" className="hover:text-primary-600 transition-colors">
            x402
          </Link>
        </div>
      </div>
    </footer>
  );
}
