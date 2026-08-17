-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('PENDING', 'COMPLETE', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SignalSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Chain" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "canonicalAddress" TEXT NOT NULL,
    "displayAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletSnapshot" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'PENDING',
    "nativeBalance" TEXT,
    "nativeSymbol" TEXT,
    "totalValueUsd" DECIMAL(36,8),
    "provider" TEXT NOT NULL,
    "blockNumber" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "canonicalAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTokenBalance" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "rawAmount" TEXT NOT NULL,
    "valueUsd" DECIMAL(36,8),

    CONSTRAINT "WalletTokenBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT,
    "value" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolPosition" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "valueUsd" DECIMAL(36,8),
    "data" JSONB NOT NULL,

    CONSTRAINT "ProtocolPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceSignal" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "SignalSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" JSONB,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IntelligenceSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chain_slug_key" ON "Chain"("slug");

-- CreateIndex
CREATE INDEX "Wallet_canonicalAddress_idx" ON "Wallet"("canonicalAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_chainId_canonicalAddress_key" ON "Wallet"("chainId", "canonicalAddress");

-- CreateIndex
CREATE INDEX "WalletSnapshot_walletId_capturedAt_idx" ON "WalletSnapshot"("walletId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "WalletSnapshot_expiresAt_idx" ON "WalletSnapshot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Token_chainId_canonicalAddress_key" ON "Token"("chainId", "canonicalAddress");

-- CreateIndex
CREATE INDEX "WalletTokenBalance_tokenId_idx" ON "WalletTokenBalance"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTokenBalance_snapshotId_tokenId_key" ON "WalletTokenBalance"("snapshotId", "tokenId");

-- CreateIndex
CREATE INDEX "Transaction_snapshotId_occurredAt_idx" ON "Transaction"("snapshotId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_chainId_txHash_key" ON "Transaction"("chainId", "txHash");

-- CreateIndex
CREATE INDEX "ProtocolPosition_snapshotId_idx" ON "ProtocolPosition"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolPosition_snapshotId_protocol_externalId_key" ON "ProtocolPosition"("snapshotId", "protocol", "externalId");

-- CreateIndex
CREATE INDEX "IntelligenceSignal_snapshotId_severity_idx" ON "IntelligenceSignal"("snapshotId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "SyncRun_jobId_key" ON "SyncRun"("jobId");

-- CreateIndex
CREATE INDEX "SyncRun_walletId_queuedAt_idx" ON "SyncRun"("walletId", "queuedAt" DESC);

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletSnapshot" ADD CONSTRAINT "WalletSnapshot_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTokenBalance" ADD CONSTRAINT "WalletTokenBalance_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WalletSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTokenBalance" ADD CONSTRAINT "WalletTokenBalance_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WalletSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolPosition" ADD CONSTRAINT "ProtocolPosition_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WalletSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceSignal" ADD CONSTRAINT "IntelligenceSignal_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WalletSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
