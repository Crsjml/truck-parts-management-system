import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompatibility() {
  try {
    const parts = await prisma.part.findMany({
      take: 10,
      select: { name: true, compatibleWith: true }
    });
    console.log("Sample compatibleWith structures:");
    console.log(JSON.stringify(parts, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompatibility();
