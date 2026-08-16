import { z } from "zod";

export const walletRefreshJobSchema = z.object({
  version: z.literal(1),
  chain: z.string().min(1),
  address: z.string().min(1),
  requestedAt: z.string().datetime()
});

export type WalletRefreshJob = z.infer<typeof walletRefreshJobSchema>;
