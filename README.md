# Growtrack

Growtrack is a multichain wallet intelligence API. The current scaffold provides a production-oriented TypeScript modular monolith with a Fastify API, a BullMQ worker, PostgreSQL persistence, Redis caching, and an EVM provider adapter.

## Development Status

_Last verified: **2026-08-18** — Phase 1 (scaffold + local infrastructure verification): **COMPLETE**._

### Completed progress

- **Local infrastructure brought up and verified.** Docker Desktop engine running (v4.87.0); `growtrack-postgres-1` and `growtrack-redis-1` containers healthy on `5432` / `6379`.
- **Prisma migration confirmed applied** — `prisma migrate status` reports _"Database schema is up to date"_ (migration `20260817062730_init`).
- **Fixed a startup bug that prevented the API and worker from booting.** BullMQ eagerly initiates a connection on the shared ioredis client during `Queue` construction, so the unconditional `redis.connect()` in the DI container threw `Redis is already connecting/connected` and the process exited before `listen()`. Guarded the explicit connect in `src/app/build-container.ts` (`connect()`); this fixes both the API (`main.ts`) and the worker (`worker.ts`).
- **API verified running** (`npm run dev`) with every core endpoint responding.
- **Worker verified running** (`npm run dev:worker`) and consuming BullMQ jobs.
- **Full EVM read path verified end-to-end** against a known public address (vitalik.eth `0xd8dA…6045`): `POST /refresh` → BullMQ → worker → viem (`ethereum-rpc.publicnode.com`) → real native balance + block → PostgreSQL + Redis → `GET` returns `200`.

**Files changed this session:** `src/app/build-container.ts` (Redis connect guard — the only code change).

**Currently working functionality:**

- `GET /health/live`, `GET /health/ready` (DB + Redis checks), `GET /metrics`, `GET /docs`
- EVM (Ethereum) **native balance + block number** via viem, persisted in PostgreSQL and cached in Redis
- CQRS flow: `GET` reads cache/DB (`404` if absent) · `POST /refresh` enqueues · worker computes the snapshot

### Problems / limitations

- **Wallet snapshot is `partial` by design** — `holdings`, `transactions`, `positions`, `signals` are empty. These are unimplemented extension points, not fabricated data. _(Non-blocker; Phase 2 scope. File: `src/modules/chains/infrastructure/evm/viem-chain-data-provider.ts`.)_
- **Only EVM/Ethereum is implemented.** Algorand, Solana, Bitcoin are not. _(Non-blocker for Phase 1; roadmap Phases 3–4.)_
- **No pricing** — no CoinGecko/USD valuation yet. _(Non-blocker; Phase 2.)_
- **x402 payment layer not started.** _(Blocker for hackathon submission — roadmap Phases 6–8.)_
- Compiled/production start (`npm start`) expects env vars from the environment; `.env` is auto-loaded only in dev (via `tsx`). _(Non-blocker; expected for Docker/prod deployment.)_

### Tests & verification

Every check below was actually executed this session.

| Command | Result | Notes |
| --- | --- | --- |
| `docker compose ps` | **PASS** | postgres + redis `Up (healthy)`, ports 5432 / 6379 |
| `npx prisma migrate status` | **PASS** | "Database schema is up to date" (1 migration) |
| `npm run dev` (API) | **PASS** | listening on `:3000` after the Redis fix |
| `curl /health/live` | **PASS** | `200` `{"status":"ok"}` |
| `curl /health/ready` | **PASS** | `200` `{"status":"ready","checks":{"database":"up","redis":"up"}}` |
| `curl /metrics` | **PASS** | `200`, Prometheus `growtrack_*` metrics |
| `curl /docs` | **PASS** | `200` `text/html` (Swagger UI) |
| `GET /v1/wallets/ethereum/<addr>` (cold) | **PASS** | `404` `WALLET_NOT_FOUND` (expected — nothing cached yet) |
| `POST /v1/wallets/ethereum/<addr>/refresh` | **PASS** | `202` + `jobId` |
| `npm run dev:worker` + reprocess | **PASS** | worker consumed the job |
| `GET /v1/wallets/ethereum/<addr>` (after refresh) | **PASS** | `200`, real snapshot: `nativeBalance` `6635339380601433797` wei, `blockNumber` `25780084`, `provider` `viem-rpc`, `status` `partial` |
| `npm run ci` | **PASS** | format:check ✓ · eslint ✓ · tsc --noEmit ✓ · vitest (4 tests / 2 files) ✓ · build ✓ |

### Infrastructure status

| Component | Status |
| --- | --- |
| Docker Desktop | RUNNING (v4.87.0) |
| PostgreSQL | RUNNING & VERIFIED (`:5432`, healthy) |
| Redis | RUNNING & VERIFIED (`:6379`, healthy) |
| API (Fastify) | RUNNING & VERIFIED (`:3000`) |
| Worker (BullMQ) | RUNNING & VERIFIED |
| Environment config | `.env` present (gitignored), schema-validated, auto-loaded in dev |

### Hackathon compliance status (Algorand Global x402 Challenge)

| Requirement | Status |
| --- | --- |
| Paid x402 endpoint | NOT IMPLEMENTED |
| HTTP 402 response | NOT IMPLEMENTED |
| Algorand Testnet flow | NOT IMPLEMENTED |
| Algorand Mainnet endpoint | NOT IMPLEMENTED |
| GoPlausible x402 Facilitator | NOT IMPLEMENTED |
| Mainnet USDC ASA `31566704` | NOT IMPLEMENTED |
| `payTo` (Mainnet, USDC-opted-in) | NOT IMPLEMENTED |
| Bazaar discovery | NOT IMPLEMENTED |
| `x402-global-challenge` tag | NOT IMPLEMENTED |
| HTTPS (public) | NOT IMPLEMENTED (local HTTP only) |
| Real Mainnet payment | NOT TESTED |
| USDC received at payTo | NOT TESTED |
| Leaderboard attribution | NOT TESTED |
| Submission readiness | NOT IMPLEMENTED |

### Current project phase

**Phase 1 — scaffold + local infrastructure verification: COMPLETE.** Runtime API + worker + full EVM read path are verified locally.

### Next recommended step

1. **Commit this tested milestone** (Redis startup fix + verified Phase 1):

   ```bash
   git add README.md src/app/build-container.ts && git commit -m "Fix Redis double-connect on startup; verify Phase 1 API/worker/EVM flow"
   ```

2. **Begin Phase 2 — EVM wallet intelligence:** extend `viem-chain-data-provider.ts` beyond native balance to ERC-20 token holdings, then add USD pricing (CoinGecko). Test each addition before moving on.

x402 work (roadmap Phases 6–8) stays deferred until the multichain data layer is solid, per the project plan.

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
- Wallet snapshot: `GET /v1/wallets/ethereum/:address`
- Queue refresh: `POST /v1/wallets/ethereum/:address/refresh`

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Current capability boundary

The first provider slice reads native EVM balance and block number. The returned wallet snapshot is marked `partial`; holdings, transactions, protocol positions, pricing, and intelligence signals are explicit extension points rather than fabricated data.
