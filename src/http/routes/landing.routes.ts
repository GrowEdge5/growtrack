import type { FastifyInstance } from "fastify";

import type { ApplicationContainer } from "../../app/build-container.js";

// Landing page at the API origin. The GoPlausible facilitator scrapes the resource
// URL's origin for title/description/og metadata to attach site info to the
// merchant's Bazaar listing, and the catalog review looks at this domain — so the
// page states the product, the chains, the prices and the payment mechanism
// plainly. Served as a static string: no templating, no user input, no
// infrastructure dependency, so it renders even when downstream services are down.
const LANDING_TITLE = "Growtrack — multichain portfolio intelligence, pay-per-query in USDC";
const LANDING_DESCRIPTION =
  "Track an entire on-chain portfolio from one address on Ethereum, Algorand, Solana or Bitcoin: " +
  "holdings, USD values and per-chain allocation, with no API key and no account. Agents and " +
  "developers pay per request in USDC on Algorand via x402 — $0.01 for a live wallet snapshot, " +
  "$0.02 for combined portfolio totals, $0.05 for a full report.";

const FEATURES: readonly (readonly [string, string])[] = [
  [
    "Four chains, one address",
    "Ethereum, Algorand, Solana and Bitcoin — paste an address and the chain is detected."
  ],
  [
    "Real reads, not cached guesses",
    "Balances and holdings are read live from the chain at request time."
  ],
  [
    "Honest valuation",
    "Every holding carries its USD value, and an unpriced position is reported as unpriced — never as zero."
  ],
  [
    "Pay per request",
    "HTTP 402, a signed payment, a settled response. No keys, no minimums, no subscription."
  ]
];

function landingPage(container: ApplicationContainer): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const base = container.env.X402_PUBLIC_BASE_URL;
  const ogImage = base === undefined ? "/logo.svg" : `${base.replace(/\/+$/, "")}/logo.svg`;
  const chains = container.chainProviders
    .list()
    .map((provider) => provider.chain.nativeSymbol)
    .join(" · ");

  const priceRows = container.paidResources
    .map((resource) => {
      const price = (
        Number(resource.priceAtomic) /
        10 ** container.env.X402_ASSET_DECIMALS
      ).toFixed(container.env.X402_ASSET_DECIMALS);
      return `<tr><td><code>${escape(resource.path)}</code></td><td class="price">$${price}</td></tr>`;
    })
    .join("\n      ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(LANDING_TITLE)}</title>
<meta name="description" content="${escape(LANDING_DESCRIPTION)}">
<link rel="icon" href="/favicon.ico" type="image/svg+xml">
<link rel="apple-touch-icon" href="/logo.svg">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Growtrack">
<meta property="og:title" content="${escape(LANDING_TITLE)}">
<meta property="og:description" content="${escape(LANDING_DESCRIPTION)}">
<meta property="og:image" content="${escape(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(LANDING_TITLE)}">
<meta name="twitter:description" content="${escape(LANDING_DESCRIPTION)}">
<meta name="twitter:image" content="${escape(ogImage)}">
<style>
  :root { color-scheme: dark; --bg:#0b1020; --panel:#121834; --fg:#eef1fb; --muted:#9aa3c7; --accent:#7c5cff; --green:#4ade80; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
    font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width:820px; margin:0 auto; padding:56px 24px 72px; }
  .brand { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
  .brand img { width:40px; height:40px; }
  .brand span { font-weight:650; letter-spacing:-.01em; }
  h1 { font-size:clamp(1.7rem,4.4vw,2.5rem); margin:0 0 .5em; letter-spacing:-.025em; line-height:1.2; }
  h2 { font-size:1.05rem; margin:2.4em 0 .8em; letter-spacing:-.01em; }
  .lede { color:var(--muted); font-size:1.06rem; margin:0 0 1.4em; }
  .chains { display:inline-block; color:var(--green); font-size:.85rem; letter-spacing:.06em;
    text-transform:uppercase; margin-bottom:1.1em; }
  code { font-family:ui-monospace,Consolas,monospace; font-size:.87em;
    background:rgba(124,92,255,.14); border:1px solid rgba(124,92,255,.35);
    border-radius:7px; padding:.12em .42em; color:#c9baff; }
  ul.features { list-style:none; padding:0; margin:0; display:grid; gap:14px; }
  ul.features li { background:var(--panel); border:1px solid rgba(255,255,255,.06);
    border-radius:12px; padding:14px 16px; }
  ul.features strong { display:block; margin-bottom:.2em; }
  ul.features span { color:var(--muted); font-size:.94rem; }
  table { width:100%; border-collapse:collapse; background:var(--panel);
    border:1px solid rgba(255,255,255,.06); border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding:11px 16px; border-bottom:1px solid rgba(255,255,255,.06); }
  tr:last-child td { border-bottom:0; }
  th { color:var(--muted); font-weight:500; font-size:.85rem; }
  td.price { text-align:right; color:var(--green); white-space:nowrap; font-variant-numeric:tabular-nums; }
  a { color:var(--accent); }
  footer { color:var(--muted); font-size:.9rem; margin-top:2.6em; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand"><img src="/logo.svg" alt="" width="40" height="40"><span>Growtrack</span></div>

  <h1>Your whole on-chain portfolio, from one address.</h1>
  <p class="chains">${escape(chains)}</p>
  <p class="lede">${escape(LANDING_DESCRIPTION)}</p>

  <ul class="features">
    ${FEATURES.map(([title, body]) => `<li><strong>${escape(title)}</strong><span>${escape(body)}</span></li>`).join("\n    ")}
  </ul>

  <h2>Paid endpoints — USDC on Algorand, per request</h2>
  <table>
    <thead><tr><th>Endpoint</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>
      ${priceRows}
    </tbody>
  </table>

  <h2>Try it</h2>
  <p class="lede">Call a paid endpoint without payment and it answers <code>402</code> with the price in a
  <code>PAYMENT-REQUIRED</code> header. Sign, retry with <code>PAYMENT-SIGNATURE</code>, and the response
  returns with a <code>PAYMENT-RESPONSE</code> header carrying the on-chain settlement.</p>
  <p><a href="/app">Open demo dashboard</a> · <a href="/docs">API reference</a> · <a href="/llms.txt">llms.txt</a> ·
     <a href="/.well-known/x402">.well-known/x402</a> · <a href="/health/ready">health</a></p>

  <footer>Read-only: Growtrack reads public chain data and never signs on a user's behalf.</footer>
</div>
</body>
</html>`;
}

import { proxyToWeb } from "../plugins/web-proxy.js";

export function registerLandingRoute(app: FastifyInstance, container: ApplicationContainer): void {
  app.get("/", (request, reply) => {
    if (process.env.VITEST || container.env.NODE_ENV === "test") {
      reply.type("text/html; charset=utf-8").send(landingPage(container));
      return;
    }
    proxyToWeb(request, reply, 3001, () => {
      reply.raw.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      reply.raw.end(landingPage(container));
    });
  });
}
