import { z } from "zod";

import {
  MAX_PORTFOLIO_TARGETS,
  type PortfolioTarget
} from "../../../modules/wallets/application/get-portfolio-report.js";

// One query parameter describes the whole request: a comma-separated list where
// each entry is either "chain:address" or a bare address to be chain-detected.
// A single flat string keeps the Bazaar discovery contract simple (its GET form
// reads query parameters) and makes the paid call trivially reproducible with curl.
export const portfolioQuerySchema = z.object({
  addresses: z
    .string()
    .min(1)
    .refine((value) => parsePortfolioTargets(value).length <= MAX_PORTFOLIO_TARGETS, {
      message: `At most ${MAX_PORTFOLIO_TARGETS} addresses per request`
    })
});

// Splits the addresses parameter into targets. The chain separator is the FIRST
// colon, which is unambiguous: no supported chain's address form contains one.
export function parsePortfolioTargets(raw: string): PortfolioTarget[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.indexOf(":");
      if (separator <= 0) {
        return { address: entry };
      }
      const chain = entry.slice(0, separator).trim();
      const address = entry.slice(separator + 1).trim();
      return chain.length === 0 ? { address } : { chain, address };
    });
}

const holdingLineSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  tokenAddress: z.string(),
  amount: z.string(),
  valueUsd: z.string().optional(),
  allocationPct: z.string().optional()
});

const walletReportSchema = z.object({
  chain: z.string(),
  address: z.string(),
  status: z.enum(["complete", "partial"]),
  nativeSymbol: z.string(),
  nativeBalance: z.string(),
  nativeAmount: z.string(),
  totalValueUsd: z.string().optional(),
  allocationPct: z.string().optional(),
  holdings: z.array(holdingLineSchema)
});

const chainReportSchema = z.object({
  chain: z.string(),
  totalValueUsd: z.string().optional(),
  allocationPct: z.string().optional(),
  walletCount: z.number().int().nonnegative(),
  holdings: z.array(holdingLineSchema)
});

const totalsSchema = z.object({
  totalValueUsd: z.string().optional(),
  pricedHoldings: z.number().int().nonnegative(),
  unpricedHoldings: z.number().int().nonnegative(),
  walletCount: z.number().int().nonnegative(),
  chainCount: z.number().int().nonnegative()
});

const targetErrorSchema = z.object({
  chain: z.string().optional(),
  address: z.string(),
  code: z.string(),
  message: z.string()
});

// The paid /v1/portfolio/report response: the full portfolio, with per-holding
// allocation and an explicit list of what could not be priced.
export const portfolioReportResponseSchema = z.object({
  data: z.object({
    generatedAt: z.string().datetime(),
    totals: totalsSchema,
    chains: z.array(chainReportSchema),
    wallets: z.array(walletReportSchema),
    unpriced: z.array(holdingLineSchema.extend({ chain: z.string(), address: z.string() })),
    errors: z.array(targetErrorSchema)
  })
});

// The cheaper /v1/portfolio response: the same aggregation without the per-holding
// detail, for callers that only need totals and a per-chain split.
export const portfolioSummaryResponseSchema = z.object({
  data: z.object({
    generatedAt: z.string().datetime(),
    totals: totalsSchema,
    chains: z.array(
      chainReportSchema.omit({ holdings: true }).extend({
        holdings: z.array(holdingLineSchema)
      })
    ),
    wallets: z.array(walletReportSchema),
    errors: z.array(targetErrorSchema)
  })
});
