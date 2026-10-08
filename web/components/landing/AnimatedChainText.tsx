"use client";

import React, { useState, useEffect } from "react";

interface ChainConfig {
  name: string;
  color: string;
}

const CHAINS: ChainConfig[] = [
  { name: "Algo", color: "#111827" },
  { name: "EVM", color: "#2563EB" },
  { name: "BSC", color: "#F3BA2F" },
  { name: "BTC", color: "#F7931A" },
  { name: "SOL", color: "#9945FF" },
  { name: "50+ CHAINS", color: "#10B981" }
];

export function AnimatedChainText() {
  const [chainIndex, setChainIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(CHAINS[0].name.length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = CHAINS[chainIndex].name;

    // Finished typing the current word: pause before starting delete
    if (!isDeleting && subIndex === currentWord.length) {
      const pauseTimer = setTimeout(() => {
        setIsDeleting(true);
      }, 1400);
      return () => clearTimeout(pauseTimer);
    }

    // Finished deleting: move to next chain and start typing
    if (isDeleting && subIndex === 0) {
      setIsDeleting(false);
      setChainIndex((prev) => (prev + 1) % CHAINS.length);
      return;
    }

    // Typing or deleting next character
    const typingTimer = setTimeout(
      () => {
        setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(typingTimer);
  }, [subIndex, isDeleting, chainIndex]);

  const currentChain = CHAINS[chainIndex];
  const displayedText = currentChain.name.substring(0, subIndex);

  return (
    <span
      className="inline-flex items-baseline min-w-[75px] sm:min-w-[95px] text-left transition-colors duration-200 whitespace-nowrap"
      style={{ color: currentChain.color }}
    >
      <span>{displayedText}</span>
      <span
        className="inline-block w-[3px] h-[0.82em] ml-1 bg-current animate-pulse align-baseline rounded-full"
        aria-hidden="true"
      />
    </span>
  );
}
