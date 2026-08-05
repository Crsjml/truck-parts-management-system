import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const txs = await prisma.transaction.findMany({
    include: { items: { include: { part: { include: { category: true } } } } }
  });
  let uncat = 0;
  for (const t of txs) {
    for (const item of t.items) {
      const catName = item.part?.category?.name;
      if (!catName) {
        console.log('Missing category for part:', item.partId, 'part exists?', !!item.part);
        uncat++;
      }
    }
  }
  console.log('Total uncategorized items:', uncat);
}
run().finally(() => prisma.$disconnect());
