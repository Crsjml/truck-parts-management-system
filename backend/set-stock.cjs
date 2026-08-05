const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const parts = await prisma.part.findMany({ take: 2, orderBy: { stock: 'desc' } });
  if (parts.length < 2) return;
  const p1 = parts[0]; 
  const p2 = parts[1];
  
  await prisma.part.update({ where: { id: p1.id }, data: { stock: p1.min_stock, reservedStock: 0 } });
  await prisma.part.update({ where: { id: p2.id }, data: { stock: 0, reservedStock: 0 } });
  
  console.log('Stock updated successfully! ' + p1.name + ' -> Warning, ' + p2.name + ' -> Critical.');
}
run().finally(() => prisma.$disconnect());
