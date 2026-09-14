# Growtrack

Growtrack is a multichain wallet intelligence API. The current build provides a production-oriented TypeScript modular monolith with a Fastify API, a BullMQ worker, PostgreSQL persistence, Redis caching, and **two read-chain adapters — EVM (Ethereum) and Algorand** — each reading native balance, curated token holdings, and USD valuation behind a shared provider port. On top of the read layer, a pay-per-query **x402 payment layer** (Algorand USDC micropayments via the official GoPlausible facilitator) gates a synchronous `/live` snapshot endpoint. Its `402 → verify → settle` path is implemented, covered by unit + e2e tests against a **mocked** facilitator, and — as of **2026-09-14** — **verified live on Algorand testnet against the real GoPlausible facilitator** (a real 0.001 USDC micropayment settled on-chain). A mainnet payment, a public HTTPS deploy, and a Bazaar listing are the remaining steps.

## Development Status

_Last verified: **2026-09-14** — x402 pay-per-query payment core (HTTP 402 + payment requirements + guard verify→settle via the GoPlausible facilitator client): **IMPLEMENTED & TESTED against a mocked facilitator, and LIVE-VERIFIED ON ALGORAND TESTNET against the real GoPlausible facilitator** (a real 0.001 USDC micropayment settled on-chain — see below; mainnet payment + public HTTPS + Bazaar listing remain). Algorand read chain (ALGO + curated ASA holdings + USD valuation): COMPLETE (2026-08-23). EVM wallet intelligence (ERC-20 holdings + USD pricing + valuation exposure): COMPLETE (2026-08-22). Phase 1 (scaffold + local infrastructure): COMPLETE (2026-08-18)._

### Completed progress

**x402 LIVE on Algorand testnet — first real on-chain settlement (2026-09-14)** — the `402 → verify → settle` flow was exercised end-to-end against the **live GoPlausible facilitator** (not a mock), and a real USDC micropayment settled on-chain:

- **Real testnet payment settled.** With the API running locally (`X402_ENABLED=true`) against the live facilitator, an x402 client paid the `/live` endpoint: the server returned `402` with payment requirements, the client signed and presented a `PAYMENT-SIGNATURE`, and the guard's verify + settle handshake moved real testnet USDC. Settlement txid [`IFDRIUXYTK2DAVRWVPYYMSSGORUVFBCMA5MG7DWG4GS73YSZ6LOA`](https://lora.algokit.io/testnet/transaction/IFDRIUXYTK2DAVRWVPYYMSSGORUVFBCMA5MG7DWG4GS73YSZ6LOA) — an `axfer` of `1000` atomic units (**0.001 USDC**, ASA `10458941`), confirmed round `67282318` on `testnet-v1.0`.
- **Gasless, atomic.** The payment carried `fee: 0` — the facilitator's fee-payer sponsored it inside an atomic transaction group, exactly as the x402 flow intends. The payer's USDC dropped by exactly `0.001`; `payTo` received exactly `0.001`; both cross-checked by independent algod reads.
- **HTTP facilitator adapter proven live.** This is the first exercise of `src/modules/payments/infrastructure/http-payment-facilitator.ts` against the real GoPlausible `POST /verify` + `POST /settle` — previously only type-checked. The paid retry returned `200` with a base64 `PAYMENT-RESPONSE` echoing the on-chain settlement.
- **Read-only guarantee intact.** Growtrack remained the resource server only. The payer was an external x402 wallet (the GoPlausible `algorand-mcp` client) that held the keys and signed; Growtrack never saw a key, never signed, and treated the payment payload as opaque.
- **Still ahead:** the same flow on **mainnet** (ASA `31566704`, USDC actually received at a mainnet `payTo`), a public **HTTPS** deploy, and a **Bazaar** listing under the `x402-global-challenge` tag.

**x402 pay-per-query payment core (2026-08-31)** — the read API is now gated behind an Algorand x402 micropayment on a new synchronous endpoint, implemented and tested end-to-end against a **mocked** facilitator (live on-chain verification is the next step):

- **New paid tier, freemium split.** `GET /v1/wallets/:chain/:address/live` returns a fresh, synchronous full snapshot and is gated by an x402 `preHandler` guard (`src/http/plugins/x402-guard.ts`). The free cached `GET` and the async `POST /refresh` routes are **untouched** — this adds a paid lane, it does not paywall the existing endpoints.
- **HTTP 402 + payment requirements.** When payment is absent, undecodable, or rejected, the guard responds `402` with x402 v2 payment requirements as both a JSON body and a base64 `PAYMENT-REQUIRED` header, built by a deterministic `PaymentRequirementsBuilder`: a single canonical `exact`-scheme accept carrying the network, USDC ASA, `payTo`, `feePayer`, price in atomic units, the asset `name`, and the `x402-global-challenge` tag — plus, when a public resource URL is configured (`X402_RESOURCE_URL`), a top-level `resource` descriptor (`url`/`description`/`mimeType`) that surfaces the endpoint in the GoPlausible Bazaar.
- **Verify → settle handshake.** On a presented `PAYMENT-SIGNATURE`, the guard decodes the opaque client payload and calls the **official GoPlausible facilitator** `POST /verify` then `POST /settle` (`src/modules/payments/infrastructure/http-payment-facilitator.ts`), forwarding the payload verbatim alongside the exact accept it priced. On success it sets a base64 `PAYMENT-RESPONSE` (the settlement result) and lets the snapshot handler run.
- **Fail-closed semantics.** No facilitator wired, missing/invalid signature, `isValid: false`, or `success: false` → `402` (an unpaid request is never served). Facilitator unreachable / non-2xx / timeout → `502` (a gateway error, kept distinct from "unpaid"). Growtrack never fakes verification and never substitutes a custom facilitator.
- **Read-only preserved.** Growtrack is the resource server, never the payer: it treats the payment payload as opaque, holds no keys, and never signs — the client's wallet and the facilitator move the funds.
- **Now verified live (2026-09-14):** the testnet payment against the real facilitator is done — see the [x402 LIVE on Algorand testnet](#completed-progress) entry above. **Not yet:** a mainnet payment, a public HTTPS deploy, and a Bazaar listing. The verify→settle logic is covered by unit + e2e tests with a **mocked** facilitator, and the HTTP facilitator adapter has now been exercised once against the live GoPlausible endpoint on testnet.

**Algorand read chain + ALGO/ASA USD valuation (2026-08-23)** — Algorand is now a first-class read chain alongside EVM, end-to-end:

- **ALGO balance + curated ASA holdings** are read from the keyless Algonode algod REST endpoint (`https://mainnet-api.algonode.cloud`) via `algosdk` v3 (`src/modules/chains/infrastructure/algorand/`). algosdk v3 returns `bigint` for account and asset amounts, so balances are carried as exact strings — **no JS-number precision loss** on whale ALGO balances or large-supply ASAs (a value above 2^53 would silently round as a JS `number`). Holdings are limited to a curated ASA list (USDC `31566704`, USDt `312769`); other ASAs simply do not appear.
- **Address safety.** Algorand addresses are case-sensitive base32 with a checksum, validated with `algosdk.isValidAddress` and kept **verbatim — never lowercased** (unlike EVM). We never hand-roll the checksum crypto.
- **Honest reads.** A `404` from algod is a genuine zero-balance account (reported as `"0"`, not an error); any other failure (timeout, 5xx) rethrows so a bad read never persists as data. The read path is bounded by a `Promise.race` timeout.
- **ALGO + ASA USD pricing** reuses the same DeFiLlama adapter: ALGO via `coingecko:algorand`, ASAs via `algorand:<assetId>`. One code path, one new chain-map entry — no special-casing.
- **Native decimals generalized.** The old hardcoded EVM 18-decimal constant became a per-provider `nativeDecimals` (EVM = 18, ALGO = 6) so ALGO's 6-decimal micro-unit scales correctly. Behavior-preserving for EVM. Growtrack-internal chain id `2` = Algorand mainnet (not EIP-155).
- **Live-verified read-only** against a public mainnet account: `nativeBalance` and USDC holding matched an **independent raw algod read** exactly (drift-free, same instant), and the priced snapshot returned `status: "complete"` with `totalValueUsd ≈ $188,825` (ALGO $0.089 + 188,851.85 USDC). EVM (vitalik.eth) still values to a complete USD total, unchanged.

**EVM wallet intelligence (2026-08-22)** — the wallet snapshot now carries real token holdings and USD valuation, end-to-end:

- **ERC-20 token holdings** are read in a single Multicall3 `balanceOf` batch over a curated Ethereum token list (`src/modules/chains/infrastructure/evm/ethereum-token-list.ts`). Only successful, non-zero balances appear; a per-token revert is tolerated (`allowFailure`) and never fails the whole snapshot. Nothing is fabricated or zero-filled.
- **USD pricing** uses the keyless DeFiLlama coins API (`https://coins.llama.fi`). One request prices the native currency plus every token. DeFiLlama's per-price `confidence` (0..1) is enforced at `>= 0.5`; anything lower is treated as unpriced. Pricing sits behind a `PriceProvider` port, so the source is a pure adapter swap. _(CoinGecko was dropped: its keyless API now caps token lookups at one address per request, which breaks the no-API-key design.)_
- **USD valuation is exposed** in the API: each holding carries an optional `valueUsd`, and the snapshot carries an optional top-level `totalValueUsd` (native + all priced holdings). Amounts use `decimal.js` and are persisted as `Decimal(36,8)`.
- **Honest `status` semantics.** `status: "complete"` means every asset we discovered was assigned a USD value — the native balance and every holding. Any missing price yields `"partial"`. **This describes USD-pricing coverage of the assets we found; it does NOT claim exhaustive portfolio coverage**, because token discovery is limited to the curated list above. A missing price is never faked — the holding simply has no `valueUsd` and is excluded from `totalValueUsd`, which is omitted entirely (never `"0"`) when nothing can be priced.

**Phase 1 — scaffold + local infrastructure (2026-08-18):**

- Docker Desktop + PostgreSQL + Redis brought up and verified; Prisma migration `20260817062730_init` applied.
- Fixed a startup bug: BullMQ eagerly connects the shared ioredis client during `Queue` construction, so the unconditional `redis.connect()` in the DI container threw `Redis is already connecting/connected`. Guarded in `src/app/build-container.ts`; fixes both API and worker boot.
- API + worker + full EVM read path verified end-to-end.

**Currently working functionality:**

- `GET /health/live`, `GET /health/ready` (DB + Redis checks), `GET /metrics`, `GET /docs`
- EVM (Ethereum) **native balance + block number + ERC-20 holdings (curated list) + USD pricing + `totalValueUsd`**, persisted in PostgreSQL and cached in Redis
- Algorand (mainnet) **ALGO balance + round + curated ASA holdings (USDC, USDt) + USD pricing + `totalValueUsd`**, through the same snapshot/persistence/cache path
- CQRS flow: `GET` reads cache/DB (`404` if absent) · `POST /refresh` enqueues · worker computes the snapshot

### Problems / limitations

- **Token discovery is curated-list-based, not exhaustive.** EVM holdings come from a fixed list of well-known Ethereum ERC-20s (`src/modules/chains/infrastructure/evm/ethereum-token-list.ts`); Algorand holdings come from a curated ASA list — USDC + USDt (`src/modules/chains/infrastructure/algorand/algorand-asset-list.ts`). A token/ASA outside its list is not detected. `status` reflects USD-pricing coverage of discovered assets, not total portfolio completeness. _(By design for now; documented above.)_
- **`transactions`, `positions`, `signals` are still empty** — unimplemented extension points, not fabricated data. _(Later scope.)_
- **Read chains: EVM (Ethereum) and Algorand (mainnet) are implemented.** Solana and Bitcoin are not, and Algorand testnet is a later `ALGORAND_API_URL` swap. _(Roadmap.)_
- **x402 payment layer: core implemented and LIVE on testnet; mainnet pending.** The `402 → verify → settle` flow (guard, payment-requirements builder, GoPlausible facilitator HTTP client) is built, covered by unit + e2e tests **against a mocked facilitator**, and **verified live on Algorand testnet** — a real 0.001 USDC payment settled via the live GoPlausible facilitator (txid `IFDRIUXYTK2DAVRWVPYYMSSGORUVFBCMA5MG7DWG4GS73YSZ6LOA`). What remains: a real payment on **mainnet** (USDC ASA `31566704`, received at `payTo`), a public HTTPS deploy, and a Bazaar listing. _(The mainnet payment is the remaining blocker for hackathon submission.)_
- Compiled/production start (`npm start`) expects env vars from the environment; `.env` is auto-loaded only in dev. _(Non-blocker; expected for Docker/prod deployment.)_

### Tests & verification

Every check below was actually executed.

| Command / check                                         | Result   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run ci`                                            | **PASS** | format:check ✓ · eslint ✓ · tsc --noEmit ✓ · vitest (32 tests / 8 files) ✓ · build ✓                                                                                                                                                                                                                                                                                                                                                                         |
| x402 guard unit tests (mocked facilitator)              | **PASS** | disabled pass-through, fail-closed 402 (no facilitator), missing/invalid signature → 402, `isValid:false` → 402 (+ never settles), `success:false` → 402, verify throws → 502 (+ never settles), paid happy-path → base64 `PAYMENT-RESPONSE`, `decodePaymentSignature` (10 tests)                                                                                                                                                                            |
| x402 guard e2e (Fastify + zod, mocked facilitator)      | **PASS** | unpaid → 402 (body + `PAYMENT-REQUIRED` header), disabled → 200, paid verify+settle → 200 `meta.source:"live"` + `PAYMENT-RESPONSE` decodes to the settlement — full route/serializer, zero provider/DB IO (3 tests)                                                                                                                                                                                                                                         |
| Live x402 payment — Algorand testnet (real GoPlausible) | **PASS** | 2026-09-14, real on-chain: `402` → client-signed `PAYMENT-SIGNATURE` → live facilitator verify + settle → `200` + base64 `PAYMENT-RESPONSE`. Settlement txid `IFDRIUXYTK2DAVRWVPYYMSSGORUVFBCMA5MG7DWG4GS73YSZ6LOA` — `axfer` 0.001 USDC (ASA `10458941`), `fee 0` (gasless, facilitator-sponsored, atomic group), round `67282318`. Payer −0.001, `payTo` +0.001, cross-checked by independent algod reads. First live hit of the HTTP facilitator adapter. |
| `applyUsdPricing` unit tests                            | **PASS** | totals, missing-price honesty, the `complete`/`partial` status rule, and 6-decimal (ALGO) native scaling (6 tests)                                                                                                                                                                                                                                                                                                                                           |
| Algorand provider unit tests (mocked algod)             | **PASS** | verbatim-address accept + lowercase/junk reject, curated/non-curated/zero-amount ASA mapping, `404` → zero-balance, non-`404` rethrow (5 tests)                                                                                                                                                                                                                                                                                                              |
| `walletResponseSchema` serializer test                  | **PASS** | confirms `totalValueUsd` + per-holding `valueUsd` survive serialization — the field zod previously stripped (2 tests)                                                                                                                                                                                                                                                                                                                                        |
| Live Algorand read + DeFiLlama pricing (`ABQH…F7QY`)    | **PASS** | 2026-08-23, read-only: `status: "complete"`, `totalValueUsd ≈ $188,825`; `nativeBalance` + USDC holding cross-checked against an **independent raw algod read** (drift-free). Provider-level — the route/serializer is chain-generic and already `GET`-verified for EVM.                                                                                                                                                                                     |
| Live refresh + `GET` (vitalik.eth `0xd8dA…6045`)        | **PASS** | 2026-08-22: `200`, `status: "complete"`, `totalValueUsd ≈ $20,086.64`, all 9 discovered holdings priced with `valueUsd`, through the full Fastify/zod serializer                                                                                                                                                                                                                                                                                             |
| Docker `postgres` + `redis`                             | **PASS** | `Up (healthy)`, ports 5432 / 6379                                                                                                                                                                                                                                                                                                                                                                                                                            |

### Infrastructure status

| Component          | Status                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Docker Desktop     | RUNNING (v4.87.0)                                                 |
| PostgreSQL         | RUNNING & VERIFIED (`:5432`, healthy)                             |
| Redis              | RUNNING & VERIFIED (`:6379`, healthy)                             |
| API (Fastify)      | RUNNING & VERIFIED (`:3000`)                                      |
| Worker (BullMQ)    | RUNNING & VERIFIED                                                |
| Environment config | `.env` present (gitignored), schema-validated, auto-loaded in dev |

### Hackathon compliance status (Algorand Global x402 Challenge)

| Requirement                      | Status                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Paid x402 endpoint               | IMPLEMENTED & LIVE-VERIFIED (testnet) — `/live` gated by the guard; real payment settled 2026-09-14                  |
| HTTP 402 response                | IMPLEMENTED, TESTED (mock) & LIVE (testnet) — JSON body + base64 `PAYMENT-REQUIRED` header                           |
| Verify → settle handshake        | IMPLEMENTED, TESTED (mock) & LIVE-VERIFIED (testnet) — real facilitator verify + settle hit                          |
| Fail-closed (402/502) semantics  | IMPLEMENTED & TESTED (mock) — unpaid → 402, gateway error → 502                                                      |
| GoPlausible x402 Facilitator     | CLIENT IMPLEMENTED & EXERCISED LIVE (testnet verify + settle); mainnet not yet                                       |
| `x402-global-challenge` tag      | IMPLEMENTED & TESTED (mock) — emitted in `accept.extra.tag`                                                          |
| Mainnet USDC ASA `31566704`      | CONFIGURED in payment requirements; no real payment yet                                                              |
| `payTo` (Mainnet, USDC-opted-in) | CONFIGURED value; on-chain opt-in + receipt NOT VERIFIED                                                             |
| Algorand Testnet flow            | DONE (2026-09-14) — real payment settled; txid `IFDRIUXY…6LOA`, 0.001 USDC ASA `10458941`, round `67282318`, gasless |
| Algorand Mainnet flow            | NOT TESTED — no real mainnet payment yet                                                                             |
| Bazaar discovery                 | NOT IMPLEMENTED                                                                                                      |
| HTTPS (public)                   | NOT IMPLEMENTED (local HTTP only)                                                                                    |
| Real Mainnet payment             | NOT TESTED                                                                                                           |
| USDC received at payTo           | NOT TESTED                                                                                                           |
| Leaderboard attribution          | NOT TESTED                                                                                                           |
| Submission readiness             | NOT READY — testnet live-verified; **mainnet payment** + HTTPS + Bazaar pending                                      |

**Read the table strictly.** Every row above is about the **x402 _payment_ layer**. Its **core is implemented, mock-tested, and now live-verified on Algorand testnet** — the `402 → verify → settle` handshake, the payment-requirements builder, the fail-closed 402/502 semantics, and the `x402-global-challenge` tag (see [Completed progress](#completed-progress)), with a real 0.001 USDC payment settled on-chain via the live GoPlausible facilitator. What is **still not** done is the **mainnet** flow: a real USDC payment on mainnet received at `payTo`, a public HTTPS deploy, and a Bazaar listing. A real 0.001 USDC payment already settled on **testnet** via the live facilitator (payer −0.001, `payTo` +0.001, txid `IFDRIUXY…6LOA`), so the live path is proven; the rows still reading "CONFIGURED", "NOT TESTED", or "NOT IMPLEMENTED" mark the remaining mainnet + HTTPS + Bazaar gap. None of this contradicts the completed Algorand **data** layer, which already reads ALGO + curated ASA balances from mainnet and prices them in USD. The remaining live-payment work is the real blocker for hackathon submission.

### Current project phase

**Multichain read + USD valuation layer: COMPLETE and verified. x402 payment core: IMPLEMENTED, mock-tested, and LIVE-VERIFIED on Algorand testnet.** Two first-class read chains — EVM (Ethereum) and Algorand (mainnet) — each return native balance, curated token/ASA holdings, and USD totals through a shared provider port, persisted and cached, verified live read-only against public mainnet addresses. On top of that, the paid `/live` endpoint is gated by an x402 guard whose `402 → verify → settle` path (over the GoPlausible facilitator client) is covered by unit + e2e tests with a **mocked** facilitator. **Next phase: mainnet** — repeat the now-proven testnet flow on mainnet (USDC ASA `31566704`, received at `payTo`), deploy over public HTTPS, and list on Bazaar. The testnet leg is done (a real 0.001 USDC payment settled via the live GoPlausible facilitator, txid `IFDRIUXY…6LOA`); the **mainnet** payment is the remaining blocker for hackathon submission.

### Next recommended step

**Take x402 live on mainnet (Phase 4.4+)** — the `402 → verify → settle` core is built, mock-tested, and now proven on testnet against the live facilitator; what remains is mainnet + HTTPS + Bazaar:

1. ~~Run one real end-to-end payment on **Algorand testnet** (USDC ASA `10458941`).~~ **DONE (2026-09-14)** — a genuine `402` → client-signed payment → verify + settle moved real testnet USDC (0.001, ASA `10458941`) via the live **GoPlausible facilitator**; txid `IFDRIUXYTK2DAVRWVPYYMSSGORUVFBCMA5MG7DWG4GS73YSZ6LOA`, round `67282318`, gasless. First live exercise of the HTTP facilitator adapter against the real endpoint.
2. Wire a mainnet `payTo` address opted into USDC and repeat once on **mainnet** (ASA `31566704`), confirming USDC is actually received at `payTo`.
3. Deploy over public **HTTPS** and list on **Bazaar** with the `x402-global-challenge` tag so the paid endpoint is discoverable.
4. Only then flip the submission-readiness rows above to done.

The multichain data layer and the x402 core are both in place, so nothing new needs building for this — it is verification against live infrastructure. Read-only guarantee for blockchain data stays intact: the payment layer treats the client payload as opaque and never signs on a user's behalf.

## Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop for PostgreSQL/Redis and integration tests

The scaffold is installed, generated, type-checked, linted, tested, and compiled. Local infrastructure (Docker Desktop, PostgreSQL, Redis) and the live API + worker runtime are verified as of 2026-08-18 — see [Development Status](#development-status) below for the full breakdown.

## Local setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Start the worker in a second terminal:

```bash
npm run dev:worker
```

The API is served at `http://localhost:3000`.

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Metrics: `GET /metrics`
- OpenAPI UI: `http://localhost:3000/docs`
- Wallet snapshot (EVM): `GET /v1/wallets/ethereum/:address`
- Queue refresh (EVM): `POST /v1/wallets/ethereum/:address/refresh`
- Wallet snapshot (Algorand): `GET /v1/wallets/algorand/:address`
- Queue refresh (Algorand): `POST /v1/wallets/algorand/:address/refresh`

The route is chain-generic — the `:chain` segment selects the registered provider, so no per-chain route code exists. Algorand addresses are case-sensitive; pass them verbatim (never lowercased).

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Current capability boundary

Two read chains share one provider port. The **EVM** provider reads native balance, block number, and ERC-20 holdings (from a curated Ethereum token list); the **Algorand** provider reads the ALGO balance, round, and curated ASA holdings (USDC, USDt) from a keyless algod endpoint, keeping addresses verbatim (case-sensitive base32 — never lowercased). Each holding is then enriched with a USD `valueUsd` and the snapshot with a `totalValueUsd`, priced through the same keyless DeFiLlama adapter. A snapshot is `complete` only when the native balance and every discovered holding were priced; otherwise it is `partial`. Because token/ASA discovery is limited to the curated lists, `complete` describes USD-pricing coverage of the assets found — **not** exhaustive portfolio coverage. Transactions, protocol positions, and intelligence signals remain explicit extension points rather than fabricated data. Blockchain access is **read-only**: Growtrack never holds keys, signs, or moves funds.
