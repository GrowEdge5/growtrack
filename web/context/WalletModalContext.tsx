"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface WalletModalContextType {
  isWalletModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  selectedWallet: string | null;
  selectWallet: (walletName: string) => void;
}

const WalletModalContext = createContext<WalletModalContextType | undefined>(undefined);

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const openWalletModal = () => setIsWalletModalOpen(true);
  const closeWalletModal = () => setIsWalletModalOpen(false);
  const selectWallet = (walletName: string) => setSelectedWallet(walletName);

  return (
    <WalletModalContext.Provider
      value={{
        isWalletModalOpen,
        openWalletModal,
        closeWalletModal,
        selectedWallet,
        selectWallet
      }}
    >
      {children}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error("useWalletModal must be used within a WalletModalProvider");
  }
  return context;
}
