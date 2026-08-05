const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function addPurchases() {
  const parts = await prisma.part.findMany({ take: 2, orderBy: { stock: 'desc' } });
  if (parts.length < 2) return;
  const p1 = parts[0]; const p2 = parts[1];
  const tx1qty = p1.stock - 1; 
  const tx2qty = p2.stock;
  
  await prisma.$transaction(async (tx) => {
    if (tx1qty > 0) {
      await tx.transaction.create({
        data: {
          customerName: 'Walk-in Customer',
          totalAmount: p1.price * tx1qty,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          invoiceNumber: 'INV-' + Date.now() + '-1',
          items: { create: [{ partId: p1.id, name: p1.name, quantity: tx1qty, price: p1.price }] }
        }
      });
      await tx.part.update({ where: { id: p1.id }, data: { stock: { decrement: tx1qty } } });
    }
    if (tx2qty > 0) {
      await tx.transaction.create({
        data: {
          customerName: 'Walk-in Customer',
          totalAmount: p2.price * tx2qty,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          invoiceNumber: 'INV-' + Date.now() + '-2',
          items: { create: [{ partId: p2.id, name: p2.name, quantity: tx2qty, price: p2.price }] }
        }
      });
      await tx.part.update({ where: { id: p2.id }, data: { stock: { decrement: tx2qty } } });
    }
  });
  console.log('Purchases added successfully!');
}
addPurchases().finally(() => prisma.$disconnect());
