import { afterEach, describe, expect, it, vi } from "vitest";

import { SolanaChainDataProvider } from "../../../../src/modules/chains/infrastructure/solana/solana-chain-data-provider.js";
import { SolanaTokenMetadataSource } from "../../../../src/modules/chains/infrastructure/solana/solana-token-metadata.js";
import { InvalidWalletAddressError } from "../../../../src/shared/domain/errors.js";

const OWNER = "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const tokenListUrl = "https://jupiter.test/tokens";

function provider(): SolanaChainDataProvider {
  return new SolanaChainDataProvider({
    chainId: 3,
    chainName: "solana",
    rpcUrl: "https://rpc.test",
    timeoutMs: 5_000,
    tokenMetadata: new SolanaTokenMetadataSource({ tokenListUrl })
  });
}

interface RpcStub {
  result?: unknown;
  error?: { code: number; message: string };
}

// Routes each call by JSON-RPC method and params, so one stub serves getBalance,
// getSlot and both token-program queries. Only the network boundary is faked.
function stubFetch(byMethod: Record<string, RpcStub | ((params: unknown[]) => RpcStub)>) {
  const fetchMock = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
    const url = String(input);
    if (url === tokenListUrl) {
      return {
        ok: true,
        json: async () => [{ id: USDC_MINT, symbol: "USDC", name: "USD Coin" }]
      };
    }

    const request = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as {
      method?: string;
      params?: unknown[];
    };
    const entry = byMethod[request.method ?? ""];
    if (entry === undefined) {
      throw new Error(`Unexpected RPC method in test: ${String(request.method)}`);
    }
    const stub = typeof entry === "function" ? entry(request.params ?? []) : entry;

    return {
      ok: true,
      json: async () => stub
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// The provider queries both SPL token programs. Returning the same accounts for
// both would double every balance, so fixtures answer the classic program only.
function tokenAccounts(value: unknown[]): (params: unknown[]) => RpcStub {
  return (params) => {
    const config = params[1] as { programId?: string } | undefined;
    const isClassicProgram = config?.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    return { result: { context: { slot: 1 }, value: isClassicProgram ? value : [] } };
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SolanaChainDataProvider", () => {
  it("accepts a 32-byte base58 key and rejects anything else", () => {
    expect(provider().normalizeAddress(OWNER).canonicalAddress).toBe(OWNER);
    // Case matters: base58 is not case-insensitive, and an EVM address is not a key.
    expect(() => provider().normalizeAddress("0xd8dA680F17485f5fE14a58674455179eBBfC1F40")).toThrow(
      InvalidWalletAddressError
    );
    expect(() => provider().normalizeAddress("not-a-key")).toThrow(InvalidWalletAddressError);
  });

  it("reads the native lamport balance as a string and reports the chain's 9 decimals", async () => {
    stubFetch({
      getBalance: { result: { context: { slot: 1 }, value: 44_500_000 } },
      getSlot: { result: 447_475_786 },
      getTokenAccountsByOwner: tokenAccounts([])
    });

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    expect(data.nativeBalance).toBe("44500000");
    expect(data.nativeSymbol).toBe("SOL");
    // Not 18: this is exactly the EVM assumption the port was designed to avoid.
    expect(data.nativeDecimals).toBe(9);
    expect(data.blockNumber).toBe("447475786");
    expect(data.provider).toBe("solana-rpc");
    expect(data.holdings).toEqual([]);
  });

  it("enumerates SPL holdings from both token programs and enriches them from the token list", async () => {
    stubFetch({
      getBalance: { result: { value: 1 } },
      getSlot: { result: 1 },
      getTokenAccountsByOwner: tokenAccounts([
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: USDC_MINT,
                  tokenAmount: { amount: "2500000", decimals: 6 }
                }
              }
            }
          }
        },
        // Zero balances are dropped, not reported as a holding of 0.
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: "So11111111111111111111111111111111111111112",
                  tokenAmount: { amount: "0", decimals: 9 }
                }
              }
            }
          }
        },
        // A malformed entry must not break the snapshot.
        { account: { data: { parsed: { info: { mint: 42 } } } } }
      ])
    });

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    expect(data.holdings).toEqual([
      {
        tokenAddress: USDC_MINT,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        rawAmount: "2500000"
      }
    ]);
  });

  it("sums several token accounts for the same mint instead of double-reporting it", async () => {
    stubFetch({
      getBalance: { result: { value: 1 } },
      getSlot: { result: 1 },
      getTokenAccountsByOwner: tokenAccounts([
        {
          account: {
            data: {
              parsed: {
                info: { mint: USDC_MINT, tokenAmount: { amount: "1500000", decimals: 6 } }
              }
            }
          }
        },
        {
          account: {
            data: {
              parsed: {
                info: { mint: USDC_MINT, tokenAmount: { amount: "500000", decimals: 6 } }
              }
            }
          }
        }
      ])
    });

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    expect(data.holdings).toHaveLength(1);
    expect(data.holdings[0]?.rawAmount).toBe("2000000");
  });

  it("still returns real balances when the metadata list is unavailable, inventing no ticker", async () => {
    const fetchMock = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (String(input) === tokenListUrl) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      const request = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as {
        method?: string;
        params?: unknown[];
      };
      if (request.method === "getBalance")
        return { ok: true, json: async () => ({ result: { value: 7 } }) };
      if (request.method === "getSlot") return { ok: true, json: async () => ({ result: 9 }) };

      const accounts = tokenAccounts([
        {
          account: {
            data: {
              parsed: { info: { mint: USDC_MINT, tokenAmount: { amount: "5", decimals: 6 } } }
            }
          }
        }
      ])(request.params ?? []);
      return { ok: true, json: async () => accounts };
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    expect(data.holdings).toHaveLength(1);
    // The mint itself identifies the token when no metadata is available — no
    // invented ticker, and the real balance is still reported.
    expect(data.holdings[0]?.symbol).toBe("EPjF…Dt1v");
    expect(data.holdings[0]?.name).toBe("Unrecognized SPL token");
  });

  it("excludes unverified airdrop mints but reports how many, rather than silently trimming", async () => {
    const airdropMint = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";
    stubFetch({
      getBalance: { result: { value: 1 } },
      getSlot: { result: 1 },
      getTokenAccountsByOwner: tokenAccounts([
        {
          account: {
            data: {
              parsed: { info: { mint: USDC_MINT, tokenAmount: { amount: "1000000", decimals: 6 } } }
            }
          }
        },
        {
          account: {
            data: {
              parsed: {
                info: { mint: airdropMint, tokenAmount: { amount: "9693075184", decimals: 6 } }
              }
            }
          }
        }
      ])
    });

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    // Only the verified token is reported; a real wallet here held 971 mint accounts,
    // nearly all of them junk, which would otherwise bloat every snapshot.
    expect(data.holdings.map((holding) => holding.symbol)).toEqual(["USDC"]);
    expect(data.signals).toHaveLength(1);
    expect(data.signals[0]?.category).toBe("token-coverage");
    expect(data.signals[0]?.title).toBe("1 unverified SPL token excluded");
  });

  it("reports no signal when every discovered mint is verified", async () => {
    stubFetch({
      getBalance: { result: { value: 1 } },
      getSlot: { result: 1 },
      getTokenAccountsByOwner: tokenAccounts([
        {
          account: {
            data: {
              parsed: { info: { mint: USDC_MINT, tokenAmount: { amount: "1", decimals: 6 } } }
            }
          }
        }
      ])
    });

    const data = await provider().fetchWalletData(provider().normalizeAddress(OWNER));

    expect(data.signals).toEqual([]);
  });

  it("throws rather than reporting a zero balance when the RPC returns an error", async () => {
    stubFetch({
      getBalance: { error: { code: -32602, message: "Invalid param" } },
      getSlot: { result: 1 },
      getTokenAccountsByOwner: tokenAccounts([])
    });

    await expect(provider().fetchWalletData(provider().normalizeAddress(OWNER))).rejects.toThrow(
      /Invalid param/
    );
  });
});
