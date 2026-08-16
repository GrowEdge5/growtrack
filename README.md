# Growtrack

Growtrack is a multichain wallet intelligence API. The current scaffold provides a production-oriented TypeScript modular monolith with a Fastify API, a BullMQ worker, PostgreSQL persistence, Redis caching, and an EVM provider adapter.

## Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop for PostgreSQL/Redis and integration tests

The scaffold has been installed, generated, type-checked, linted, tested, and compiled with Node.js and npm. Git and Docker are not currently available on `PATH` in this environment, and no PostgreSQL or Redis services are listening locally, so a live infrastructure-backed startup still requires those prerequisites.

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
