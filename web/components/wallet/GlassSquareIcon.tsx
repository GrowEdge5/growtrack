"use client";

import React from "react";

export type SupportedCoin =
  | "algo"
  | "algorand"
  | "eth"
  | "ethereum"
  | "btc"
  | "bitcoin"
  | "bnb"
  | "bsc"
  | "hype"
  | "hyperliquid"
  | "usdc"
  | "usdt"
  | "sol"
  | "solana";

interface GlassSquareIconProps {
  coin: SupportedCoin | string;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function GlassSquareIcon({
  coin,
  className = "",
  iconClassName = "",
  size = "md"
}: GlassSquareIconProps) {
  const normalized = coin.toLowerCase().trim();

  // Container sizing
  const containerSizeClasses = {
    sm: "w-7 h-7 rounded-lg p-1",
    md: "w-9 h-9 rounded-xl p-1.5",
    lg: "w-11 h-11 rounded-2xl p-2"
  }[size];

  // Render the official logo asset
  const renderCoin = () => {
    switch (normalized) {
      case "algo":
      case "algorand":
        return (
          <img
            src="/assets/coins/algorand.png"
            alt="Algorand"
            className={`w-full h-full object-contain ${iconClassName}`}
          />
        );
      case "eth":
      case "ethereum":
        return (
          <img
            src="/assets/coins/ethereum.png"
            alt="Ethereum"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "btc":
      case "bitcoin":
        return (
          <img
            src="/assets/coins/bitcoin.svg"
            alt="Bitcoin"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "bnb":
      case "bsc":
        return (
          <img
            src="/assets/coins/bnb.png"
            alt="BNB Chain"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "hype":
      case "hyperliquid":
        return (
          <img
            src="/assets/coins/hyperliquid.svg"
            alt="Hyperliquid"
            className={`w-full h-full object-contain ${iconClassName}`}
          />
        );
      case "usdc":
        return (
          <div className="w-full h-full rounded-full bg-[#2775CA] flex items-center justify-center text-white font-black text-[11px]">
            $
          </div>
        );
      case "usdt":
        return (
          <div className="w-full h-full rounded-full bg-[#26A17B] flex items-center justify-center text-white font-black text-[10px]">
            ₮
          </div>
        );
      case "sol":
      case "solana":
        return (
          <img
            src="/assets/coins/solana.png"
            alt="Solana"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      default:
        return (
          <div className="w-full h-full rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-extrabold text-[10px] uppercase">
            {normalized.slice(0, 3)}
          </div>
        );
    }
  };

  return (
    <div
      className={`glass-coin-tile flex items-center justify-center border border-white/90 shadow-xs flex-shrink-0 ${containerSizeClasses} ${className}`}
    >
      {renderCoin()}
    </div>
  );
}
