import type { WalletIdentity } from "../../../chains/domain/chain.js";
import type { WalletSnapshot } from "../../domain/wallet-snapshot.js";

export interface WalletCache {
  get(identity: WalletIdentity): Promise<WalletSnapshot | null>;
  set(snapshot: WalletSnapshot): Promise<void>;
}
