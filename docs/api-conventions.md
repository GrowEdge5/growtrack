# API Conventions

The API uses versioned REST paths under `/v1` and JSON responses with a `data` envelope. Read responses include `meta.source` and `meta.stale` so consumers can distinguish cache, database, and freshness behavior.

Errors use `application/problem+json` with:

```json
{
  "type": "https://growtrack.dev/problems/invalid-wallet-address",
  "title": "InvalidWalletAddressError",
  "status": 400,
  "detail": "The wallet address is invalid for chain 'ethereum'",
  "code": "INVALID_WALLET_ADDRESS"
}
```

Refresh requests return `202 Accepted`. Provider work is never performed synchronously by the request handler.
