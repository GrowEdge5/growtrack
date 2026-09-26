import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { WalletModalProvider } from "@/context/WalletModalContext";
import { WalletSessionProvider } from "@/context/WalletSessionContext";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Growtrack | Multichain wallet intelligence",
  description:
    "Look up any EVM, Algorand, Solana or Bitcoin address and see its real holdings and USD value. Pay per query in USDC on Algorand via x402.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">
        {/* Session outside the modal provider: the modal reads connection state, and
            the gate hook needs both. */}
        <WalletSessionProvider>
          <WalletModalProvider>
            {children}
            <WalletConnectModal />
          </WalletModalProvider>
        </WalletSessionProvider>
      </body>
    </html>
  );
}
