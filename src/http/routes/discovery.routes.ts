import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../app/build-container.js";

// The discovery surfaces the official guide asks for. The facilitator scrapes the
// resource domain to enrich the merchant's Bazaar record, and agents browsing the
// catalog look for machine-readable metadata before they commit a payment — so all
// of this is public, unauthenticated and free.

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Growtrack">
  <rect width="128" height="128" rx="28" fill="#0b1020"/>
  <path d="M28 88 L28 40 M28 64 L60 64" stroke="#7c5cff" stroke-width="10" stroke-linecap="round"/>
  <path d="M60 88 L60 40 M60 64 Q60 88 92 88" stroke="#4ade80" stroke-width="10" stroke-linecap="round" fill="none"/>
  <circle cx="100" cy="40" r="9" fill="#4ade80"/>
</svg>`;

export function registerDiscoveryRoutes(
  app: FastifyInstance,
  container: ApplicationContainer
): void {
  const chains = container.chainProviders.list().map((provider) => ({
    slug: provider.chain.slug,
    nativeSymbol: provider.chain.nativeSymbol
  }));

  app.get("/logo.svg", async (_request, reply) => {
    reply.type("image/svg+xml").header("cache-control", "public, max-age=86400");
    return LOGO_SVG;
  });

  // Browsers request /favicon.ico by convention; serving the SVG here avoids a 404
  // in the facilitator's crawl log without shipping a binary asset.
  app.get("/favicon.ico", async (_request, reply) => {
    reply.type("image/svg+xml").header("cache-control", "public, max-age=86400");
    return LOGO_SVG;
  });

  // Agent-facing manifest of the paid surface: the same prices and descriptions the
  // payment guard enforces, so an agent can decide before it is ever quoted a 402.
  app.get("/.well-known/x402", async (_request, reply) => {
    reply.header("cache-control", "public, max-age=300");
    return {
      x402Version: 2,
      name: "Growtrack",
      description:
        "Multichain on-chain portfolio intelligence for Ethereum, Algorand, Solana and Bitcoin. " +
        "Pay per request in USDC on Algorand via x402 — no API key, no account, no subscription.",
      chains,
      network: container.env.X402_NETWORK,
      asset: container.env.X402_ASSET_ID,
      assetName: container.env.X402_ASSET_NAME,
      assetDecimals: container.env.X402_ASSET_DECIMALS,
      payTo: container.env.X402_PAY_TO ?? null,
      facilitator: container.env.X402_FACILITATOR_URL,
      tag: container.env.X402_TAG,
      resources: container.paidResources.map((resource) => ({
        path: resource.path,
        method: resource.method,
        priceAtomic: resource.priceAtomic,
        priceUsd: formatPrice(resource.priceAtomic, container.env.X402_ASSET_DECIMALS),
        description: resource.description
      }))
    };
  });

  // Plain-text orientation for LLM agents and crawlers (the llms.txt convention).
  app.get("/llms.txt", async (_request, reply) => {
    reply.type("text/plain; charset=utf-8").header("cache-control", "public, max-age=3600");
    return renderLlmsTxt(container);
  });
}

function formatPrice(priceAtomic: string, decimals: number): string {
  const value = Number(priceAtomic) / 10 ** decimals;
  return `$${value.toFixed(decimals)}`;
}

function renderLlmsTxt(container: ApplicationContainer): string {
  const base = container.env.X402_PUBLIC_BASE_URL ?? "this origin";
  const lines: string[] = [
    "# Growtrack",
    "",
    "> Multichain on-chain portfolio intelligence. Paste an address — on Ethereum,",
    "> Algorand, Solana or Bitcoin — and read its holdings and USD value, without an",
    "> API key or an account. Paid endpoints settle in USDC on Algorand via x402.",
    "",
    "## Free endpoints (no payment)",
    "",
    `- GET ${base}/v1/chains — the chains this deployment can read`,
    `- GET ${base}/v1/chains/detect?address= — which chain an address belongs to`,
    `- GET ${base}/v1/wallets/{chain}/{address} — last cached snapshot`,
    `- GET ${base}/.well-known/x402 — the paid surface, with prices`,
    "",
    "## Paid endpoints (x402, USDC on Algorand)",
    "",
    "Call without payment and you receive HTTP 402 with the price and a",
    "PAYMENT-REQUIRED header. Sign, retry with a PAYMENT-SIGNATURE header, and the",
    "paid response is returned with a PAYMENT-RESPONSE header carrying the on-chain",
    "settlement. No account, no API key, no minimum, no subscription.",
    ""
  ];

  for (const resource of container.paidResources) {
    const price = formatPrice(resource.priceAtomic, container.env.X402_ASSET_DECIMALS);
    lines.push(`### ${resource.method} ${resource.path} — ${price} per call`, "");
    lines.push(resource.description, "");
    lines.push(
      `Accepted chains: ${container.chainProviders
        .list()
        .map((provider) => provider.chain.slug)
        .join(", ")}.`,
      ""
    );
  }

  lines.push(
    "## Limits worth knowing",
    "",
    "- Token coverage is complete on Bitcoin and Solana. Ethereum covers a curated",
    "  token list, and Algorand reports every opted-in asset but only names the",
    "  curated ones — a documented coverage limit, never invented data.",
    "- `status: partial` means some discovered position could not be priced;",
    "  `totalValueUsd` is omitted rather than reported as zero.",
    "- Unverified Solana airdrop tokens are excluded from holdings and reported as",
    "  an explicit count, so a trimmed list is never mistaken for a complete one.",
    ""
  );

  return lines.join("\n");
}
