"use client";

import React from "react";
import { getChainLogoSrc } from "@/lib/address";

const KNOWN_COIN_LOGOS: Record<string, string> = {
  algo: "/assets/coins/algorand.png",
  algorand: "/assets/coins/algorand.png",
  eth: "/assets/coins/ethereum.png",
  ethereum: "/assets/coins/ethereum.png",
  weth: "/assets/coins/ethereum.png",
  btc: "/assets/coins/bitcoin.svg",
  bitcoin: "/assets/coins/bitcoin.svg",
  wbtc: "/assets/coins/wbtc.png",
  btcb: "/assets/coins/wbtc.png",
  bnb: "/assets/coins/bnb.png",
  bsc: "/assets/coins/bnb.png",
  wbnb: "/assets/coins/bnb.png",
  sol: "/assets/coins/solana.png",
  solana: "/assets/coins/solana.png",
  base: "/assets/coins/base.png",
  arbitrum: "/assets/coins/arbitrum.png",
  arb: "/assets/coins/arbitrum.png",
  optimism: "/assets/coins/optimism.png",
  op: "/assets/coins/optimism.png",
  polygon: "/assets/coins/polygon.png",
  pol: "/assets/coins/polygon.png",
  matic: "/assets/coins/polygon.png",
  wmatic: "/assets/coins/polygon.png",
  avalanche: "/assets/coins/avalanche.png",
  avax: "/assets/coins/avalanche.png",
  wavax: "/assets/coins/avalanche.png",
  linea: "/assets/coins/linea.png",
  blast: "/assets/coins/blast.png",
  scroll: "/assets/coins/scroll.png",
  zksync: "/assets/coins/zksync.png",
  ink: "/assets/coins/ink.png",
  mode: "/assets/coins/mode.png",
  zora: "/assets/coins/zora.png",
  gnosis: "/assets/coins/gnosis.png",
  celo: "/assets/coins/celo.png",
  sei: "/assets/coins/sei.png",
  sonic: "/assets/coins/sonic.png",
  opbnb: "/assets/coins/opbnb.png",
  taiko: "/assets/coins/taiko.png",
  apechain: "/assets/coins/apechain.png",
  mantle: "/assets/coins/mantle.png",
  fantom: "/assets/coins/fantom.png",
  cronos: "/assets/coins/cronos.png",
  hyperliquid: "/assets/coins/hyperliquid.svg",
  hype: "/assets/coins/hyperliquid.svg",
  core: "/assets/coins/core.png",
  monad: "/assets/coins/monad.png",
  xlayer: "/assets/coins/xlayer.png",
  unichain: "/assets/coins/unichain.png",
  berachain: "/assets/coins/berachain.png",
  zetachain: "/assets/coins/zetachain.png",
  zircuit: "/assets/coins/zircuit.png",
  robinhood: "/assets/coins/robinhood.png",
  hemi: "/assets/coins/hemi.png",
  fuse: "/assets/coins/fuse.png",
  plume: "/assets/coins/plume.png",
  arc: "/assets/coins/arc.png",
  cyber: "/assets/coins/cyber.png",
  plasma: "/assets/coins/plasma.png",
  immutable: "/assets/coins/immutable.png",
  usdc: "/assets/coins/usdc.png",
  usdt: "/assets/coins/usdt.png",
  usdbc: "/assets/coins/usdc.png",
  axlusdc: "/assets/coins/usdc.png",
  axlusdt: "/assets/coins/usdt.png",
  dai: "/assets/coins/dai.png",
  link: "/assets/coins/link.png",
  uni: "/assets/coins/uni.png",
  uniswap: "/assets/coins/uni.png",
  aave: "/assets/coins/aave.png",
  pepe: "/assets/coins/pepe.png",
  cake: "/assets/coins/pancakeswap.png",
  pancakeswap: "/assets/coins/pancakeswap.png",
  shib: "/assets/coins/shib.png",
  polymarket: "/assets/coins/polymarket.png",
  pendle: "/assets/coins/pendle.png",
  velodrome: "/assets/coins/velodrome.png",
  lighter: "/assets/coins/lighter.png",
  variational: "/assets/coins/variational.png"
};

export interface GlassSquareIconProps {
  coin: string;
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

  const logoSrc =
    KNOWN_COIN_LOGOS[normalized] ?? (chain ? KNOWN_COIN_LOGOS[chain.toLowerCase()] : undefined);

  return (
    <div
      className={`glass-coin-tile relative flex items-center justify-center border border-white/90 shadow-xs flex-shrink-0 ${containerSizeClasses} ${className}`}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={coin}
          className={`w-full h-full object-contain rounded-full ${iconClassName}`}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-700 font-extrabold text-[10px] uppercase">
          {normalized.slice(0, 3)}
        </div>
      )}

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
