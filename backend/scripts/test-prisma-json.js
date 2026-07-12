import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFilter() {
  try {
    const parts = await prisma.part.findMany({
      take: 2,
      select: { name: true, compatibility: true, compatibleWith: true }
    });
    console.log("Filtered parts with Scania:");
    console.log(JSON.stringify(parts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testFilter();
