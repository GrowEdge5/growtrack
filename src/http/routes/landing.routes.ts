import type { FastifyInstance } from "fastify";

// Landing page at the API origin. The GoPlausible facilitator scrapes the
// resource URL's origin for og:/title metadata to attach site info to the
// merchant's Bazaar listing — without an HTML page at "/" the merchant record
// stays bare and the listing is not surfaced publicly. Served as a static
// string: no templating, no user input, no infrastructure dependency.
const LANDING_TITLE = "Growtrack — Multichain wallet intelligence, pay-per-query in USDC";
const LANDING_DESCRIPTION =
  "Live EVM (Ethereum) and Algorand wallet snapshots: native balance, curated token/ASA holdings, and USD valuation behind a single API. No API keys, no accounts — agents pay 0.001 USDC per live query via x402 on Algorand mainnet.";

function landingPage(): string {
  const og = (property: string, content: string) =>
    `<meta property="${property}" content="${content}">`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${LANDING_TITLE}</title>
<meta name="description" content="${LANDING_DESCRIPTION}">
${og("og:type", "website")}
${og("og:title", LANDING_TITLE)}
${og("og:description", LANDING_DESCRIPTION)}
<style>
  :root { color-scheme: dark; --bg:#0b1020; --fg:#eef1fb; --muted:#9aa3c7; --accent:#7c5cff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
    font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    display:flex; min-height:100vh; align-items:center; justify-content:center; }
  main { max-width:720px; padding:48px 28px; }
  h1 { font-size:2rem; margin:0 0 .4em; letter-spacing:-.02em; }
  p { color:var(--muted); margin:0 0 1.2em; }
  code { font-family:ui-monospace,Consolas,monospace; font-size:.9em;
    background:rgba(124,92,255,.14); border:1px solid rgba(124,92,255,.35);
    border-radius:8px; padding:.15em .45em; color:#c9baff; }
  ul { list-style:none; padding:0; margin:0 0 1.4em; color:var(--muted); }
  li { padding:.35em 0; }
  a { color:var(--accent); }
</style>
</head>
<body>
<main>
  <h1>Growtrack</h1>
  <p>${LANDING_DESCRIPTION}</p>
  <ul>
    <li>🦾 EVM (Ethereum) + Algorand read chains — one provider port</li>
    <li>💵 Live snapshot: <code>GET /v1/wallets/:chain/:address/live</code></li>
    <li>🔒 x402 pay-per-query: HTTP <code>402</code> → verify → settle (GoPlausible facilitator)</li>
    <li>🧾 Cached reads + async refresh stay free (freemium)</li>
  </ul>
  <p>API reference: <a href="/docs">/docs</a> · Health: <a href="/health/ready">/health/ready</a></p>
</main>
</body>
</html>`;
}

export function registerLandingRoute(app: FastifyInstance): void {
  app.get("/", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return landingPage();
  });
}
