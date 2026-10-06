"use client";

import React from "react";
import { getChainLogoSrc } from "@/lib/address";

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
  | "solana"
  | "base"
  | "arbitrum"
  | "arb"
  | "optimism"
  | "op"
  | "polygon"
  | "pol"
  | "matic"
  | "avalanche"
  | "avax"
  | "dai"
  | "link"
  | "uni"
  | "wbtc"
  | "aave"
  | "pepe"
  | "cake"
  | "shib";

interface GlassSquareIconProps {
  coin: SupportedCoin | string;
  chain?: string;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function GlassSquareIcon({
  coin,
  chain,
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

  // Chain badge sizing
  const chainBadgeClasses = {
    sm: "w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-[1px]",
    md: "w-4 h-4 -bottom-1 -right-1 p-0.5",
    lg: "w-5 h-5 -bottom-1 -right-1 p-0.5"
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
      case "usdbc":
      case "axlusdc":
        return (
          <img
            src="/assets/coins/usdc.png"
            alt="USDC"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "usdt":
      case "axlusdt":
        return (
          <img
            src="/assets/coins/usdt.png"
            alt="USDT"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
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
      case "base":
        return (
          <img
            src="/assets/coins/base.png"
            alt="Base"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "arbitrum":
      case "arb":
        return (
          <img
            src="/assets/coins/arbitrum.png"
            alt="Arbitrum"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "optimism":
      case "op":
        return (
          <img
            src="/assets/coins/optimism.png"
            alt="Optimism"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "polygon":
      case "pol":
      case "matic":
        return (
          <img
            src="/assets/coins/polygon.png"
            alt="Polygon"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "avalanche":
      case "avax":
        return (
          <img
            src="/assets/coins/avalanche.png"
            alt="Avalanche"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "dai":
        return (
          <img
            src="/assets/coins/dai.png"
            alt="Dai"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "link":
        return (
          <img
            src="/assets/coins/link.png"
            alt="ChainLink"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "uni":
        return (
          <img
            src="/assets/coins/uni.png"
            alt="Uniswap"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "wbtc":
        return (
          <img
            src="/assets/coins/wbtc.png"
            alt="Wrapped BTC"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "aave":
        return (
          <img
            src="/assets/coins/aave.png"
            alt="Aave"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "pepe":
        return (
          <img
            src="/assets/coins/pepe.png"
            alt="Pepe"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "cake":
        return (
          <img
            src="/assets/coins/cake.png"
            alt="PancakeSwap"
            className={`w-full h-full object-contain rounded-full ${iconClassName}`}
          />
        );
      case "shib":
        return (
          <img
            src="/assets/coins/shib.png"
            alt="Shiba Inu"
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
      className={`glass-coin-tile relative flex items-center justify-center border border-white/90 shadow-xs flex-shrink-0 ${containerSizeClasses} ${className}`}
    >
      {renderCoin()}

      {/* DeBank-style chain overlay badge */}
      {chain && (
        <div
          className={`absolute rounded-full bg-white border border-navy-100/80 shadow-xs flex items-center justify-center overflow-hidden ring-1 ring-white/90 z-10 pointer-events-none ${chainBadgeClasses}`}
          title={chain}
        >
          <img
            src={getChainLogoSrc(chain)}
            alt={chain}
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      )}
    </div>
  );
}
