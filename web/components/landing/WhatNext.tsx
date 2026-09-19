"use client";

import React, { useState } from "react";
import { Sparkles, Zap, Box, Users, ArrowRight, BarChart2, Check } from "lucide-react";
import { AlgorandCoinImg, CurvedArrowDoodle } from "./CryptoIcons";

export function WhatNext() {
  const [subscribed, setSubscribed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setShowModal(false);
        setSubscribed(false);
        setEmail("");
      }, 2000);
    }
  };

  return (
    <section className="relative pt-16 pb-24 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 z-10">
        {/* Floating 3D Tiles and Doodles matching Image 5 */}
        {/* Left Floating Elements */}
        <div className="hidden lg:block absolute left-4 xl:left-8 top-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide -rotate-6 drop-shadow-sm">
              Bigger <br /> Possibilities <br /> Ahead
            </span>
            <CurvedArrowDoodle direction="down-right" className="w-8 h-8 text-primary-500" />
          </div>
          <div className="glass-frosted-tile w-24 h-24 rounded-3xl p-3 flex items-center justify-center transform -rotate-12 pointer-events-auto">
            <AlgorandCoinImg className="w-14 h-14" />
          </div>
        </div>

        {/* Right Floating Elements */}
        <div className="hidden lg:block absolute right-4 xl:right-8 top-10 pointer-events-none">
          <div className="flex items-center justify-end gap-2 mb-3">
            <CurvedArrowDoodle direction="down-left" className="w-8 h-8 text-primary-500" />
            <span className="font-handwriting text-primary-600 text-2xl font-bold tracking-wide rotate-6 drop-shadow-sm">
              Track <br /> Analyse <br /> Grow.
            </span>
          </div>
          <div className="glass-frosted-tile w-24 h-24 rounded-3xl p-3 flex items-center justify-center transform rotate-12 ml-auto pointer-events-auto">
            <BarChart2 className="w-12 h-12 text-primary-500" />
          </div>
        </div>

        {/* Header Content */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          {/* What's Next Pill */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-100/80 border border-primary-200 text-xs font-black text-primary-600 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            <span>What's Next</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-navy-900 tracking-tight leading-[1.12]">
            More things are <br />
            <span className="text-primary-500">loading soon....</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-navy-500 font-normal max-w-2xl mx-auto">
            We're building more powerful tools, deeper insights, and new capabilities for the
            Algorand ecosystem. Stay tuned and be part of the journey.
          </p>
        </div>

        {/* 3 Glass Feature Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {/* Card 1: New Features */}
          <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex items-start gap-4 hover:shadow-glassHover transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm flex-shrink-0">
              <Zap className="w-6 h-6 fill-primary-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-navy-900">New Features</h3>
              <p className="text-xs text-navy-500 mt-1 leading-relaxed">
                Smarter tracking, deeper analytics and more chains.
              </p>
            </div>
          </div>

          {/* Card 2: More Integrations */}
          <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex items-start gap-4 hover:shadow-glassHover transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm flex-shrink-0">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-navy-900">More Integrations</h3>
              <p className="text-xs text-navy-500 mt-1 leading-relaxed">
                DeFi, NFTs, real-time data and beyond.
              </p>
            </div>
          </div>

          {/* Card 3: Bigger Community */}
          <div className="glass-frosted rounded-[28px] p-6 shadow-glass border border-white flex items-start gap-4 hover:shadow-glassHover transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 shadow-sm flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-navy-900">Bigger Community</h3>
              <p className="text-xs text-navy-500 mt-1 leading-relaxed">
                Built with the community, for the future.
              </p>
            </div>
          </div>
        </div>

        {/* Central Stay Updated CTA Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowModal(true)}
            className="btn-connect-wallet text-white px-8 py-3.5 rounded-full font-bold text-base flex items-center gap-2.5 cursor-pointer"
          >
            <span>Stay Updated</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Modal for Stay Updated */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/30 backdrop-blur-sm p-4">
            <div className="glass-frosted rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-navy-400 hover:text-navy-700 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 border border-navy-100"
              >
                ✕
              </button>

              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-navy-900">Get Early Access</h3>
                <p className="text-xs text-navy-500 mt-1">
                  Be the first to know when new Algorand x402 intelligence feeds and multichain
                  features drop.
                </p>

                {subscribed ? (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 text-accentGreen font-bold text-sm flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>You're on the priority list!</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="mt-5 space-y-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3 rounded-full bg-white/90 border border-navy-200 text-navy-800 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <button
                      type="submit"
                      className="w-full btn-connect-wallet text-white py-3 rounded-full font-bold text-sm"
                    >
                      Subscribe for Updates
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
