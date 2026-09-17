import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  await prisma.chain.upsert({
    where: { id: 1 },
    update: { slug: "ethereum", displayName: "Ethereum", namespace: "eip155", enabled: true },
    create: {
      id: 1,
      slug: "ethereum",
      displayName: "Ethereum",
      namespace: "eip155"
    }
  });

  // Growtrack-internal id 2 for Algorand mainnet (not an EIP-155 chainId).
  await prisma.chain.upsert({
    where: { id: 2 },
    update: { slug: "algorand", displayName: "Algorand", namespace: "algorand", enabled: true },
    create: {
      id: 2,
      slug: "algorand",
      displayName: "Algorand",
      namespace: "algorand"
    }
  });

  // Ids 3 and 4 are Solana and Bitcoin mainnet (also not EIP-155 chainIds). They
  // must stay distinct from every configured EVM_CHAIN_ID, and they must match
  // SOLANA_MAINNET_CHAIN_ID / BITCOIN_MAINNET_CHAIN_ID in
  // src/modules/chains/infrastructure/chain-ids.ts — the DeFiLlama price map is
  // keyed by these ids, so a mismatch silently prices the chain at nothing.
  await prisma.chain.upsert({
    where: { id: 3 },
    update: { slug: "solana", displayName: "Solana", namespace: "solana", enabled: true },
    create: {
      id: 3,
      slug: "solana",
      displayName: "Solana",
      namespace: "solana"
    }
  });

  await prisma.chain.upsert({
    where: { id: 4 },
    update: { slug: "bitcoin", displayName: "Bitcoin", namespace: "bitcoin", enabled: true },
    create: {
      id: 4,
      slug: "bitcoin",
      displayName: "Bitcoin",
      namespace: "bitcoin"
    }
  });
}

seed()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
