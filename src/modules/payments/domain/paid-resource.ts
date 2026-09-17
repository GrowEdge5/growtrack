// The Composite Entry catalog: every priced capability Growtrack sells.
//
// The Algorand Global x402 Challenge scores one leaderboard entry per merchant
// address, and the facilitator groups every endpoint that shares a `payTo` under
// a single merchant. So the shape that maximises both discoverability and volume
// is several atomic capabilities at their own honest price, all pointing at the
// same `payTo` — which is exactly what this file declares. Each resource gets its
// own Bazaar listing (its own description, its own price) while its settlements
// roll up into the one merchant total.
//
// Adding a capability therefore means adding one entry here plus the route that
// serves it — no new environment variables, no second builder instance.

export interface PaidResourceDefinition {
  // Stable key. Routes look their builder up by this id.
  id: PaidResourceId;
  // Canonical path template (:param style). Doubles as the Bazaar routeTemplate
  // for dynamic routes, so the catalog lists the route rather than one sample URL.
  path: string;
  method: "GET";
  // Price in atomic units of the settlement asset (6-decimal USDC → "10000" = $0.01).
  priceAtomic: string;
  // What the caller actually receives. This text is the Bazaar catalog summary and
  // the thing an agent reads when deciding whether to pay, so it names the inputs,
  // the outputs, the supported chains and the settlement asset — not just a topic.
  description: string;
  // Example inputs, rendered into the Bazaar discovery `queryParams` contract.
  // The Bazaar's GET contract reads `queryParams` even for path segments (matching
  // every cataloged resource); `pathParams` is not recognized.
  queryParams: Record<string, string>;
  // JSON-Schema for those params, so a caller knows the accepted vocabulary.
  queryParamsSchema: Record<string, unknown>;
  // Example response body echoed into the discovery record.
  outputExample: Record<string, unknown>;
}

export type PaidResourceId = "wallet-live" | "portfolio-snapshot" | "portfolio-report";

export interface PaidResourceContext {
  // The chains the running process actually has providers for, derived from the
  // registry so the advertised chain vocabulary can never drift from reality.
  chainSlugs: readonly string[];
}

// $0.01 — an agent-sized price for one fresh single-wallet read. The catalog's
// dominant price band is $0.01–$0.05; a sub-cent price would signal a toy and
// would need 10x the settlements for the same judged volume.
const WALLET_LIVE_PRICE_ATOMIC = "10000";
const PORTFOLIO_SNAPSHOT_PRICE_ATOMIC = "20000";
const PORTFOLIO_REPORT_PRICE_ATOMIC = "50000";

const SNAPSHOT_OUTPUT_EXAMPLE: Record<string, unknown> = {
  wallet: {
    chain: { slug: "algorand" },
    canonicalAddress: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4"
  },
  status: "complete",
  nativeBalance: "3622055",
  nativeSymbol: "ALGO",
  totalValueUsd: "4.31",
  holdings: [{ symbol: "USDC", rawAmount: "418683", valueUsd: "0.42" }],
  transactions: [],
  positions: [],
  signals: []
};

export function buildPaidResources(
  context: PaidResourceContext
): readonly PaidResourceDefinition[] {
  const chainEnum = [...context.chainSlugs];

  return [
    {
      id: "wallet-live",
      path: "/v1/wallets/:chain/:address/live",
      method: "GET",
      priceAtomic: WALLET_LIVE_PRICE_ATOMIC,
      description:
        "Fresh single-wallet portfolio snapshot read live from the chain at request time: " +
        "native balance, every discovered token holding with its raw amount and USD value, " +
        "total portfolio value in USD, and a complete/partial status that says whether every " +
        'discovered position could be priced. Returns JSON. Answers "what does this wallet hold ' +
        'right now, and what is it worth" without an API key, an account or a subscription. ' +
        "Pay $0.01 per call in USDC on Algorand.",
      queryParams: {
        chain: "solana",
        address: "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE"
      },
      queryParamsSchema: {
        chain: {
          type: "string",
          enum: chainEnum,
          description: "Read chain slug — a path segment in the resource URL"
        },
        address: {
          type: "string",
          description: "On-chain wallet address — a path segment in the resource URL"
        }
      },
      outputExample: SNAPSHOT_OUTPUT_EXAMPLE
    },
    {
      id: "portfolio-snapshot",
      path: "/v1/portfolio",
      method: "GET",
      priceAtomic: PORTFOLIO_SNAPSHOT_PRICE_ATOMIC,
      description:
        "Combined multichain portfolio totals for one or more wallet addresses in a single call: " +
        "total portfolio value in USD, per-chain subtotals, per-wallet subtotals, and how many " +
        "positions could be priced. Addresses on different chains can be mixed in one request, and " +
        "a bare address given without a chain is detected automatically. Saves a caller from " +
        "issuing and paying for one request per chain. Returns JSON. Pay $0.02 per call in USDC " +
        "on Algorand.",
      queryParams: {
        addresses:
          "solana:GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE,ethereum:0xd8dA680F17485f5fE14a58674455179eBBfC1F40"
      },
      queryParamsSchema: {
        addresses: {
          type: "string",
          description:
            "Comma-separated wallet addresses. Each may be 'chain:address', or a bare address " +
            "to auto-detect the chain. Up to 10 addresses."
        }
      },
      outputExample: {
        totals: { totalValueUsd: "4.73", pricedPositions: 3, unpricedPositions: 1 },
        chains: [
          { chain: "algorand", totalValueUsd: "0.42", wallets: 1 },
          { chain: "solana", totalValueUsd: "4.31", wallets: 2 }
        ],
        wallets: [
          {
            chain: "algorand",
            address: "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4",
            totalValueUsd: "0.42"
          }
        ],
        errors: []
      }
    },
    {
      id: "portfolio-report",
      path: "/v1/portfolio/report",
      method: "GET",
      priceAtomic: PORTFOLIO_REPORT_PRICE_ATOMIC,
      description:
        "Full multichain portfolio report for one or more wallet addresses: per-chain and " +
        "per-wallet breakdowns, total portfolio value in USD, every holding with its raw amount, " +
        "USD value and percentage share of the portfolio, and an explicit list of the positions " +
        "that could not be priced so a partial valuation is never mistaken for a complete one. " +
        "Ethereum, Algorand, Solana and Bitcoin addresses can be mixed in one request; a bare " +
        "address is chain-detected automatically. Returns JSON shaped for rendering as a " +
        "statement. Pay $0.05 per report in USDC on Algorand.",
      queryParams: {
        addresses:
          "solana:GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE,ethereum:0xd8dA680F17485f5fE14a58674455179eBBfC1F40"
      },
      queryParamsSchema: {
        addresses: {
          type: "string",
          description:
            "Comma-separated wallet addresses. Each may be 'chain:address', or a bare address " +
            "to auto-detect the chain. Up to 10 addresses."
        }
      },
      outputExample: {
        generatedAt: "2026-09-17T09:30:00.000Z",
        totals: {
          totalValueUsd: "4.73",
          pricedPositions: 3,
          unpricedPositions: 1,
          wallets: 3,
          chains: 2
        },
        chains: [
          {
            chain: "solana",
            totalValueUsd: "4.31",
            allocationPct: "91.12",
            holdings: [
              { symbol: "SOL", amount: "0.0445", valueUsd: "4.31", allocationPct: "91.12" }
            ]
          }
        ],
        wallets: [
          {
            chain: "solana",
            address: "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE",
            totalValueUsd: "4.31",
            status: "complete",
            holdings: [
              { symbol: "SOL", amount: "0.0445", valueUsd: "4.31", allocationPct: "100.00" }
            ]
          }
        ],
        unpriced: [],
        errors: []
      }
    }
  ];
}
