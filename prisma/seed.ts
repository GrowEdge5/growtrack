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
}

seed()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
