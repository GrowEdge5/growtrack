import { createHash } from "node:crypto";

import { Queue } from "bullmq";
import type { Redis } from "ioredis";

import type { WalletRefreshJob } from "../../jobs/contracts/wallet-refresh-job.js";
import type {
  EnqueuedRefresh,
  WalletRefreshQueue
} from "../../modules/wallets/application/ports/wallet-refresh-queue.js";
import { walletRefreshQueueName } from "./queue-names.js";

export class BullMqWalletRefreshQueue implements WalletRefreshQueue {
  public readonly queue: Queue<WalletRefreshJob>;

  public constructor(connection: Redis) {
    this.queue = new Queue<WalletRefreshJob>(walletRefreshQueueName, { connection });
  }

  public async enqueue(job: WalletRefreshJob): Promise<EnqueuedRefresh> {
    const refreshWindow = job.requestedAt.slice(0, 16);
    const jobId = createHash("sha256")
      .update(`${job.chain}:${job.address}:${refreshWindow}`)
      .digest("hex");

    await this.queue.add("refresh-wallet", job, {
      jobId,
      attempts: 4,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 }
    });
    return { jobId };
  }
}
