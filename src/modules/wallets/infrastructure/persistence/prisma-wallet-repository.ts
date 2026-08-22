import type { PrismaClient } from "@prisma/client";

import type { WalletIdentity } from "../../../chains/domain/chain.js";
import type { WalletRepository } from "../../application/ports/wallet-repository.js";
import type { WalletSnapshot } from "../../domain/wallet-snapshot.js";

export class PrismaWalletRepository implements WalletRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findLatest(identity: WalletIdentity): Promise<WalletSnapshot | null> {
    const record = await this.prisma.walletSnapshot.findFirst({
      where: {
        wallet: {
          chainId: identity.chain.id,
          canonicalAddress: identity.canonicalAddress
        }
      },
      orderBy: { capturedAt: "desc" },
      include: {
        tokenBalances: {
          include: { token: true }
        }
      }
    });

    if (!record) {
      return null;
    }

    return {
      wallet: identity,
      status: record.status === "COMPLETE" ? "complete" : "partial",
      nativeBalance: record.nativeBalance ?? "0",
      nativeSymbol: record.nativeSymbol ?? identity.chain.nativeSymbol,
      provider: record.provider,
      ...(record.blockNumber ? { blockNumber: record.blockNumber } : {}),
      capturedAt: record.capturedAt,
      expiresAt: record.expiresAt,
      holdings: record.tokenBalances.map((balance) => ({
        tokenAddress: balance.token.canonicalAddress,
        symbol: balance.token.symbol,
        name: balance.token.name,
        decimals: balance.token.decimals,
        rawAmount: balance.rawAmount,
        ...(balance.valueUsd !== null ? { valueUsd: balance.valueUsd.toString() } : {})
      })),
      transactions: [],
      positions: [],
      signals: []
    };
  }

  public async save(snapshot: WalletSnapshot): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.chain.upsert({
        where: { id: snapshot.wallet.chain.id },
        update: {
          slug: snapshot.wallet.chain.slug,
          namespace: snapshot.wallet.chain.namespace,
          displayName: snapshot.wallet.chain.slug
        },
        create: {
          id: snapshot.wallet.chain.id,
          slug: snapshot.wallet.chain.slug,
          namespace: snapshot.wallet.chain.namespace,
          displayName: snapshot.wallet.chain.slug
        }
      });
      const wallet = await transaction.wallet.upsert({
        where: {
          chainId_canonicalAddress: {
            chainId: snapshot.wallet.chain.id,
            canonicalAddress: snapshot.wallet.canonicalAddress
          }
        },
        update: { displayAddress: snapshot.wallet.displayAddress },
        create: {
          chainId: snapshot.wallet.chain.id,
          canonicalAddress: snapshot.wallet.canonicalAddress,
          displayAddress: snapshot.wallet.displayAddress
        }
      });

      const created = await transaction.walletSnapshot.create({
        data: {
          walletId: wallet.id,
          status: snapshot.status === "complete" ? "COMPLETE" : "PARTIAL",
          nativeBalance: snapshot.nativeBalance,
          nativeSymbol: snapshot.nativeSymbol,
          provider: snapshot.provider,
          ...(snapshot.blockNumber ? { blockNumber: snapshot.blockNumber } : {}),
          capturedAt: snapshot.capturedAt,
          expiresAt: snapshot.expiresAt
        }
      });

      // Persist token holdings: upsert the shared Token row, then link it to this
      // snapshot via WalletTokenBalance. Sequential awaits on purpose — a Prisma
      // interactive transaction runs on one connection, so parallel queries here
      // are unsafe.
      for (const holding of snapshot.holdings) {
        const token = await transaction.token.upsert({
          where: {
            chainId_canonicalAddress: {
              chainId: snapshot.wallet.chain.id,
              canonicalAddress: holding.tokenAddress
            }
          },
          update: {
            symbol: holding.symbol,
            name: holding.name,
            decimals: holding.decimals
          },
          create: {
            chainId: snapshot.wallet.chain.id,
            canonicalAddress: holding.tokenAddress,
            symbol: holding.symbol,
            name: holding.name,
            decimals: holding.decimals
          }
        });

        await transaction.walletTokenBalance.create({
          data: {
            snapshotId: created.id,
            tokenId: token.id,
            rawAmount: holding.rawAmount,
            ...(holding.valueUsd !== undefined ? { valueUsd: holding.valueUsd } : {})
          }
        });
      }
    });
  }
}
