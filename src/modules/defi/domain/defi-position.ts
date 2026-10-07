export interface DefiTokenBalance {
  symbol: string;
  amount: string;
  valueUsd?: string | undefined;
  icon?: string | undefined;
}

export interface DefiPositionItem {
  id: string;
  name: string;
  category:
    | "Liquidity Pool"
    | "Deposit"
    | "Perpetuals"
    | "Lending"
    | "Prediction Market"
    | "Staking"
    | "Yield & Staking";
  chainSlug?: string | undefined;
  tokens: DefiTokenBalance[];
  rewards?: DefiTokenBalance[] | undefined;
  valueUsd: string;
  details?: Record<string, unknown> | undefined;
  actionUrl?: string | undefined;
}

export interface DefiProtocolGroup {
  protocolId: string;
  name: string;
  category: string;
  chainSlug?: string | undefined;
  logo: string;
  siteUrl: string;
  totalValueUsd: string;
  positions: DefiPositionItem[];
}

export interface WalletDefiOverview {
  address: string;
  totalDefiValueUsd: string;
  protocolsCount: number;
  protocols: DefiProtocolGroup[];
}
