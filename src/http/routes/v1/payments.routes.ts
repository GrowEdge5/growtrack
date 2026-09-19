import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../../app/build-container.js";
import { algorandPaymentParamsResponseSchema } from "./payments.schemas.js";

// Client-side payment construction inputs. Deliberately free: the priced routes
// below (/live, /v1/portfolio*) are what the merchant charges for, and a client that
// cannot build a transaction cannot buy anything.
export function registerPaymentRoutes(app: FastifyInstance, container: ApplicationContainer): void {
  app.get(
    "/v1/payments/algorand/params",
    {
      schema: {
        tags: ["payments"],
        summary: "Get Algorand suggested params for building an x402 payment (free)",
        response: { 200: algorandPaymentParamsResponseSchema }
      }
    },
    async () => ({ data: await container.getAlgorandPaymentParams.execute() })
  );
}
