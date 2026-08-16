declare module "viem" {
  export interface ViemChainDefinition {
    id: number;
    name: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: {
      default: {
        http: string[];
      };
    };
  }

  export interface ViemPublicClient {
    getBalance(args: { address: string }): Promise<bigint>;
    getBlockNumber(): Promise<bigint>;
  }

  export interface ViemTransportOptions {
    timeout?: number;
    retryCount?: number;
  }

  export function createPublicClient(options: {
    chain: ViemChainDefinition;
    transport: unknown;
  }): ViemPublicClient;

  export function defineChain(definition: ViemChainDefinition): ViemChainDefinition;

  export function getAddress(address: string): string;

  export function http(url: string, options?: ViemTransportOptions): unknown;

  export function isAddress(address: string): boolean;
}
