"use client";

import { useCallback } from "react";

import { useWalletModal } from "@/context/WalletModalContext";
import { useWalletSession } from "@/context/WalletSessionContext";

/**
 * The one place the "what needs a wallet" rule is expressed.
 *
 * Free and anonymous, always: looking up a single wallet address.
 *
 * Requires a connected wallet: anything that needs a signer — adding a second wallet
 * to a tracked list, the consolidated multi-wallet view, and the x402-paid portfolio
 * report. Those flows settle real USDC on Algorand, so there is no honest way to run
 * them without a wallet to sign from; the gate is the product's real constraint, not
 * a UX flourish.
 *
 * `requireWallet` returns true when the caller may proceed. When it returns false it
 * has already opened the connect modal with the reason, so the caller only has to
 * stop.
 */
export function useWalletGate(): {
  isConnected: boolean;
  requireWallet: (reason: string) => boolean;
} {
  const { isConnected } = useWalletSession();
  const { openWalletModal } = useWalletModal();

  const requireWallet = useCallback(
    (reason: string): boolean => {
      if (isConnected) {
        return true;
      }
      openWalletModal(reason);
      return false;
    },
    [isConnected, openWalletModal]
  );

  return { isConnected, requireWallet };
}
