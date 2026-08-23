import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as AlgosdkModule from "algosdk";

import { AlgorandChainDataProvider } from "../../../../src/modules/chains/infrastructure/algorand/algorand-chain-data-provider.js";
import { ALGORAND_MAINNET_CHAIN_ID } from "../../../../src/modules/chains/infrastructure/algorand/algorand-asset-list.js";
import { InvalidWalletAddressError } from "../../../../src/shared/domain/errors.js";

// The account read is stubbed, but the REAL isValidAddress (base32 + checksum) is
// kept so address validation is genuinely exercised — only Algodv2 is replaced.
const { doMock } = vi.hoisted(() => ({ doMock: vi.fn() }));

vi.mock("algosdk", async (importOriginal) => {
  const actual = await importOriginal<typeof AlgosdkModule>();
  class Algodv2Stub {
    public accountInformation(): { do: typeof doMock } {
      return { do: doMock };
    }
  }
  return {
    ...actual,
    default: {
      ...actual.default,
      Algodv2: Algodv2Stub
    }
  };
});

// A freshly generated, unfunded mainnet-format address (uppercase base32). Used
// only to exercise validation; no key material is involved.
const VALID_ADDRESS = "DDTEFH2N2P5GDFAJOT6SSD2TV2DUSC3DMX7KTVNOYXWISWTMQBMDG5DJ5M";

function buildProvider(): AlgorandChainDataProvider {
  return new AlgorandChainDataProvider({
    chainId: ALGORAND_MAINNET_CHAIN_ID,
    chainName: "algorand",
    apiUrl: "https://mainnet-api.algonode.cloud",
    timeoutMs: 10_000
  });
}

describe("AlgorandChainDataProvider", () => {
  beforeEach(() => {
    doMock.mockReset();
  });

  describe("normalizeAddress", () => {
    it("accepts a valid address verbatim, without changing its case", () => {
      const provider = buildProvider();

      const identity = provider.normalizeAddress(`  ${VALID_ADDRESS}  `);

      // Case-sensitive base32: canonical and display are the trimmed input, unchanged.
      expect(identity.canonicalAddress).toBe(VALID_ADDRESS);
      expect(identity.displayAddress).toBe(VALID_ADDRESS);
      expect(identity.chain).toEqual({
        id: ALGORAND_MAINNET_CHAIN_ID,
        slug: "algorand",
        namespace: "algorand",
        nativeSymbol: "ALGO"
      });
    });

    it("throws InvalidWalletAddressError on a malformed address", () => {
      const provider = buildProvider();

      expect(() => provider.normalizeAddress("not-a-real-address")).toThrow(
        InvalidWalletAddressError
      );
      // Lowercasing a valid address breaks its checksum — proves we must not lowercase.
      expect(() => provider.normalizeAddress(VALID_ADDRESS.toLowerCase())).toThrow(
        InvalidWalletAddressError
      );
    });
  });

  describe("fetchWalletData", () => {
    it("maps native balance and keeps only curated, non-zero ASA holdings", async () => {
      doMock.mockResolvedValueOnce({
        amount: 5_000_000n, // 5 ALGO in microAlgos
        round: 12_345n,
        assets: [
          { assetId: 31566704n, amount: 1_000_000n, isFrozen: false }, // USDC (curated) -> kept
          { assetId: 999999999n, amount: 500n, isFrozen: false }, // non-curated -> dropped
          { assetId: 312769n, amount: 0n, isFrozen: false } // curated but zero -> dropped
        ]
      });
      const provider = buildProvider();

      const data = await provider.fetchWalletData(provider.normalizeAddress(VALID_ADDRESS));

      expect(data.nativeBalance).toBe("5000000");
      expect(data.nativeDecimals).toBe(6);
      expect(data.nativeSymbol).toBe("ALGO");
      expect(data.provider).toBe("algonode-rest");
      expect(data.blockNumber).toBe("12345");
      expect(data.holdings).toEqual([
        {
          tokenAddress: "31566704",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
          rawAmount: "1000000"
        }
      ]);
      expect(data.transactions).toEqual([]);
      expect(data.positions).toEqual([]);
      expect(data.signals).toEqual([]);
    });

    it("treats a 404 as a genuine zero-balance account rather than an error", async () => {
      doMock.mockRejectedValueOnce({ response: { status: 404 } });
      const provider = buildProvider();

      const data = await provider.fetchWalletData(provider.normalizeAddress(VALID_ADDRESS));

      expect(data.nativeBalance).toBe("0");
      expect(data.holdings).toEqual([]);
      expect(data.nativeDecimals).toBe(6);
    });

    it("rethrows non-404 failures so a bad read never persists as data", async () => {
      doMock.mockRejectedValueOnce({ response: { status: 500 } });
      const provider = buildProvider();

      await expect(
        provider.fetchWalletData(provider.normalizeAddress(VALID_ADDRESS))
      ).rejects.toEqual({ response: { status: 500 } });
    });
  });
});
