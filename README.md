# Growtrack

Growtrack is a multichain wallet intelligence API. The current build provides a production-oriented TypeScript modular monolith with a Fastify API, a BullMQ worker, PostgreSQL persistence, Redis caching, and **two read-chain adapters — EVM (Ethereum) and Algorand** — each reading native balance, curated token holdings, and USD valuation behind a shared provider port.

## Development Status

_Last verified: **2026-08-23** — Algorand read chain (ALGO + curated ASA holdings + USD valuation): **COMPLETE**. EVM wallet intelligence (ERC-20 holdings + USD pricing + valuation exposure): COMPLETE (2026-08-22). Phase 1 (scaffold + local infrastructure): COMPLETE (2026-08-18)._

### Completed progress

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
- **x402 payment layer not started.** _(Blocker for hackathon submission — next roadmap phase.)_
- Compiled/production start (`npm start`) expects env vars from the environment; `.env` is auto-loaded only in dev. _(Non-blocker; expected for Docker/prod deployment.)_

### Tests & verification

Every check below was actually executed.

| Command / check                                      | Result   | Notes                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run ci`                                         | **PASS** | format:check ✓ · eslint ✓ · tsc --noEmit ✓ · vitest (17 tests / 5 files) ✓ · build ✓                                                                                                                                                                                     |
| `applyUsdPricing` unit tests                         | **PASS** | totals, missing-price honesty, the `complete`/`partial` status rule, and 6-decimal (ALGO) native scaling (6 tests)                                                                                                                                                       |
| Algorand provider unit tests (mocked algod)          | **PASS** | verbatim-address accept + lowercase/junk reject, curated/non-curated/zero-amount ASA mapping, `404` → zero-balance, non-`404` rethrow (5 tests)                                                                                                                          |
| `walletResponseSchema` serializer test               | **PASS** | confirms `totalValueUsd` + per-holding `valueUsd` survive serialization — the field zod previously stripped (2 tests)                                                                                                                                                    |
| Live Algorand read + DeFiLlama pricing (`ABQH…F7QY`) | **PASS** | 2026-08-23, read-only: `status: "complete"`, `totalValueUsd ≈ $188,825`; `nativeBalance` + USDC holding cross-checked against an **independent raw algod read** (drift-free). Provider-level — the route/serializer is chain-generic and already `GET`-verified for EVM. |
| Live refresh + `GET` (vitalik.eth `0xd8dA…6045`)     | **PASS** | 2026-08-22: `200`, `status: "complete"`, `totalValueUsd ≈ $20,086.64`, all 9 discovered holdings priced with `valueUsd`, through the full Fastify/zod serializer                                                                                                         |
| Docker `postgres` + `redis`                          | **PASS** | `Up (healthy)`, ports 5432 / 6379                                                                                                                                                                                                                                        |

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

| Requirement                      | Status                            |
| -------------------------------- | --------------------------------- |
| Paid x402 endpoint               | NOT IMPLEMENTED                   |
| HTTP 402 response                | NOT IMPLEMENTED                   |
| Algorand Testnet flow            | NOT IMPLEMENTED                   |
| Algorand Mainnet endpoint        | NOT IMPLEMENTED                   |
| GoPlausible x402 Facilitator     | NOT IMPLEMENTED                   |
| Mainnet USDC ASA `31566704`      | NOT IMPLEMENTED                   |
| `payTo` (Mainnet, USDC-opted-in) | NOT IMPLEMENTED                   |
| Bazaar discovery                 | NOT IMPLEMENTED                   |
| `x402-global-challenge` tag      | NOT IMPLEMENTED                   |
| HTTPS (public)                   | NOT IMPLEMENTED (local HTTP only) |
| Real Mainnet payment             | NOT TESTED                        |
| USDC received at payTo           | NOT TESTED                        |
| Leaderboard attribution          | NOT TESTED                        |
| Submission readiness             | NOT IMPLEMENTED                   |

**Read the table strictly.** Every row above is about the **x402 _payment_ layer**, which is not started. It does **not** contradict the completed Algorand **data** layer: Growtrack already reads ALGO + curated ASA balances from Algorand mainnet and prices them in USD (see [Completed progress](#completed-progress)). What's missing is the paid `402` endpoint, the GoPlausible facilitator handshake, and the on-chain USDC settlement — i.e. turning that read into a metered, pay-per-query service. That payment layer is the next phase and the real blocker for hackathon submission.

### Current project phase

**Multichain read + USD valuation layer: COMPLETE and verified.** Two first-class read chains — EVM (Ethereum) and Algorand (mainnet) — each return native balance, curated token/ASA holdings, and USD totals through a shared provider port, persisted and cached. Both are verified live read-only against public mainnet addresses. **Next phase: the x402 payment layer** (metered pay-per-query access over the GoPlausible facilitator on Algorand) — not started, and the blocker for hackathon submission.

### Next recommended step

**Build the x402 payment layer (Phase 4)** — turn the working read API into a metered, pay-per-query service:

1. Return `HTTP 402` with x402 payment requirements on the wallet endpoints when no valid payment proof is presented.
2. Verify payment through the **official GoPlausible x402 Facilitator** (no custom or fake facilitator), settling in USDC — Algorand testnet ASA `10458941` first, then mainnet ASA `31566704`.
3. On verified payment, serve the existing snapshot; wire a mainnet `payTo` address opted into USDC.
4. Deploy over public HTTPS, list on Bazaar with the `x402-global-challenge` tag, and run one real end-to-end mainnet payment before submission.

The multichain data layer is now solid, so x402 has a wallet it can actually describe. Read-only guarantee for blockchain data stays intact — the payment layer never signs on a user's behalf.

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
