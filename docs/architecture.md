# Growtrack Architecture

Growtrack is a modular monolith with separate API and worker processes. Both processes compose the same application services, so background refreshes and HTTP reads use the same domain contracts.

## Boundaries

- `src/modules/*/domain`: framework-free business concepts and invariants.
- `src/modules/*/application`: use cases and ports. These modules coordinate behavior without knowing Prisma, Redis, BullMQ, Fastify, or provider SDKs.
- `src/modules/*/infrastructure`: implementations of module ports.
- `src/infrastructure`: shared database, cache, and queue clients.
- `src/http`: transport schemas, routes, OpenAPI, and problem responses.
- `src/jobs`: versioned queue payloads and processors.
- `src/app`: composition roots and process lifecycle.

## First vertical slice

The initial EVM provider reads a native balance and block number through `viem`. It returns a `partial` snapshot because token indexing, historical transactions, protocol positions, prices, and intelligence rules require additional data capabilities.

The read path is cache-first:

1. Normalize chain and address through the chain provider.
2. Read a serialized snapshot from Redis.
3. Fall back to the latest PostgreSQL snapshot.
4. Return freshness metadata to the caller.

The refresh path is asynchronous:

1. Validate and normalize the wallet.
2. Create an idempotent BullMQ job ID for the wallet and refresh window.
3. The worker fetches provider data.
4. The repository persists a new snapshot.
5. Redis is updated with the normalized snapshot.

## Adding a chain

Implement `ChainDataProvider`, add chain-specific address normalization and capabilities, register the provider in `build-container.ts`, and add fixture/contract tests. Do not change wallet application services or HTTP response models for chain-specific provider details.
