import type {
  ChainDataProvider,
  ChainProviderRegistry
} from "../application/ports/chain-data-provider.js";
import { UnsupportedChainError } from "../../../shared/domain/errors.js";

export class DefaultChainProviderRegistry implements ChainProviderRegistry {
  private readonly providers: ReadonlyMap<string, ChainDataProvider>;

  public constructor(providers: ChainDataProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.chain.slug, provider]));
  }

  public get(chainSlug: string): ChainDataProvider {
    const provider = this.providers.get(chainSlug.toLowerCase());
    if (!provider) {
      throw new UnsupportedChainError(chainSlug);
    }

    return provider;
  }
}
