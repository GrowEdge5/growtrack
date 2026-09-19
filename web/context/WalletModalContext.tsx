"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

// Controls the connect-wallet modal, and — just as importantly — carries WHY it was
// opened. A modal that says "connect a wallet" when the user asked for a second
// wallet or a portfolio report is the mismatch this exists to prevent: the user
// should be told which action needs a signer before being asked for one.

interface WalletModalContextType {
  isWalletModalOpen: boolean;
  /** `reason` is shown in the modal, e.g. "Add a second wallet". */
  openWalletModal: (reason?: string) => void;
  closeWalletModal: () => void;
  /** The action that triggered the modal, or null when opened unprompted. */
  reason: string | null;
}

const WalletModalContext = createContext<WalletModalContextType | undefined>(undefined);

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const openWalletModal = useCallback((nextReason?: string) => {
    setReason(nextReason ?? null);
    setIsWalletModalOpen(true);
  }, []);

  const closeWalletModal = useCallback(() => {
    setIsWalletModalOpen(false);
    setReason(null);
  }, []);

  const value = useMemo(
    () => ({ isWalletModalOpen, openWalletModal, closeWalletModal, reason }),
    [isWalletModalOpen, openWalletModal, closeWalletModal, reason]
  );

  return <WalletModalContext.Provider value={value}>{children}</WalletModalContext.Provider>;
}

export function useWalletModal() {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error("useWalletModal must be used within a WalletModalProvider");
  }
  return context;
}
