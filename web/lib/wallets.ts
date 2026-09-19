// Real wallet connections.
//
// Only wallets that can actually sign an Algorand transaction are wired here,
// because signing is the whole point: Growtrack's paid tier settles in USDC on
// Algorand rails, so a wallet that cannot sign an Algorand atomic group cannot
// complete the flow. Wallets we have no integration for are listed as such rather
// than offered and then failing at the first click.
//
// Every SDK is imported dynamically inside the connector function. That keeps
// WalletConnect (which touches `window` at module scope) out of the server render
// and out of the initial bundle — a visitor who never connects pays nothing for it.

import { explorerUrl } from "./address";

export type WalletId = "pera" | "lute" | "defly";

export interface WalletOption {
  id: WalletId | "trust" | "ledger";
  name: string;
  image: string;
  subtext: string;
  status: "supported" | "unsupported";
  unsupportedReason?: string;
}

/**
 * The wallet list shown in the connect modal. The Algorand-native entries are real
 * integrations; the other two have no Algorand signing path wired here, so they are
 * presented honestly as unsupported instead of being clickable dead ends.
 */
export const WALLET_OPTIONS: readonly WalletOption[] = [
  {
    id: "pera",
    name: "Pera Wallet",
    image: "/assets/wallets/para.png",
    subtext: "Algorand mobile & web wallet",
    status: "supported"
  },
  {
    id: "lute",
    name: "Lute Wallet",
    image: "/assets/wallets/lute.png",
    subtext: "Algorand browser-extension wallet",
    status: "supported"
  },
  {
    id: "defly",
    name: "Defly Wallet",
    image: "/assets/wallets/defly.png",
    subtext: "Algorand DeFi wallet",
    status: "supported"
  },
  {
    id: "trust",
    name: "Trust Wallet",
    image: "/assets/wallets/trust.jpg",
    subtext: "Multichain mobile wallet",
    status: "unsupported",
    unsupportedReason:
      "Trust Wallet has no Algorand signing path in this app yet, so it cannot complete an x402 payment."
  },
  {
    id: "ledger",
    name: "Ledger",
    image: "/assets/wallets/ledger.webp",
    subtext: "Hardware cold storage",
    status: "unsupported",
    unsupportedReason:
      "Hardware-wallet signing needs a dedicated bridge that is not built yet. Use a software Algorand wallet to pay."
  }
];

export function walletOptionById(id: string): WalletOption | undefined {
  return WALLET_OPTIONS.find((option) => option.id === id);
}

export function isSupportedWalletId(id: string): id is WalletId {
  return WALLET_OPTIONS.some((option) => option.id === id && option.status === "supported");
}

/** The network a connected wallet signs on, taken from the API's payment params. */
export interface NetworkContext {
  /** Algorand genesis id, e.g. "mainnet-v1.0". */
  genesisId: string;
}

export class WalletConnectionError extends Error {
  public constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "WalletConnectionError";
  }
}

const MAINNET_CHAIN_ID = 416001;
const TESTNET_CHAIN_ID = 416002;

function chainIdFor(genesisId: string): 416001 | 416002 {
  return genesisId.toLowerCase().startsWith("testnet") ? TESTNET_CHAIN_ID : MAINNET_CHAIN_ID;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

type PeraConnect = import("@perawallet/connect").PeraWalletConnect;
type DeflyConnect = import("@blockshake/defly-connect").DeflyWalletConnect;

// WalletConnect-backed SDKs hold the live session on their instance, so one is kept
// per wallet and reused. Rebuilding it — or building a second one to disconnect —
// would operate on an object that never had a session.
let peraClient: { instance: PeraConnect; chainId: number } | undefined;
let deflyClient: DeflyConnect | undefined;

async function getPera(network: NetworkContext): Promise<PeraConnect> {
  const chainId = chainIdFor(network.genesisId);
  if (peraClient !== undefined && peraClient.chainId === chainId) {
    return peraClient.instance;
  }
  const { PeraWalletConnect } = await import("@perawallet/connect");
  const instance = new PeraWalletConnect({ chainId });
  peraClient = { instance, chainId };
  return instance;
}

async function getDefly(): Promise<DeflyConnect> {
  if (deflyClient !== undefined) {
    return deflyClient;
  }
  const { DeflyWalletConnect } = await import("@blockshake/defly-connect");
  deflyClient = new DeflyWalletConnect();
  return deflyClient;
}

interface Connector {
  connect(network: NetworkContext): Promise<string[]>;
  /** Re-attach to a previous session without user interaction; null when there is none. */
  reconnect(network: NetworkContext): Promise<string[] | null>;
  disconnect(): Promise<void>;
  /**
   * Signs exactly the transactions handed over. A wallet is never asked to sign a
   * transaction it does not own — the x402 group also carries the facilitator's
   * sponsored fee-payer transaction, which the facilitator signs itself, so the
   * client passes only its own payment transaction and reassembles the group
   * afterwards. Returns one entry per input: base64 signed blob, or null if declined.
   */
  sign(transactions: readonly string[], signer: string, network: NetworkContext): Promise<(string | null)[]>;
}

function decodeGroup(
  algosdk: typeof import("algosdk").default,
  transactions: readonly string[]
): import("algosdk").Transaction[] {
  return transactions.map((txn) => algosdk.decodeUnsignedTransaction(base64ToBytes(txn)));
}

const CONNECTORS: Readonly<Record<WalletId, Connector>> = {
  pera: {
    async connect(network) {
      const pera = await getPera(network);
      return pera.connect();
    },
    async reconnect(network) {
      const pera = await getPera(network);
      try {
        return await pera.reconnectSession();
      } catch {
        return null;
      }
    },
    async disconnect() {
      await peraClient?.instance.disconnect().catch(() => undefined);
      peraClient = undefined;
    },
    async sign(transactions, signer, network) {
      const algosdk = (await import("algosdk")).default;
      const pera = await getPera(network);
      const txns = decodeGroup(algosdk, transactions);
      const signed = await pera.signTransaction([txns.map((txn) => ({ txn }))], signer);
      return signed.map((bytes: Uint8Array) => bytesToBase64(bytes));
    }
  },
  defly: {
    async connect() {
      return (await getDefly()).connect();
    },
    async reconnect() {
      try {
        return await (await getDefly()).reconnectSession();
      } catch {
        return null;
      }
    },
    async disconnect() {
      await deflyClient?.disconnect().catch(() => undefined);
      deflyClient = undefined;
    },
    async sign(transactions, signer) {
      const algosdk = (await import("algosdk")).default;
      const defly = await getDefly();
      const txns = decodeGroup(algosdk, transactions);
      const signed = await defly.signTransaction([txns.map((txn) => ({ txn }))], signer);
      return signed.map((bytes: Uint8Array) => bytesToBase64(bytes));
    }
  },
  lute: {
    async connect(network) {
      const LuteConnect = (await import("@galaxypay/lute-connect")).default;
      return new LuteConnect("Growtrack").connect(network.genesisId);
    },
    async reconnect() {
      // Lute is an extension that signs per request and keeps no session across page
      // loads, so there is nothing to re-attach to.
      return null;
    },
    async disconnect() {
      return undefined;
    },
    async sign(transactions) {
      const LuteConnect = (await import("@galaxypay/lute-connect")).default;
      const lute = new LuteConnect("Growtrack");
      // Lute's API is flat (no groups) and infers the signer from each transaction's
      // sender; a null entry means it declined that transaction.
      const signed = await lute.signTxns(transactions.map((txn) => ({ txn })));
      return signed.map((bytes) => (bytes == null ? null : bytesToBase64(bytes)));
    }
  }
};

export interface WalletSession {
  id: WalletId;
  name: string;
  address: string;
  /** Explorer link for the connected address. */
  explorerUrl: string | null;
}

export async function connectWallet(id: WalletId, network: NetworkContext): Promise<WalletSession> {
  const option = walletOptionById(id);
  if (option === undefined) {
    throw new WalletConnectionError(`Unknown wallet '${id}'`, "UNKNOWN_WALLET");
  }

  let addresses: string[];
  try {
    addresses = await CONNECTORS[id].connect(network);
  } catch (error) {
    throw toConnectionError(error, option.name);
  }

  const address = addresses[0];
  if (address === undefined || address.length === 0) {
    throw new WalletConnectionError(
      `${option.name} returned no account. Approve the connection request in your wallet and try again.`,
      "NO_ACCOUNT"
    );
  }

  return {
    id,
    name: option.name,
    address,
    explorerUrl: explorerUrl("algorand", address)
  };
}

export async function reconnectWallet(
  id: WalletId,
  network: NetworkContext
): Promise<WalletSession | null> {
  const option = walletOptionById(id);
  if (option === undefined) {
    return null;
  }

  const addresses = await CONNECTORS[id]
    .reconnect(network)
    .catch(() => null);
  const address = addresses?.[0];
  if (address === undefined || address.length === 0) {
    return null;
  }

  return {
    id,
    name: option.name,
    address,
    explorerUrl: explorerUrl("algorand", address)
  };
}

export async function disconnectWallet(id: WalletId): Promise<void> {
  await CONNECTORS[id].disconnect().catch(() => undefined);
}

/** Signs the given base64-encoded unsigned transactions with the connected wallet. */
export async function signTransactions(
  id: WalletId,
  transactions: readonly string[],
  signer: string,
  network: NetworkContext
): Promise<(string | null)[]> {
  try {
    return await CONNECTORS[id].sign(transactions, signer, network);
  } catch (error) {
    throw toConnectionError(error, walletOptionById(id)?.name ?? id);
  }
}

/**
 * Wallet SDKs reject for many reasons (user cancelled, session expired, network
 * mismatch). Cancellation is the common one and must not read as a system failure,
 * so it is detected and surfaced in the user's terms.
 */
function toConnectionError(error: unknown, walletName: string): WalletConnectionError {
  const message = error instanceof Error ? error.message : String(error);
  if (/cancel|reject|declined|closed|dismiss/i.test(message)) {
    return new WalletConnectionError(`${walletName} request was cancelled.`, "USER_CANCELLED");
  }
  return new WalletConnectionError(`${walletName}: ${message}`, "WALLET_ERROR");
}
