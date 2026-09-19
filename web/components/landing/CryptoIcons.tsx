import React from "react";

/**
 * Growtrack Brand Emblem (Exact Match to Reference):
 * - Blue 3D glass squircle body
 * - Specular top gloss reflection
 * - White inner bevel glow
 * - Crisp white magnifying glass
 */
export function BrandLogoIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div
      className={`logo-search-glass rounded-[14px] flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative z-10"
      >
        <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M15 15L20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Direct Image Components using the actual user-supplied logo assets.
 * Sizes increased ~20% per user instructions with object-contain.
 */
export function AlgorandCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/algorand.png"
      alt="Algorand"
      className={`object-contain flex-shrink-0 ${className}`}
    />
  );
}

export function BnbCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/bnb.png"
      alt="BNB Chain"
      className={`object-contain rounded-full flex-shrink-0 ${className}`}
    />
  );
}

export function EthereumCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/ethereum.png"
      alt="Ethereum"
      className={`object-contain rounded-full flex-shrink-0 ${className}`}
    />
  );
}

export function HyperliquidCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/hyperliquid.svg"
      alt="Hyperliquid"
      className={`object-contain flex-shrink-0 ${className}`}
    />
  );
}

export function BitcoinCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/bitcoin.svg"
      alt="Bitcoin"
      className={`object-contain rounded-full flex-shrink-0 ${className}`}
    />
  );
}

/**
 * Curved Doodle Arrows matching handwriting callouts in reference screenshots
 */
export function CurvedArrowDoodle({
  direction = "right",
  className = "w-8 h-8"
}: {
  direction?: "right" | "left" | "down-left" | "down-right";
  className?: string;
}) {
  if (direction === "down-left") {
    return (
      <svg viewBox="0 0 40 30" fill="none" className={className}>
        <path
          d="M36 4C28 6 12 12 10 24M10 24L17 21M10 24L7 17"
          stroke="#2563EB"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (direction === "down-right") {
    return (
      <svg viewBox="0 0 40 30" fill="none" className={className}>
        <path
          d="M4 4C12 6 28 12 30 24M30 24L23 21M30 24L33 17"
          stroke="#2563EB"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (direction === "left") {
    return (
      <svg viewBox="0 0 35 25" fill="none" className={className}>
        <path
          d="M31 8C21 4 11 8 7 18M7 18L13 17M7 18L8 12"
          stroke="#2563EB"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 35 25" fill="none" className={className}>
      <path
        d="M4 8C14 4 24 8 28 18M28 18L22 17M28 18L27 12"
        stroke="#2563EB"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
