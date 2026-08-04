const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPurchases() {
  // Find two parts to drain
  const parts = await prisma.part.findMany({ 
    take: 2, 
    orderBy: { stock: 'desc' }
  });

  if (parts.length < 2) {
    console.log("Not enough parts");
    return;
  }

  const p1 = parts[0];
  const p2 = parts[1];

  console.log(`Draining ${p1.name} (stock: ${p1.stock}, min: ${p1.min_stock}) to Warning (1 item left)`);
  console.log(`Draining ${p2.name} (stock: ${p2.stock}, min: ${p2.min_stock}) to Critical (0 items left)`);

  const tx1qty = p1.stock - 1; // Leaves 1 (Warning)
  const tx2qty = p2.stock;     // Leaves 0 (Critical)

  // Create transactions
  await prisma.$transaction(async (tx) => {
    // Transaction 1 (Warning part)
    if (tx1qty > 0) {
      const transaction1 = await tx.transaction.create({
        data: {
          customerName: "Walk-in Customer",
          totalAmount: p1.price * tx1qty,
          paymentMethod: "CASH",
          status: "COMPLETED",
          items: {
            create: [{
              partId: p1.id,
              name: p1.name,
              quantity: tx1qty,
              price: p1.price
            }]
          }
        }
      });
      // Deduct stock
      await tx.part.update({
        where: { id: p1.id },
        data: { stock: { decrement: tx1qty } }
      });
    }

    // Transaction 2 (Critical part)
    if (tx2qty > 0) {
      const transaction2 = await tx.transaction.create({
        data: {
          customerName: "Walk-in Customer",
          totalAmount: p2.price * tx2qty,
          paymentMethod: "CASH",
          status: "COMPLETED",
          items: {
            create: [{
              partId: p2.id,
              name: p2.name,
              quantity: tx2qty,
              price: p2.price
            }]
          }
        }
      });
      // Deduct stock
      await tx.part.update({
        where: { id: p2.id },
        data: { stock: { decrement: tx2qty } }
      });
    }
  });

  console.log("Purchases added successfully!");
}

addPurchases()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
