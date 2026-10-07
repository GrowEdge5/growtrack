import type {
  ChainDataProvider,
  ChainProviderRegistry
} from "../application/ports/chain-data-provider.js";
import { UnsupportedChainError } from "../../../shared/domain/errors.js";

const CHAIN_ALIASES: Readonly<Record<string, string>> = {
  hood: "robinhood",
  era: "zksync",
  eth: "ethereum",
  algo: "algorand",
  sol: "solana",
  btc: "bitcoin",
  matic: "polygon",
  bnb: "bsc",
  cro: "cronos"
};

export class DefaultChainProviderRegistry implements ChainProviderRegistry {
  private readonly providers: ReadonlyMap<string, ChainDataProvider>;

  public constructor(providers: ChainDataProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.chain.slug, provider]));
  }

  public get(chainSlug: string): ChainDataProvider {
    const normalized = chainSlug.toLowerCase();
    const resolved = CHAIN_ALIASES[normalized] ?? normalized;
    const provider = this.providers.get(resolved);
    if (!provider) {
      throw new UnsupportedChainError(chainSlug);
    }

    return provider;
  }

  public list(): readonly ChainDataProvider[] {
    return [...this.providers.values()];
  }
}
