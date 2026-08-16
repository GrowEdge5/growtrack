# Provider Strategy

Provider integrations should be selected by capability and operational fit rather than by SDK count. A provider may be used for RPC, token balances, historical transactions, pricing, or protocol positions independently.

Required adapter properties:

- explicit timeout and retry policy;
- normalized errors for rate limits, invalid requests, and unavailable data;
- stable chain/address input contracts;
- sanitized logs without API keys or full provider payloads;
- fixture-backed tests for response normalization;
- metrics for latency, failures, and rate-limit responses.

The initial implementation uses public EVM RPC through `viem` for native balance and block number only. Add an indexed-data provider before presenting holdings, transaction history, positions, or valuation as complete.
