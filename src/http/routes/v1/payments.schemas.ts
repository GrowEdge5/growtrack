import { z } from "zod";

// Suggested params for building an Algorand payment. Free and unauthenticated on
// purpose: a client cannot sign a payment it cannot construct, and charging for the
// construction inputs while charging for the resource would be double-dipping.
export const algorandPaymentParamsSchema = z.object({
  network: z.string().min(1),
  genesisId: z.string(),
  genesisHash: z.string(),
  minFee: z.number().int().positive(),
  suggestedFee: z.number().int().positive(),
  firstValid: z.number().int().positive(),
  lastValid: z.number().int().positive()
});

export const algorandPaymentParamsResponseSchema = z.object({
  data: algorandPaymentParamsSchema
});
