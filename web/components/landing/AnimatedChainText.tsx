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
  { name: "SOL", color: "#9945FF" }
];

export function AnimatedChainText() {
  const [chainIndex, setChainIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedText(CHAINS[chainIndex].name);
      const timer = setTimeout(() => {
        setChainIndex((prev) => (prev + 1) % CHAINS.length);
      }, 2000);
      return () => clearTimeout(timer);
    }

    const currentChain = CHAINS[chainIndex];
    const targetText = currentChain.name;

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing character by character
      if (displayedText.length < targetText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(targetText.slice(0, displayedText.length + 1));
        }, 110);
      } else {
        // Pause after completing the word (~1200ms)
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1200);
      }
    } else {
      // Deleting character by character
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(targetText.slice(0, displayedText.length - 1));
        }, 70);
      } else {
        // Pause briefly before next word
        timeout = setTimeout(() => {
          setIsDeleting(false);
          setChainIndex((prev) => (prev + 1) % CHAINS.length);
        }, 300);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, chainIndex, reducedMotion]);

  const currentChain = CHAINS[chainIndex];

  return (
    <span
      className="inline-flex items-baseline min-w-[75px] sm:min-w-[95px] text-left transition-colors duration-200"
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
