export interface Chain {
  id: number;
  slug: string;
  namespace: string;
  nativeSymbol: string;
}

export interface WalletIdentity {
  chain: Chain;
  canonicalAddress: string;
  displayAddress: string;
}
