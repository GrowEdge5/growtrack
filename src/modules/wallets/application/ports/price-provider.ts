// Port for an external USD price source (adapter: CoinGecko).
//
// The application asks for prices; the adapter is responsible for mapping the
// chainId to the upstream source's chain/platform identifiers. Growtrack never
// signs or moves funds — this is a read-only market-data lookup.

export interface PriceRequest {
  chainId: number;
  nativeSymbol: string;
  // Lowercase ERC-20 contract addresses to price. May be empty.
  tokenAddresses: string[];
}

// USD prices per ONE WHOLE unit of an asset (not base units). Any asset the
// upstream source cannot price is simply absent from the result — it is never
// zero-filled, estimated, or fabricated.
export interface PriceQuote {
  nativeUsd?: number;
  // Keyed by lowercase token contract address.
  tokenUsd: Record<string, number>;
}

export interface PriceProvider {
  getUsdPrices(request: PriceRequest): Promise<PriceQuote>;
}
