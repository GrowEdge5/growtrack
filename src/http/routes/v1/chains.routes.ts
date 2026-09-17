import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../../app/build-container.js";
import { detectAddress } from "../../../modules/chains/domain/address-detection.js";
import { chainsQuerySchema, chainsResponseSchema, detectResponseSchema } from "./chains.schemas.js";

// Address-form hints per chain namespace, so a client can render a paste field
// without hardcoding our chain list. Examples are well-known public addresses.
const ADDRESS_HINTS: Readonly<Record<string, { format: string; example: string }>> = {
  eip155: {
    format: "0x-prefixed 20-byte hex (EIP-55)",
    example: "0xd8dA680F17485f5fE14a58674455179eBBfC1F40"
  },
  algorand: {
    format: "58-character base32 with checksum",
    example: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4"
  },
  solana: {
    format: "base58, 32 decoded bytes",
    example: "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE"
  },
  bitcoin: {
    format: "bech32 (bc1…) or legacy base58",
    example: "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97"
  }
};

const UNKNOWN_HINT = { format: "unknown", example: "" };

// Free discovery routes. Deliberately unpriced: they exist so a client (or an
// agent) can learn what is readable and route a pasted address before deciding to
// pay for data. Charging for discovery would add friction to the funnel without
// adding volume that matters.
export function registerChainRoutes(app: FastifyInstance, container: ApplicationContainer): void {
  app.get(
    "/v1/chains",
    {
      schema: {
        tags: ["chains"],
        summary: "List the chains this deployment can read (free)",
        response: { 200: chainsResponseSchema }
      }
    },
    async () => ({
      data: {
        chains: container.chainProviders.list().map((provider) => {
          const hint = ADDRESS_HINTS[provider.chain.namespace] ?? UNKNOWN_HINT;
          return {
            slug: provider.chain.slug,
            namespace: provider.chain.namespace,
            nativeSymbol: provider.chain.nativeSymbol,
            nativeDecimals: provider.nativeDecimals,
            addressFormat: hint.format,
            exampleAddress: hint.example
          };
        })
      }
    })
  );

  app.get(
    "/v1/chains/detect",
    {
      schema: {
        tags: ["chains"],
        summary: "Detect which supported chain an address belongs to (free)",
        querystring: chainsQuerySchema,
        response: { 200: detectResponseSchema }
      }
    },
    async (request) => {
      const { address } = chainsQuerySchema.parse(request.query);
      const detection = detectAddress(
        address,
        container.chainProviders.list().map((provider) => provider.chain.slug)
      );

      return {
        data: {
          address: detection.address,
          formats: [...detection.formats],
          candidateChains: [...detection.candidateChains],
          resolved: detection.candidateChains.length === 1
        }
      };
    }
  );
}
