import type { WalletRefreshJob } from "../../../../jobs/contracts/wallet-refresh-job.js";

export interface EnqueuedRefresh {
  jobId: string;
}

export interface WalletRefreshQueue {
  enqueue(job: WalletRefreshJob): Promise<EnqueuedRefresh>;
}
