const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  // We already modified 2, let's take 5 more that currently have healthy stock
  const parts = await prisma.part.findMany({ 
    where: { stock: { gt: 10 } },
    take: 5, 
    orderBy: { price: 'asc' } 
  });
  
  if (parts.length < 5) return;
  
  // Mix of critical and warning
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const isCritical = i % 2 === 0; // Even index = critical, odd = warning
    
    const newStock = isCritical ? 0 : p.min_stock;
    
    await prisma.part.update({ 
      where: { id: p.id }, 
      data: { stock: newStock, reservedStock: 0 } 
    });
    
    console.log(`Updated ${p.name} -> ${isCritical ? 'Critical (0)' : 'Warning (' + p.min_stock + ')'}`);
  }
}
run().finally(() => prisma.$disconnect());
