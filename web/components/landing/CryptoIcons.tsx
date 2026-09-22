import React from "react";

/**
 * Official Growtrack Brand Logo:
 * Uses the supplied official Growtrack logo asset as the single source of truth.
 */
export function BrandLogoIcon({
  className = "w-10 h-10",
  imgClassName = "w-full h-full object-contain"
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${className}`}>
      <img
        src="/assets/branding/growtrack-logo.png"
        alt="Growtrack"
        className={`object-contain drop-shadow-sm ${imgClassName}`}
      />
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

export function SolanaCoinImg({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img
      src="/assets/coins/solana.png"
      alt="Solana"
      className={`object-contain rounded-full flex-shrink-0 ${className}`}
    />
  );
}

// Deprecated alias to prevent breaks during refactoring
export const HyperliquidCoinImg = SolanaCoinImg;

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
