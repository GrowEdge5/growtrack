import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { WalletModalProvider } from "@/context/WalletModalContext";
import { WalletSessionProvider } from "@/context/WalletSessionContext";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://growtrack.pro"),
  title: "Growtrack | Multichain Wallet Intelligence",
  description:
    "Real-time multi-chain portfolio tracking, live on-chain DeFi intelligence, and x402 micropayments on Algorand rails. Look up any EVM, Algorand, Solana, or Bitcoin address.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: "Growtrack | Multichain Wallet Intelligence",
    description:
      "Real-time multi-chain portfolio tracking, live on-chain DeFi intelligence, and x402 micropayments on Algorand rails.",
    url: "https://growtrack.pro",
    siteName: "Growtrack",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1024,
        height: 1024,
        alt: "Growtrack Logo"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Growtrack | Multichain Wallet Intelligence",
    description:
      "Real-time multi-chain portfolio tracking, live on-chain DeFi intelligence, and x402 micropayments on Algorand rails.",
    site: "@growtrackpro",
    creator: "@growtrackpro",
    images: ["/opengraph-image.png"]
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
