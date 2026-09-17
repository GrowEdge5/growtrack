# Growtrack — Hackathon Roadmap (Sept 16 → Sept 30, 2026)

> Companion to `TASKS.md`. `TASKS.md` tracks the original sprint; **this document corrects three
> things in it** and adds the requirements from the Sept 15 update to the official build-and-submit
> guide. Read section 2 before starting any work.

---

## Status — 2026-09-17 (what is already done)

Sections 2–8 below were written on Sept 16 as the plan. This is what has since landed in the code:

| Item                                | Status                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| §2.1 Public repo + Electric Capital | ❌ **Still open — the repo is private. This is a qualification gate.**                         |
| §2.2 Pricing corrected              | ✅ $0.01 / $0.02 / $0.05, calibrated against the live Bazaar catalog                           |
| §2.3 Composite Entry                | ✅ Three priced endpoints on one `payTo`, each with its own Bazaar listing                     |
| §3 Merchant metadata                | ✅ Landing page rebuilt with og/twitter tags, logo, `/llms.txt`, `/.well-known/x402`           |
| §4 Endpoint ladder                  | ✅ All three paid routes live; the two aggregation routes are new                              |
| §5 A1 address auto-detect           | ✅ `detectAddress()`, exposed at `GET /v1/chains/detect`                                       |
| §5 A2 Solana provider               | ✅ Live-verified; enumerates all SPL tokens, excludes unverified airdrops                      |
| §5 A3 Bitcoin provider              | ✅ Live-verified against blockstream.info                                                      |
| §5 B composite restructure          | ✅ Per-resource builder factory, per-route price and description                               |
| §6 item 5 aggregation endpoint      | ✅ `GetPortfolioReport` — totals, per-chain, allocation, unpriced list                         |
| §6 item 7 402 body fix              | ✅ Schema superset, with an e2e test asserting body == header                                  |
| §6 item 8 CORS list                 | ✅ `CORS_ORIGIN` is now a comma-separated list                                                 |
| Phase C frontend                    | ❌ Not started — the next major piece of work                                                  |
| Domain decision (§2.3b)             | ✅ `growtrack.pro` bought, attached, DNS auto-configured, verified, live with a valid TLS cert |

Tests went from 34 to 69 across 13 files, and `npm run ci` is green.

### Domain fix — what to actually do

**Progress (2026-09-17) — DONE:** `growtrack.pro` was bought through Railway Domains and attached to the
`api` service (domain ID `16c3e3b4-99cd-4ea8-8c20-496291e74110`). The important empirical finding:
**Railway auto-configured the DNS records itself** because it registered the domain — the CNAME and the
ownership TXT were both created in the zone with no manual step, and both were publicly resolvable
(apex `A` → `69.46.46.73`, the Railway edge; `_railway-verify` TXT → Railway's exact token), confirmed
through 8.8.8.8 and 1.1.1.1. So buying through Railway really did remove the manual DNS work.
`X402_PUBLIC_BASE_URL=https://growtrack.pro` was set, `CORS_ORIGIN` widened to a list, the new build was
deployed, and Railway's ownership check then completed on its own (`Verified: yes`, certificate `VALID`).
Live verification through public DNS: `/`, `/health/ready`, `/v1/chains`, `/llms.txt`,
`/.well-known/x402` and `/logo.svg` all `200`; the TLS certificate is `CN=growtrack.pro` (Let's Encrypt,
valid to 16 Dec 2026) with no verification errors; and the three paid routes answer `402` at `$0.01`,
`$0.02` and `$0.05` with `resource.url` on `https://growtrack.pro/...`. Steps 1–9 are done; **step 10
(removing the generated `*.up.railway.app` domain) is the only piece left**, and it is deliberately
deferred until the new code is committed to git — the currently deployed build came from the local
working tree via `railway up`, so a GitHub-triggered deploy would otherwise revert to code that still
depends on `X402_RESOURCE_URL`.

The rule is that a merchant's `payTo` must be attached to **one root domain** (the guide is explicit:
"Each merchant account should be connected to only one root domain", and on mainnet "never use the
same `payTo` address for different domain endpoints"). Today all the paid routes live on
`api-production-7c303.up.railway.app`, so the merchant already has exactly one domain — nothing is
broken yet. The risk is the frontend: putting it on Vercel would create a second domain in the
product's footprint.

Reassurance worth having: the facilitator keys a merchant by its **`payTo`**, not by domain. As long as
the `payTo` (`F232…DSEA`) does not change, the existing leaderboard attribution and settlement history
carry over to the new domain untouched.

#### Facts verified against Railway's docs (2026-09-17)

- Adding a custom domain in Railway (service → Settings → Networking → Public Networking →
  **+ Custom Domain**) yields **two records: a CNAME target and a TXT record. Both are required.**
  If the TXT record is missing, requests to the custom domain return **404 even after the CNAME
  resolves** — Railway uses the TXT record to confirm ownership before routing traffic.
- SSL is provisioned automatically once verified.
- DNS changes can take up to 72 hours to propagate worldwide (usually far less).
- **The Trial plan is limited to 1 custom domain**, so `domain.com` and `www.domain.com` count as two
  and cannot both be used on Trial. Hobby allows 2 per service. Use the apex only.
- A **root/apex** domain needs CNAME flattening or a dynamic ALIAS record, which requires a DNS
  provider that supports it. Railway's docs name **Hostinger, GoDaddy, Route 53, Azure DNS, NameSilo,
  Squarespace and Hurricane Electric as NOT supporting it**, and list Cloudflare, DNSimple, Namecheap
  and bunny.net as supporting it. The documented workaround when your registrar's DNS cannot do it:
  keep the domain registered where it is and **point its nameservers at Cloudflare** (free), then add
  the CNAME at the apex there.
- Railway also sells domains directly with auto-configured DNS, which removes the DNS work entirely.

#### Where to buy the domain (verified 2026-09-17)

Registration only — see step 1. Three workable options, in order of least effort:

| Option                                          | Setup effort                                                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Railway Domains** (`railway.com/domains`)     | Lowest — no DNS records at all                                                                        | 250+ TLDs (`.com`, `.io`, `.dev`, `.app`, `.co`, …). "When purchased from a service, the domain is automatically attached and configured", and Railway manages DNS on its own nameservers, so the manual CNAME/TXT step disappears. WHOIS privacy and auto-renewal on by default. Caveats: Railway is listed as the **registrant contact** and handles registry communication; a newly registered domain carries ICANN's **60-day transfer lock**, so it cannot be moved to another registrar until 60 days after purchase. Pricing is only shown in the search itself, so compare it against Cloudflare before paying. Once active you can delegate DNS to Cloudflare later without transferring the domain out. |
| **Cloudflare Registrar**                        | Medium — Cloudflare manages DNS, so the apex works, but Railway's CNAME + TXT still get added by hand | Buy and renew **at cost** ("no markup, no surprise fees"), WHOIS redacted by default, auto-renew by default. Requires Cloudflare nameservers — which is exactly what an apex domain needs anyway, so it costs nothing here. No IDN/unicode domains.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Namecheap / Porkbun / Spaceship / Hostinger** | Medium–high — depends entirely on the provider's DNS                                                  | Fine for **registration**; often cheapest in year one. But an apex domain needs CNAME flattening or an ALIAS record. Railway's docs name **Namecheap** as supporting it and **Hostinger** as not supporting it. Spaceship's own DNS support for this could not be verified, so assume you may need to point its nameservers at Cloudflare (free) — which then makes the DNS provider irrelevant.                                                                                                                                                                                                                                                                                                                  |

Whichever route: check the **renewal** price, not the first-year promo, and avoid `.ai` (Railway's docs note some TLDs require a two-year minimum).

#### What NOT to buy

- **Web hosting.** Railway runs the API, the worker, Postgres and Redis, and will serve the frontend too.
- **An SSL certificate.** Railway provisions it automatically once the custom domain verifies.
- **A paid Cloudflare plan.** The free plan covers DNS and CNAME flattening.
- **Any paid data API.** All four chains use free keyless sources today: public Solana RPC, blockstream.info, Algonode, DeFiLlama, and the Jupiter token list.

#### The one thing that does need paying for

**Railway itself.** The subscription base is `$5/month` on Hobby (Free tier gets `$1` of credit per month) and it goes toward usage; RAM, CPU and egress are billed on top of it. The service has been running on trial credit, and the endpoint must stay up through the **unannounced October judging window** and the **Nov 2 final presentation** — an expired trial means zero volume and no Bazaar presence, which is a scoring problem, not just an inconvenience. Move to Hobby and set a spend limit before the trial lapses.

#### Steps, in order

1. **Buy one domain** — registration only. **Do not buy web hosting**: Railway runs the API, the
   worker, Postgres and Redis, and it will serve the frontend too. Shared hosting cannot run this
   stack. Pick the name deliberately; it becomes the brand, the merchant domain and the API host at
   once. Avoid Freenom domains (Railway does not support them).
2. **Put DNS on Cloudflare** (free plan) if the registrar's own DNS cannot do CNAME flattening at the
   apex — true for Hostinger. At the registrar, replace the nameservers with the two Cloudflare gives
   you and wait for activation.
3. **Add the custom domain in Railway** and copy the CNAME target and TXT name/value exactly as
   shown. Choose the target port (`3000`, the app's `PORT`; Railway usually auto-detects it).
4. **In Cloudflare DNS**, add the CNAME (`Name` → `@`, target → Railway's value, proxy **on**) and the
   TXT record exactly as Railway showed it.
5. **In Cloudflare SSL/TLS**, set the mode to **Full** (not Full Strict — Railway's docs say Strict
   will not work as intended) and enable **Universal SSL** under Edge Certificates.
6. **Wait for Railway to show a green check** next to the domain, then confirm
   `https://<domain>/health/ready` returns `200`. A 404 here means the TXT record is missing or wrong.
7. **Deploy the current code** (the live instance still runs the pre-change build: `/v1/chains`
   returns 404 there and the accept still prices at `1000`).
8. **Set `X402_PUBLIC_BASE_URL=https://<domain>`** on the Railway service and redeploy — the new code
   derives every paid resource's Bazaar URL from this origin. `X402_RESOURCE_URL` can then be removed.
9. **Verify on the wire:** call a paid route unpaid and confirm both `resource.url` and
   `accepts[0].resource.url` in the 402 body use the new domain, and that `GET /.well-known/x402`
   lists three resources under it.
10. **Optional cleanup:** if Railway allows removing the generated `*.up.railway.app` domain once the
    custom domain is verified, remove it so one `payTo` is reachable at exactly one root domain. Then
    update the URL in `README.md` and `TASKS.md`.
11. **When the frontend is built, serve it from the same origin** — the SPA at `/` and the API under
    `/v1/*`. Two workable shapes:
    - Railway serving the built SPA as static assets on the same service, with `/v1/*` and the other
      API paths taking precedence, or
    - a small reverse proxy (Cloudflare Worker, Caddy, Next.js `rewrites`) in front of both.

    Either way the browser sees a single origin, which also removes CORS from the picture and lets
    `CORS_ORIGIN` stay narrow.

12. **Do not** register the frontend's hostname as a merchant domain, do not put a second `payTo` on
    it, and do not list it in the Bazaar metadata. If a temporary Vercel preview is used during
    development, keep it out of the merchant records.

---

## 0. Verdict

**The product idea is possible, and roughly two thirds of the backend already exists and is verified
live.** The read layer (EVM + Algorand, native + curated tokens, USD valuation), the x402 payment
core (`402 → verify → settle` via GoPlausible), public HTTPS deploy, and 12+ real mainnet settles are
done. What remains is two new chain providers, one aggregation endpoint, a pricing/entry-shape
restructure, and the frontend. That fits in the two weeks left.

The risk is **not** engineering feasibility. The risk is that the current shape of the product does
not match what the judges actually measure. Three corrections in section 2 address that.

---

## 1. Verified current state (checked 2026-09-16)

| Item                   | Status                                       | Evidence                                                                      |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| Public API             | **LIVE** (README says offline — it is stale) | `GET /health/ready` → `200`; unpaid `/v1/wallets/algorand/:addr/live` → `402` |
| Landing page           | LIVE with og tags                            | `GET /` → HTML                                                                |
| Read chains            | 2 of 4                                       | Ethereum (`id 1`), Algorand (`id 2`)                                          |
| x402 core              | Working, mainnet-verified                    | guard + builder + GoPlausible facilitator client                              |
| Bazaar catalog listing | **NOT LISTED**                               | searched all 2,019 catalog resources — zero growtrack entries                 |
| GitHub repo            | **PRIVATE**                                  | `gh repo view GrowEdge5/growtrack` → `visibility: PRIVATE`                    |
| Repo description       | Empty                                        | same command → `description: ""`                                              |
| Test suite             | 34 tests / 8 files, all mocked               | no test for the EVM provider, DeFiLlama, or the registry                      |

External data sources verified reachable and correct today:

- DeFiLlama price keys for new chains work: `coingecko:bitcoin`, `coingecko:solana`, `solana:<mint>`.
- Solana public RPC works for both `getBalance` and `getTokenAccountsByOwner` (jsonParsed).
- Bitcoin: **`blockstream.info` works** (`funded_txo_sum - spent_txo_sum` = balance).
  `mempool.space` was unreachable from this machine — make blockstream the primary, mempool a fallback.
- Jupiter token list (`lite-api.jup.ag/tokens/v2/tag?query=verified`) returns 3,374 verified tokens
  with symbol/name/decimals/icon — **Solana does not need a curated token list.**
- Algorand algod `GET /v2/accounts/{addr}` already returns **all** opted-in assets
  (`assets: [{asset-id, amount}]`), not just a curated subset.

---

## 2. Three corrections to the current plan

### 2.1 Make the GitHub repo public — this is blocking

The official guide (updated Sept 15) adds a qualification step that `TASKS.md` does not mention:

> "7. Submit your Github repo to Electric Capital — Please also submit your project Github repository
> to Electric Capital as part of the qualification process. Make sure your repository is publicly
> accessible and contains the relevant Algorand code for your x402 project."

The repo is **private** right now. This must be flipped to public, and the Electric Capital
submission completed. Do this before anything else — it is a qualification gate, not a nice-to-have.

### 2.2 The pricing and the unit of value are wrong for how the leaderboard is scored

Judging is evenly weighted across Volume, Use-case quality, Technical execution, Sustained potential,
Innovation. Volume is measured as **USDC settled to the endpoint**.

Measured against the live Bazaar catalog (2,019 resources, 147 merchants — all-time figures derived
from `settleCount × price`, so treat as estimates):

| Rank   | Merchant           | Est. USDC volume | Settles | Endpoints |
| ------ | ------------------ | ---------------- | ------- | --------- |
| 1      | api.syraa.fun      | $5,182           | 181,735 | 27        |
| 2      | onestepchess.xyz   | $4,901           | 490,125 | 1         |
| 3      | proofmint.app      | $4,270           | 12      | 2         |
| 4      | agenthub (railway) | $1,403           | 21,855  | 19        |
| **20** | (cut line)         | **$26**          | ~600    | —         |
| 50     | (cut line)         | $1               | ~140    | —         |

Price distribution across the catalog: `$0.01` ×11, `$0.02` ×8, `$0.50` ×6, `$0.03` ×5, `$0.05` ×5.
**Only 2 endpoints in the entire catalog are priced at `$0.001`.**

Growtrack currently charges **$0.001**. At that price, reaching the rank-20 line of $26 requires
~26,000 settled payments. At $0.01 it requires 2,600; at $0.05, 520. Two conclusions:

- **Price agent-facing calls at $0.01–$0.05**, not $0.001. The market has settled on that band and
  a sub-cent price signals a toy rather than a service.
- The rank-20 line is only ~$26 all-time, so top-20 is genuinely reachable — but note the leaderboard
  is scored over an *unannounced window in October*, so lifetime totals above are calibration, not
  standing. Growtrack's own 18 settles at $0.001 amount to about **$0.018** of qualifying volume.

`proofmint.app` is the useful counter-example: 12 settlements, $4,270 of volume. High-value atomic
actions beat transaction-count grinding through review even when they lose the count contest.

### 2.3 x402 is currently bolted on, and the frontend domain plan conflicts with the merchant rules

Two separate problems that both touch the deployment shape.

**a. x402 is a secondary feature right now.** The judging criterion says it plainly:

> "Use case quality: x402 should be meaningfully integrated into the core payment flow, rather than
> added as a secondary feature to a product that could operate without it."

Today the free paths (`GET /v1/wallets/:chain/:address` from cache/DB, and `POST .../refresh`) let the
whole product work while paying nothing; only `/live` is gated. Fix by restructuring into a
**Composite Entry** (section 4) where the paid routes are the product's real data path.

**b. The frontend and API must share one root domain.** From the guide:

> "IMPORTANT: On MAINNET, never use the same payTo address for different domain endpoints because it
> is against regulations. Use endpoints to differentiate between different resources, not different
> domains!"
> "Each merchant account should be connected to only one root domain!"

`TASKS.md` B7 proposes "Railway separate service ya Vercel" — a Vercel frontend would be a _second
root domain_ under the same `payTo`. Instead: **one root domain** (e.g. `growtrack.xyz`) serving the
SPA at `/` and the API under `/v1/*`, with a path-based reverse proxy or Next.js rewrites. Buy and
attach the domain early, then set `X402_RESOURCE_URL` to it so the Bazaar resource descriptor and the
merchant record both point at the canonical domain.

---

## 3. Merchant metadata (the facilitator scrapes your domain)

The guide notes the Bazaar enriches the merchant and resource records from your domain and your
merchant NFD. Add these to the landing surface — they cost an afternoon and directly affect how the
entry is presented to judges:

- `title`, `description`, `og:image`, `favicon`, a real logo file.
- A specific, concrete **resource description** per paid route. The catalog shows the winning entries
  write several hundred characters answering what the caller gets, from what data, and why it is
  trustworthy. Growtrack's current one-liner ("live wallet snapshot") is the weakest part of its
  catalog presence.
- `/.well-known/` structures and an agent-facing file (`llms.txt`) so agents can discover the
  endpoint without a human reading the page.
- A merchant NFD (Algorand name service) for the `payTo` account, if one is available.

---

## 4. Endpoint ladder (Composite Entry — one `payTo`, one root domain)

All routes share the existing `payTo` and roll up into one leaderboard entry, while each is listed
separately in the Bazaar.

| Route                                  | Price      | Who calls it    | Purpose                                                    |
| -------------------------------------- | ---------- | --------------- | ---------------------------------------------------------- |
| `GET /v1/chains`                       | free       | UI              | supported chains + native symbols                          |
| `GET /v1/chains/detect?address=`       | free       | UI              | address → chain (auto-detect)                              |
| `GET /v1/wallets/:chain/:address`      | free       | UI              | cached snapshot (the funnel)                               |
| `GET /v1/wallets/:chain/:address/live` | $0.01      | agents, UI      | **exists already** — fresh single-chain snapshot           |
| `GET /v1/portfolio?addresses=`         | $0.02      | agents, UI      | multi-address, multichain aggregate + totals               |
| `GET /v1/portfolio/report`             | $0.05–0.25 | UI hero, agents | full report: allocation, per-chain, per-holding, printable |

The UI keeps a genuinely free entry point (that is the funnel, and it is fine), but the report — the
thing the product is actually _for_ — is paid, so x402 sits in the middle of the core flow rather
than beside it.

Optional, higher-leverage if time allows: make the backend **pay another x402 endpoint** for an
enrichment input (price, holder concentration, risk) while serving a report. That makes Growtrack an
Orchestrator as well, where x402 is structurally load-bearing, and downstream payments count toward
its own leaderboard total.

---

## 5. Day-by-day

Today is **Wed 16 Sept**. Hard deadline: submission form closes **29 Sept** (rules: 11:45pm ET;
the guide's Sept 15 update says the window runs "through September 30th"). Treat Sept 29 as the date.

**Phase 0 — unblockers (a few hours, do today)**

- Make the repo public; set description and topics.
- Submit the repo to Electric Capital.
- Fill in the submission form (window is open now).
- Correct the stale "Railway offline" status in `README.md` (it is live).

**Phase A — two new chains (Sept 16–17)**

- A1 address auto-detect helper, shared and also exposed as `GET /v1/chains/detect` (see gotcha 7.1).
- A2 Solana provider — `getBalance` + `getTokenAccountsByOwner`; price natives via `coingecko:solana`,
  tokens via `solana:<mint>`; `nativeDecimals: 9`; **uncurated** discovery via the Jupiter token list.
- A3 Bitcoin provider — blockstream primary, mempool.space fallback; `nativeDecimals: 8`;
  price via `coingecko:bitcoin`.
- A4 seed rows for Solana (`id 3`) and Bitcoin (`id 4`) + `LLAMA_CHAINS` entries, or every new-chain
  snapshot prices to nothing.
- A5 live verification against real public addresses on all four chains; `npm run ci` green; deploy.

**Phase B — composite entry restructure (Sept 17–18)**

- Parameterise `PaymentRequirementsBuilder` per route: price, resource URL, description, and the
  discovery `extensions` contract (today all four are hardcoded globals — see gotcha 7.2).
- Add the paid `/v1/portfolio` and `/v1/portfolio/report` routes.
- Write long, specific catalog descriptions per route; update the `extensions.bazaar` payload per route.
- Extend the e2e tests: unpaid → 402, paid → 200, per route.
- Merchant metadata from section 3.

**Phase C — frontend on the same root domain (Sept 18–20)**

- Next.js (App Router) + Tailwind, dark, DeBank-minimal. `frontend/` in the same repo.
- One root domain: SPA at `/`, API proxied at `/v1/*`.
- Core screen: paste an address → auto-detect → portfolio; multiple addresses from localStorage, no login.
- Big total number, per-chain breakdown, holdings list with symbols/amounts/USD.
- Paid report flow (Pera wallet / x402 browser pattern) → report render.
- Mobile-first — the Devcon India audience will look at this on a phone.
- Loading, empty, and error states (invalid address, chain down).

**Phase D — harden and ship (Sept 20–22)**

- Deploy, CORS/paths verified end to end, metrics for x402 verify/settle counts.
- README final: screenshots, architecture diagram, all txid proofs.
- Demo video script, then record (2–3 min): paste address → portfolio → paid report → explorer txid.

**Phase E — volume (Sept 22–29, then through October)**

- Ship is the start of the work, not the end. The leaderboard is scored on real usage in October.
- Algorand Discord (`#x402`), X/Twitter threads, r/algorand, Devcon India communities.
- Get real people to pay from **their own wallets** — never self-payments. The rules penalise
  "repeated self-payments / wash transactions / artificial volume" and the administrator reserves the
  right to exclude activity it judges inauthentic.
- Submit the project (Sept 29) and keep the endpoint up through judging.

---

## 6. What to add to the backend before the frontend can be built

The frontend needs these to exist; this is the concrete gap list.

1. **Address auto-detect** (`TASKS.md` A1) — nothing in the repo sniffs address formats today; routes
   require an explicit `:chain` segment.
2. **Solana provider** — port is already designed for non-18-decimal natives.
3. **Bitcoin provider** — same.
4. **Seed rows + price-chain-map entries for ids 3 and 4** — two separate hardcoded places
   (`prisma/seed.ts`, `LLAMA_CHAINS` in `defillama-price-provider.ts`). A chain missing from
   `LLAMA_CHAINS` silently prices nothing and every snapshot comes back `partial` with no
   `totalValueUsd`.
5. **A multi-address / multichain aggregation endpoint.** This is the single biggest functional gap.
   Every existing route is exactly one chain + one address, and no code path aggregates across
   chains or addresses. The DeBank-style total cannot be assembled by the frontend without it.
6. **Per-route payment configuration.** `buildContainer` constructs one
   `PaymentRequirementsBuilder` from singular env vars, and `buildExtensions()` hardcodes
   `method: "GET"`, `queryParams: {chain, address}`, and a two-chain enum
   (`payment-requirements-builder.ts:95-137`). A composite entry at several prices cannot be
   expressed with this. This is the main refactor of Phase B.
7. **Fix the 402 response body.** `paymentRequiredSchema` under-declares the payload, and the zod
   response serializer strips undeclared keys — so the JSON body omits `extensions` and
   `accepts[].resource`/`accepts[].extensions`, while the base64 `PAYMENT-REQUIRED` header keeps them.
   No test covers this. It matters because catalog quality is judged.
8. **CORS as a list** — `origin` is a single string. Moot if the frontend is same-domain, but
   localhost dev plus the deployed domain will need it during development.
9. **Token coverage decision per chain** — a curated list makes a portfolio look wrong, which is the
   one thing a DeBank-alike cannot afford. The verified options differ per chain:
   - **Solana**: full discovery for free (RPC + Jupiter token list). Do not curate.
   - **Bitcoin**: naturally complete (a UTXO sum is the whole balance).
   - **Algorand**: algod already returns every opted-in asset; today's provider filters to USDC/USDt.
     Removing the filter needs asset metadata (name/decimals), which costs one `/v2/assets/{id}`
     lookup per unknown asset, cached. Progressively upgradeable.
   - **EVM**: genuinely needs an indexer or an API key to go beyond the 13 curated tokens. Either
     keep it curated and document the limit honestly, or spend one key (Alchemy/etherscan free tier).
10. **A `transactions` / `positions` decision.** The types and DB tables exist and are always `[]`.
    Leave them empty and documented, or wire BTC/Solana history from the same free APIs. Do not ship
    a history tab that renders nothing.
11. **Metrics** for x402 verifies/settles and provider latency — cheap, and "technical execution" is
    a scored criterion.

---

## 7. Technical gotchas

### 7.1 Address auto-detection is genuinely ambiguous

- EVM: `0x` + 40 hex — unambiguous.
- Algorand: 58 chars, base32 with a checksum — unambiguous (validated by `algosdk.isValidAddress`).
- **Solana and Bitcoin legacy addresses are both base58** and their length ranges overlap. A pasted
  base58 string may be either. Auto-detect must not guess silently: either resolve by probing both
  (Solana RPC account lookup, Bitcoin address API) or, when both validate, ask the user to pick.
- Bitcoin bech32 (`bc1…`) and taproot (`bc1p…`) are distinguishable by prefix.

### 7.2 A single builder instance cannot serve multiple paid routes

Per-route price and description are the blocker for the composite entry. Plan the refactor as
"builder factory keyed by route id" rather than editing env vars per route.

### 7.3 Provider deletion is safe, but registration is spread out

Wallet application services, HTTP schemas, cache, queue, and persistence are all chain-generic — a new
chain needs no changes there. The work is confined to: a provider class, its token list, the registry
wiring (`build-container.ts:53`), the `LLAMA_CHAINS` map, and a seed row. Four separate files, easy to
miss one. `docs/adding-a-chain.md` has the recipe; update it to list all five places.

### 7.4 Bitcoin and Solana rate limits

Both public endpoints are keyless and rate-limited. Cap concurrency on multi-address aggregation and
cache aggressively; a report over 10 addresses must not fire 10 unthrottled provider calls inside the
paid request. The free tier never calls a provider, but `/live` and the report routes do.

---

## 8. Scope cuts (unchanged, and still the right calls)

- No login — localStorage only.
- No transaction history (typed extension points stay empty and documented).
- Report is clean printable HTML, not generated PDF.
- Curated coverage on EVM documented as a limitation rather than papered over.
- Demo video polish happens after the product is live.
