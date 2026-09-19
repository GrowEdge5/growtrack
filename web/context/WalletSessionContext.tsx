"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { fetchAlgorandPaymentParams } from "@/lib/api";
import {
  WalletConnectionError,
  connectWallet,
  disconnectWallet,
  reconnectWallet,
  type NetworkContext,
  type WalletId,
  type WalletSession
} from "@/lib/wallets";

// Holds the *real* connected wallet for the whole app.
//
// The product rule this exists to enforce: looking up ONE wallet requires nothing —
// no account, no connection, no payment. Connecting is what unlocks the things that
// genuinely need a signer: tracking additional wallets, consolidated multi-wallet
// views, and the x402-paid report. So this context is deliberately not used to gate
// the free single-address read.
//
// The connection is a real WalletConnect session with an Algorand wallet; the only
// thing persisted across reloads is which wallet was used, so the session can be
// re-attached without a second approval prompt. No key, seed or signature of the
// user's is ever stored.

const STORAGE_KEY = "growtrack.walletId";

export type WalletStatus = "restoring" | "disconnected" | "connecting" | "connected";

interface WalletSessionContextValue {
  status: WalletStatus;
  session: WalletSession | null;
  error: string | null;
  /** True once a wallet is connected and can sign. */
  isConnected: boolean;
  connect: (id: WalletId) => Promise<boolean>;
  disconnect: () => Promise<void>;
  dismissError: () => void;
}

const WalletSessionContext = createContext<WalletSessionContextValue | undefined>(undefined);

// Fallback used only when the API's params endpoint is unreachable. Mainnet is the
// network this deployment charges on; if it is actually misconfigured the payment
// flow's network check catches the mismatch before anything is signed.
const FALLBACK_NETWORK: NetworkContext = { genesisId: "mainnet-v1.0" };

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("restoring");
  const [session, setSession] = useState<WalletSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkContext>(FALLBACK_NETWORK);

  // The network comes from the API, so a wallet can only ever be asked to sign for
  // the network the server prices on.
  useEffect(() => {
    let cancelled = false;
    void fetchAlgorandPaymentParams()
      .then((params) => {
        if (!cancelled && params.genesisId.length > 0) {
          setNetwork({ genesisId: params.genesisId });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-attach a previous session on load. This is a silent, one-shot attempt: a
  // wallet that is no longer reachable simply leaves the app disconnected.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null || stored.length === 0) {
        if (!cancelled) {
          setStatus("disconnected");
        }
        return;
      }

      const restored = await reconnectWallet(stored as WalletId, network).catch(() => null);
      if (cancelled) {
        return;
      }
      if (restored === null) {
        window.localStorage.removeItem(STORAGE_KEY);
        setStatus("disconnected");
        return;
      }
      setSession(restored);
      setStatus("connected");
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [network]);

  const connect = useCallback(
    async (id: WalletId): Promise<boolean> => {
      setStatus("connecting");
      setError(null);
      try {
        const connected = await connectWallet(id, network);
        window.localStorage.setItem(STORAGE_KEY, id);
        setSession(connected);
        setStatus("connected");
        return true;
      } catch (caught) {
        const message =
          caught instanceof WalletConnectionError
            ? caught.message
            : "Could not connect that wallet. Please try again.";
        setError(message);
        setStatus("disconnected");
        return false;
      }
    },
    [network]
  );

  const disconnect = useCallback(async () => {
    if (session !== null) {
      await disconnectWallet(session.id);
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setStatus("disconnected");
    setError(null);
  }, [session]);

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      status,
      session,
      error,
      isConnected: status === "connected" && session !== null,
      connect,
      disconnect,
      dismissError
    }),
    [status, session, error, connect, disconnect, dismissError]
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession(): WalletSessionContextValue {
  const context = useContext(WalletSessionContext);
  if (context === undefined) {
    throw new Error("useWalletSession must be used within a WalletSessionProvider");
  }
  return context;
}
