# Adding a Chain

1. Add a stable chain slug and numeric/native metadata.
2. Implement `ChainDataProvider.normalizeAddress` with chain-specific validation and canonicalization.
3. Implement the capabilities available from the selected provider.
4. Return Growtrack domain objects, never raw provider response objects.
5. Register the provider in `src/app/build-container.ts`.
6. Add unit tests for address behavior and provider normalization fixtures.
7. Add the chain to the Prisma seed data and local environment documentation.

Provider capabilities may be partial. Mark the snapshot `partial` and expose source/freshness metadata when a provider cannot supply every intelligence category.
