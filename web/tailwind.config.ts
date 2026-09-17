import type { Config } from "tailwindcss";

export default {
  content: [
    "./web/app/**/*.{ts,tsx}",
    "./web/components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        surface: "#0D111A",
        surfaceElevated: "#131926",
        line: "#1A2333",
        ink: "#FFFFFF",
        muted: "#94A3B8",
        algorand: "#00ECB5",
        algorandHover: "#00D2A1",
        sky: "#38BDF8",
        verified: "#10B981",
        warning: "#F59E0B",
        paywall: "#8B5CF6"
      },
      boxShadow: {
        mintGlow: "0 0 20px rgba(0, 236, 181, 0.3)",
        mintGlowSm: "0 0 12px rgba(0, 236, 181, 0.2)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
