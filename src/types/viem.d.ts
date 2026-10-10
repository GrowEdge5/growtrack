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
        http: readonly string[] | string[];
      };
    };
    contracts?: {
      multicall3?: { address: string; blockCreated?: number };
      ensUniversalResolver?: { address: string; blockCreated?: number };
      [key: string]: unknown;
    };
  }

  export interface ViemMulticallContract {
    address: string;
    abi: unknown;
    functionName: string;
    args?: readonly unknown[];
  }

  export type ViemMulticallResult =
    { status: "success"; result: unknown } | { status: "failure"; error: unknown };

  export interface ViemPublicClient {
    getBalance(args: { address: string }): Promise<bigint>;
    getBlockNumber(): Promise<bigint>;
    multicall(args: {
      contracts: readonly ViemMulticallContract[];
      allowFailure?: boolean;
    }): Promise<ViemMulticallResult[]>;
    readContract(args: {
      address: string;
      abi: unknown;
      functionName: string;
      args?: readonly unknown[];
    }): Promise<unknown>;
    getEnsAddress(args: { name: string }): Promise<string | null>;
  }

  export interface ViemTransportOptions {
    timeout?: number;
    retryCount?: number;
  }

  export function createPublicClient(options: {
    chain?: unknown;
    transport: unknown;
  }): ViemPublicClient;

  export function defineChain(definition: ViemChainDefinition): ViemChainDefinition;

  export function getAddress(address: string): string;

  export function http(url: string, options?: ViemTransportOptions): unknown;

  export function fallback(transports: unknown[], options?: unknown): unknown;

  export function isAddress(address: string): boolean;
}

declare module "viem/chains" {
  import type { ViemChainDefinition } from "viem";
  export const mainnet: ViemChainDefinition;
}
