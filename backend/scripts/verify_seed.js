import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Verifying seed data constraints...");
  
  // 1. Archetype Checks
  const customers = await prisma.customer.findMany({
    include: { addresses: false }
  });
  
  const txs = await prisma.transaction.findMany({
    include: { items: true }
  });

  const txsByUserId = {};
  for (const tx of txs) {
    if (tx.userId) {
      if (!txsByUserId[tx.userId]) txsByUserId[tx.userId] = [];
      txsByUserId[tx.userId].push(tx);
    }
  }

  let pureOnlineCount = 0;
  let pureInStoreCount = 0;
  let mergedCount = 0;

  for (const [userId, userTxs] of Object.entries(txsByUserId)) {
    const onlineTxs = userTxs.filter(t => t.stripeSessionId !== null);
    const storeTxs = userTxs.filter(t => t.stripeSessionId === null);
    
    if (onlineTxs.length > 0 && storeTxs.length === 0) pureOnlineCount++;
    if (onlineTxs.length === 0 && storeTxs.length > 0) pureInStoreCount++;
    if (onlineTxs.length > 0 && storeTxs.length > 0) mergedCount++;
  }

  if (pureOnlineCount === 0) throw new Error("Verification failed: No pure online customers found.");
  if (pureInStoreCount === 0) throw new Error("Verification failed: No pure in-store customers found.");
  if (mergedCount === 0) throw new Error("Verification failed: No merged customers found.");

  // 4. Anonymous walk-ins
  const anonTxs = txs.filter(t => t.userId === null);
  if (anonTxs.length === 0) throw new Error("Verification failed: No anonymous walk-in transactions found.");

  // Ensure anonymous txs don't have a matching Customer by some accident (though we know they don't by userId)
  // Actually, userId = null is the definition of anonymous in this context.

  // 5. 24-month spread
  const monthsMap = {};
  const now = new Date();
  
  // Initialize the last 24 months
  for(let i=0; i<24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsMap[key] = 0;
  }

  for (const tx of txs) {
    const date = new Date(tx.transactionDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthsMap[key] !== undefined) {
      monthsMap[key]++;
    }
  }

  const emptyMonths = Object.keys(monthsMap).filter(k => monthsMap[k] === 0);
  if (emptyMonths.length > 0) throw new Error(`Verification failed: Empty months found: ${emptyMonths.join(', ')}`);

  // 6. Peak / slow periods
  let totalTxs = 0;
  let peakTxs = 0;
  let peakMonthsCount = 0;
  
  const values = Object.values(monthsMap);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  let hasSlowMonth = false;
  for (const [key, count] of Object.entries(monthsMap)) {
    const [, month] = key.split('-');
    if (month === '11' || month === '12') {
      peakTxs += count;
      peakMonthsCount++;
    }
    if (count < avg * 0.6) {
      hasSlowMonth = true;
    }
  }
  
  const peakAvg = peakMonthsCount > 0 ? peakTxs / peakMonthsCount : 0;
  if (peakAvg <= avg * 1.5) {
    throw new Error(`Verification failed: Peak months (Nov/Dec) are not materially higher than average. Peak avg: ${peakAvg}, Overall avg: ${avg}`);
  }
  
  if (!hasSlowMonth) {
    throw new Error(`Verification failed: No materially slow month found.`);
  }

  // 7. Weighted parts
  const partCounts = {};
  for (const tx of txs) {
    for (const item of tx.items) {
      partCounts[item.partId] = (partCounts[item.partId] || 0) + 1;
    }
  }

  // Also include parts with 0 transactions
  const parts = await prisma.part.findMany();
  for (const part of parts) {
    if (partCounts[part.id] === undefined) partCounts[part.id] = 0;
  }

  const bestSellersCount = Object.values(partCounts).filter(c => c > 15).length;
  const slowMoversCount = Object.values(partCounts).filter(c => c <= 1).length;

  if (bestSellersCount < 3) throw new Error(`Verification failed: Expected >= 3 best sellers (>15 sales), found ${bestSellersCount}`);
  if (slowMoversCount < 5) throw new Error(`Verification failed: Expected >= 5 slow movers (<=1 sales), found ${slowMoversCount}`);

  // 8. Online transactions payment method
  const onlineTxs = txs.filter(t => t.stripeSessionId !== null);
  const invalidOnlinePayments = onlineTxs.filter(t => !['CARD', 'GCASH'].includes(t.paymentMethod));
  if (invalidOnlinePayments.length > 0) {
    throw new Error(`Verification failed: Online transactions must have CARD or GCASH payment method.`);
  }
  const invalidOnlineInvoices = onlineTxs.filter(t => !t.invoiceNumber.startsWith('WEB-'));
  if (invalidOnlineInvoices.length > 0) {
    throw new Error(`Verification failed: Online transactions must have WEB- invoice prefix.`);
  }
  const storeTxs = txs.filter(t => t.stripeSessionId === null);
  const invalidStoreInvoices = storeTxs.filter(t => !t.invoiceNumber.startsWith('INV-'));
  if (invalidStoreInvoices.length > 0) {
    throw new Error(`Verification failed: Store transactions must have INV- invoice prefix.`);
  }

  console.log("✅ All invariants verified successfully.");
}

main()
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
