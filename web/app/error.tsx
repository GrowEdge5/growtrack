"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Growtrack client error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen site-atmosphere flex items-center justify-center p-6 text-navy-800">
      <div className="glass-frosted max-w-md w-full p-8 rounded-[28px] border border-white shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-navy-900 tracking-tight">Something went wrong</h2>
        <p className="text-xs text-navy-500 mt-2 mb-6">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="btn-connect-wallet text-white px-6 py-2.5 rounded-full font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-sm hover:scale-105 transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload Dashboard</span>
        </button>
      </div>
    </div>
  );
}
