import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSearch } from "@/components/landing/HeroSearch";
import { ChainStatusGrid } from "@/components/landing/ChainStatusGrid";
import { TransparencyPillars } from "@/components/landing/TransparencyPillars";
import { X402ProtocolFlow } from "@/components/landing/X402ProtocolFlow";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-algorand selection:text-canvas font-sans flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSearch />
        <ChainStatusGrid />
        <TransparencyPillars />
        <X402ProtocolFlow />
      </main>
      <Footer />
    </div>
  );
}
