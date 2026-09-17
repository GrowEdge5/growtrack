# Growtrack Project Context & Codex Guidelines

## Mission & Purpose
Growtrack is a multichain wallet intelligence dashboard built for the Algorand Global x402 Challenge. 
The product turns raw on-chain wallet addresses into deep financial intelligence, pricing accuracy metrics, and x402-monetized intelligence streams.

## Autonomous Action Rule
Whenever you can perform an action yourself, do so. This includes generating components, configuring routing, inspecting UI responsiveness, and testing local states without asking unnecessary confirmation.

## Engineering Stack
- Framework: Next.js (App Router, TypeScript)
- Styling: Tailwind CSS
- Icons: Phosphor Icons (`@phosphor-icons/react`) or Lucide React (`lucide-react`)
- State & Modals: Native React state / Radix UI primitives

## Absolute Product Truthfulness Rules
1. Never fabricate fake balances, fake PnL % changes, or fake historical charts.
2. If token pricing is unavailable, display "Unpriced" or "Pending Pricing" - never show $0.00 as a substitute for unknown data.
3. Feature tabs not supported yet (DeFi Positions, Raw Transaction Streams) must show structured "Coming Soon" states, not mocked mock-data cards pretending to be live.
4. The x402 payment flow must authentically mirror the HTTP 402 "Payment Required" specification on Algorand rails.

## Brand Aesthetics
Follow the `design.md` specifications strictly. Restrained, luxury-financial dark theme with 60-30-10 color hierarchy.