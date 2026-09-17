import { z } from "zod";

export const chainsQuerySchema = z.object({
  address: z.string().min(1)
});

const chainSummarySchema = z.object({
  slug: z.string(),
  namespace: z.string(),
  nativeSymbol: z.string(),
  nativeDecimals: z.number().int().nonnegative(),
  addressFormat: z.string(),
  exampleAddress: z.string()
});

export const chainsResponseSchema = z.object({
  data: z.object({
    chains: z.array(chainSummarySchema)
  })
});

export const detectResponseSchema = z.object({
  data: z.object({
    address: z.string(),
    formats: z.array(z.enum(["evm", "algorand", "solana", "bitcoin"])),
    candidateChains: z.array(z.string()),
    // True when exactly one supported chain matches, i.e. the address can be
    // routed onward without asking the caller to disambiguate.
    resolved: z.boolean()
  })
});
