import { createPublicClient, defineChain, http, isAddress } from "viem";
import { normalize } from "viem/ens";

export class EnsResolver {
  private readonly client;

  public constructor(rpcUrl: string = "https://ethereum-rpc.publicnode.com") {
    const ethereumChain = defineChain({
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } }
    });
    this.client = createPublicClient({
      chain: ethereumChain,
      transport: http(rpcUrl, { retryCount: 2, timeout: 8000 })
    });
  }

  public isEnsName(query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.eth$/i.test(trimmed);
  }

  public async resolve(ensName: string): Promise<string | null> {
    const trimmed = ensName.trim();
    if (!this.isEnsName(trimmed)) {
      return null;
    }

    try {
      const normalized = normalize(trimmed);
      const address = await this.client.getEnsAddress({ name: normalized });
      if (address !== null && isAddress(address)) {
        return address;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const defaultEnsResolver = new EnsResolver();
