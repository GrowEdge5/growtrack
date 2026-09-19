import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { WhaleTracking } from "@/components/landing/WhaleTracking";
import { Capabilities } from "@/components/landing/Capabilities";
import { WhatNext } from "@/components/landing/WhatNext";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="site-atmosphere min-h-screen text-navy-800 selection:bg-primary-500 selection:text-white font-sans flex flex-col antialiased overflow-x-hidden">
      {/* Main App Bar */}
      <Navbar />

      {/* Main Content Sections Matching Visual Source of Truth */}
      <main className="flex-1 relative z-10">
        {/* Section 1: Hero & Perspective Showcase (Ref: IMAGE 5) */}
        <Hero />

        {/* Section 2: Whale Portfolio Tracking */}
        <WhaleTracking />

        {/* Section 3: Institutional Capabilities Bento & Donut Analytics */}
        <Capabilities />

        {/* Section 4: What's Next & Feature Preview */}
        <WhatNext />
      </main>

      {/* Light Glass Footer */}
      <Footer />
    </div>
  );
}
