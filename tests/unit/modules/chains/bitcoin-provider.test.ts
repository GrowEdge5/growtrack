import { afterEach, describe, expect, it, vi } from "vitest";

import { BitcoinChainDataProvider } from "../../../../src/modules/chains/infrastructure/bitcoin/bitcoin-chain-data-provider.js";
import { InvalidWalletAddressError } from "../../../../src/shared/domain/errors.js";

const ADDRESS = "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97";

function provider(
  options: { apiUrl?: string; fallbackApiUrl?: string } = {}
): BitcoinChainDataProvider {
  return new BitcoinChainDataProvider({
    chainId: 4,
    chainName: "bitcoin",
    apiUrl: options.apiUrl ?? "https://esplora.test/api",
    timeoutMs: 5_000,
    ...(options.fallbackApiUrl !== undefined ? { fallbackApiUrl: options.fallbackApiUrl } : {})
  });
}

// Fakes only the network boundary: Esplora returns JSON for the address and plain
// text for the tip height, which is what the real API does.
function stubFetch(handler: (url: string) => { ok: boolean; status?: number; body: string }) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const response = handler(String(input));
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: async () => response.body,
      json: async () => JSON.parse(response.body) as unknown
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const addressBody = JSON.stringify({
  chain_stats: { funded_txo_sum: 530_775_983_881_106, spent_txo_sum: 517_774_975_978_040 },
  mempool_stats: { funded_txo_sum: 4_218, spent_txo_sum: 0 }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BitcoinChainDataProvider", () => {
  it("accepts bech32 and legacy base58 addresses and rejects anything else", () => {
    expect(provider().normalizeAddress(ADDRESS).canonicalAddress).toBe(ADDRESS);
    expect(provider().normalizeAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa").canonicalAddress).toBe(
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    );
    expect(() => provider().normalizeAddress("0xd8dA680F17485f5fE14a58674455179eBBfC1F40")).toThrow(
      InvalidWalletAddressError
    );
    expect(() => provider().normalizeAddress("bc1qqqq")).toThrow(InvalidWalletAddressError);
  });

  it("reports confirmed plus mempool satoshis with 8 decimals and no holdings", async () => {
    stubFetch((url) =>
      url.endsWith("/blocks/tip/height")
        ? { ok: true, body: "912345" }
        : { ok: true, body: addressBody }
    );

    const data = await provider().fetchWalletData(provider().normalizeAddress(ADDRESS));

    // (funded - spent) confirmed + unconfirmed.
    expect(data.nativeBalance).toBe("13001007907284");
    expect(data.nativeSymbol).toBe("BTC");
    expect(data.nativeDecimals).toBe(8);
    expect(data.blockNumber).toBe("912345");
    expect(data.provider).toBe("esplora-rest");
    // A Bitcoin address holds no tokens: the UTXO sum is the whole portfolio.
    expect(data.holdings).toEqual([]);
  });

  it("falls back to the secondary API base when the primary fails", async () => {
    const fetchMock = stubFetch((url) =>
      url.startsWith("https://esplora.test")
        ? { ok: false, status: 502, body: "" }
        : url.endsWith("/blocks/tip/height")
          ? { ok: true, body: "900000" }
          : { ok: true, body: addressBody }
    );

    const data = await provider({
      apiUrl: "https://esplora.test/api",
      fallbackApiUrl: "https://backup.test/api"
    }).fetchWalletData(provider().normalizeAddress(ADDRESS));

    expect(data.nativeBalance).toBe("13001007907284");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://backup.test/api/address/"),
      expect.anything()
    );
  });

  it("throws when every configured API base fails, rather than reporting zero", async () => {
    stubFetch(() => ({ ok: false, status: 503, body: "" }));

    await expect(provider().fetchWalletData(provider().normalizeAddress(ADDRESS))).rejects.toThrow(
      /responded 503/
    );
  });
});
