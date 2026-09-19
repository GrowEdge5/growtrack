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
        canvas: "#F7FBFF",
        surface: "#FFFFFF",
        primary: {
          50: "#EEF6FF",
          100: "#E0EFFE",
          200: "#BAE0FD",
          300: "#7DC4FC",
          400: "#38A4F8",
          500: "#1677FF",
          600: "#0958D9",
          700: "#003EB3"
        },
        navy: {
          900: "#0F172A",
          800: "#14213D",
          700: "#1E293B",
          600: "#334155",
          500: "#475569",
          400: "#64748B",
          300: "#94A3B8"
        },
        algorand: "#00D2B4",
        algorandMint: "#00ECB5",
        accentGreen: "#00B88A",
        accentOrange: "#F59E0B",
        accentYellow: "#FACC15",
        accentPurple: "#8B5CF6"
      },
      boxShadow: {
        glass: "0 20px 50px rgba(22, 119, 255, 0.08), 0 4px 16px rgba(15, 23, 42, 0.03)",
        glassHover: "0 28px 65px rgba(22, 119, 255, 0.14), 0 8px 24px rgba(15, 23, 42, 0.06)",
        glassTile:
          "0 18px 40px rgba(33, 133, 255, 0.16), inset 0 2px 4px rgba(255, 255, 255, 0.95)",
        bluePill: "0 10px 28px rgba(22, 119, 255, 0.40), inset 0 1px 1px rgba(255, 255, 255, 0.45)",
        bluePillHover:
          "0 14px 36px rgba(22, 119, 255, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.6)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        handwriting: ["Caveat", "Architects Daughter", "cursive", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
