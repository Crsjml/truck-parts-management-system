/**
 * Backfill seed-era rows onto the current record formats — no wipe, no reseed.
 *
 *   node scripts/backfill-legacy-formats.js           # dry run: report only
 *   node scripts/backfill-legacy-formats.js --apply   # write changes
 *
 * Only rows still in a legacy (seed) format are rewritten, so records created
 * by the live app are left alone — except SKUs: any part whose SKU is not yet
 * CAT-PRT-##### is renumbered (incl. hand-entered ones), and line-item
 * snapshots follow. Every step is idempotent: a second run finds
 * nothing to change. Derived invariants (reservedStock, review verification)
 * are recomputed for all rows using the same rules the app applies.
 */
import { PrismaClient } from '@prisma/client';
import {
  LEGACY, STORE_PICKUP, PO_STATUSES,
  skuPrefixFor, formatSku, formatDocNumber, dateKey,
  createSequencer, parseSku, parseDocNumber,
  mapLegacyPoStatus, roundMoney, roundUpTender, mpnFromSeed
} from '../src/utils/recordFormats.js';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const BATCH = 200;
// Return only the id from updates, so writes never reference columns this script
// doesn't touch (e.g. a column in a newer generated client not yet migrated).
const ID_ONLY = Object.freeze({ id: true });
const DAY_MS = 24 * 60 * 60 * 1000;
const NET_TERMS_DAYS = 30;
const CONFIRM_LAG_DAYS = 2;
const DELIVERY_LAG_DAYS = 7;
const OPEN = ['ORDER_PLACED', 'READY_FOR_PICKUP'];
const CHEQUE_BANKS = ['BDO', 'BPI', 'Metrobank', 'Landbank', 'Security Bank'];

const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);
const isLegacyInStore = (inv) => /^INV-\d{13}-\d{3}$/.test(inv);
const report = [];
const NOW = new Date();

/**
 * Seed picked dates up to the END of the current month, so some sales sit in
 * the future. Compress them into the elapsed part of the month, keeping order.
 */
function clampFutureDate(date) {
  if (date <= NOW) return null;
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const from = monthStart > NOW ? new Date(NOW.getFullYear(), NOW.getMonth(), 1) : monthStart;
  const ratio = (date - monthStart) / (monthEnd - monthStart);
  return new Date(from.getTime() + ratio * (NOW - from));
}

function note(step, count, sample) {
  report.push({ step, rows: count, sample: sample ? JSON.stringify(sample).slice(0, 110) : '' });
}

async function runBatched(ops) {
  if (!APPLY) return;
  for (let i = 0; i < ops.length; i += BATCH) {
    await prisma.$transaction(ops.slice(i, i + BATCH));
  }
}

// ── 1. Transactions: status, channel, pickup, payment details ───────────────
async function fixTransactionFields() {
  const txs = await prisma.transaction.findMany({
    select: {
      id: true, invoiceNumber: true, status: true, salesChannel: true, stripeSessionId: true,
      paymentMethod: true, total: true, amountTendered: true, changeGiven: true,
      chequeNumber: true, gcashReference: true, pickupLocation: true, transactionDate: true
    }
  });
  const ops = [];
  const counts = { channel: 0, status: 0, pickup: 0, payment: 0, future: 0 };
  for (const tx of txs) {
    const data = transactionPatch(tx, counts);
    if (Object.keys(data).length) ops.push(prisma.transaction.update({ select: ID_ONLY, where: { id: tx.id }, data }));
  }
  note('tx.salesChannel → WEB (online orders tagged POS)', counts.channel);
  note('tx.status → COMPLETED (seeded walk-ins left pending)', counts.status);
  note('tx.pickupLocation/Hours (seeded online orders)', counts.pickup);
  note('tx payment details (cash change / cheque / gcash ref)', counts.payment);
  note('tx.transactionDate pulled back from the future', counts.future);
  await runBatched(ops);
}

function transactionPatch(tx, counts) {
  const data = {};
  const isOnline = tx.stripeSessionId !== null || tx.invoiceNumber.startsWith('WEB-');
  if (isOnline && tx.salesChannel !== 'WEB') { data.salesChannel = 'WEB'; counts.channel++; }

  if (!LEGACY.invoice.test(tx.invoiceNumber)) return data; // below: seed rows only

  const pastDate = clampFutureDate(tx.transactionDate);
  if (pastDate) { data.transactionDate = pastDate; counts.future++; }
  if (isLegacyInStore(tx.invoiceNumber) && OPEN.includes(tx.status)) { data.status = 'COMPLETED'; counts.status++; }
  if (isOnline && !tx.pickupLocation) {
    data.pickupLocation = STORE_PICKUP.location;
    data.pickupHours = STORE_PICKUP.hours;
    counts.pickup++;
  }
  const pay = paymentPatch(tx);
  if (pay) { Object.assign(data, pay); counts.payment++; }
  return data;
}

function paymentPatch(tx) {
  const seed = tx.id.replace(/-/g, '');
  if (tx.paymentMethod === 'CASH' && tx.changeGiven === 0 && tx.amountTendered === tx.total) {
    const tendered = roundUpTender(tx.total);
    return { amountTendered: tendered, changeGiven: roundMoney(tendered - tx.total) };
  }
  if (tx.paymentMethod === 'CHEQUE' && !tx.chequeNumber) {
    return {
      chequeNumber: String(parseInt(seed.slice(0, 8), 16) % 100000000).padStart(8, '0'),
      chequeBank: CHEQUE_BANKS[parseInt(seed.slice(8, 10), 16) % CHEQUE_BANKS.length],
      chequeDate: tx.transactionDate
    };
  }
  if (tx.paymentMethod === 'GCASH' && !tx.gcashReference) {
    return { gcashReference: String(BigInt(`0x${seed.slice(0, 12)}`) % 10n ** 13n).padStart(13, '0') };
  }
  return null;
}

// ── 2. Reserved stock = qty on open orders (same rule as checkout) ──────────
async function fixReservedStock() {
  const openTxs = await prisma.transaction.findMany({
    where: { status: { in: OPEN } },
    select: { invoiceNumber: true, items: { select: { partId: true, quantity: true } } }
  });
  const reserved = new Map();
  for (const tx of openTxs) {
    if (isLegacyInStore(tx.invoiceNumber)) continue; // being completed in step 1
    for (const it of tx.items) reserved.set(it.partId, (reserved.get(it.partId) || 0) + it.quantity);
  }
  const parts = await prisma.part.findMany({ select: { id: true, sku: true, stock: true, reservedStock: true } });
  const ops = [];
  let raisedStock = 0;
  const sample = [];
  for (const p of parts) {
    const want = reserved.get(p.id) || 0;
    if (p.reservedStock === want && p.stock >= want) continue;
    const data = { reservedStock: want };
    if (p.stock < want) { data.stock = want; raisedStock++; }
    if (sample.length < 2) sample.push({ sku: p.sku, from: p.reservedStock, to: want });
    ops.push(prisma.part.update({ select: ID_ONLY, where: { id: p.id }, data }));
  }
  note('part.reservedStock recomputed from open orders', ops.length, sample);
  note('  …of which stock raised to cover reservations', raisedStock);
  await runBatched(ops);
}

// ── 3. Parts: SKU, OEM, oemNumbers ──────────────────────────────────────────
async function fixParts() {
  const parts = await prisma.part.findMany({
    select: { id: true, sku: true, oem: true, oemNumbers: true, createdAt: true, category: { select: { name: true } } },
    orderBy: { createdAt: 'asc' }
  });
  const nextSku = createSequencer(parts.map(p => p.sku), parseSku);
  const ops = [];
  const renamed = [];
  let oemFixed = 0;
  for (const p of parts) {
    const data = {};
    if (!parseSku(p.sku)) { // legacy seed SKUs and hand-entered off-spec ones
      const prefix = skuPrefixFor(p.category.name);
      data.sku = formatSku(prefix, nextSku(prefix));
      renamed.push({ from: p.sku, to: data.sku });
    }
    const oem = LEGACY.oem.test(p.oem || '') ? mpnFromSeed(p.id) : p.oem;
    if (oem !== p.oem) data.oem = oem;
    if (oem && p.oemNumbers.length === 0) data.oemNumbers = [oem];
    if (data.oem || data.oemNumbers) oemFixed++;
    if (Object.keys(data).length) ops.push(prisma.part.update({ select: ID_ONLY, where: { id: p.id }, data }));
  }
  note('part.sku → CAT-PRT-#####', renamed.length, renamed.slice(0, 2));
  note('part.oem placeholder → MPN, oemNumbers filled', oemFixed);
  await runBatched(ops);
}

// ── 4. Line-item SKU snapshots ──────────────────────────────────────────────
async function fixLineItemSkus() {
  const stale = (sku) => !parseSku(sku); // empty, legacy, or pre-rename hand-entered
  const parts = await prisma.part.findMany({ select: { id: true, sku: true } });
  const skuOf = new Map(parts.map(p => [p.id, p.sku]));

  const txItems = (await prisma.transactionItem.findMany({ select: { id: true, partId: true, sku: true } }))
    .filter(i => stale(i.sku));
  const poItems = (await prisma.purchaseOrderItem.findMany({ select: { id: true, partId: true, sku: true } }))
    .filter(i => stale(i.sku));

  // In a dry run parts still carry legacy SKUs, so count only; apply after step 3.
  note('transactionItem.sku snapshot filled', txItems.length);
  note('purchaseOrderItem.sku filled', poItems.length);
  await runBatched([
    ...txItems.map(i => prisma.transactionItem.update({ select: ID_ONLY, where: { id: i.id }, data: { sku: skuOf.get(i.partId) || '' } })),
    ...poItems.map(i => prisma.purchaseOrderItem.update({ select: ID_ONLY, where: { id: i.id }, data: { sku: skuOf.get(i.partId) || '' } }))
  ]);
}

// ── 5. Purchase orders: status, dates, payment, money, inspection ───────────
async function fixPurchaseOrders() {
  const pos = await prisma.purchaseOrder.findMany({ include: { items: true } });
  const legacy = pos.filter(po => LEGACY.poNumber.test(po.poNumber));
  const ops = [];
  const statusChanges = {};
  for (const po of legacy) {
    const { data, itemOps } = purchaseOrderPatch(po);
    if (data.status) statusChanges[`${po.status} → ${data.status}`] = (statusChanges[`${po.status} → ${data.status}`] || 0) + 1;
    if (Object.keys(data).length) ops.push(prisma.purchaseOrder.update({ select: ID_ONLY, where: { id: po.id }, data }));
    ops.push(...itemOps);
  }
  const unknown = pos.filter(po => !PO_STATUSES.includes(mapLegacyPoStatus(po.status)));
  note('po.status mapped to app lifecycle', Object.values(statusChanges).reduce((a, b) => a + b, 0), statusChanges);
  note('po dates / payment / money / inspection (legacy POs)', legacy.length);
  if (unknown.length) note('⚠ POs with a status still unknown to the app', unknown.length, unknown.slice(0, 3).map(p => p.status));
  await runBatched(ops);
}

function purchaseOrderPatch(po) {
  const data = {};
  const status = mapLegacyPoStatus(po.status);
  if (status !== po.status) data.status = status;
  const isPlaced = status === 'Confirmed' || status === 'Received';

  const confirmationDate = po.confirmationDate || (isPlaced ? addDays(po.orderDate, CONFIRM_LAG_DAYS) : null);
  if (confirmationDate && !po.confirmationDate) data.confirmationDate = confirmationDate;
  if (po.expectedDeliveryDate && po.expectedDeliveryDate < po.orderDate) {
    data.expectedDeliveryDate = addDays(po.orderDate, DELIVERY_LAG_DAYS);
  }
  const dueDate = po.paymentDueDate || (isPlaced ? addDays(confirmationDate, NET_TERMS_DAYS) : null);
  if (dueDate && !po.paymentDueDate) data.paymentDueDate = dueDate;
  if (status === 'Received' && !po.paidAt && dueDate && dueDate < new Date()) {
    data.paidAt = dueDate;
    data.billingStatus = 'Bills Received';
  }

  const itemOps = [];
  let totalCents = 0;
  for (const it of po.items) {
    const unitPrice = roundMoney(it.unitPrice);
    const subtotal = roundMoney(unitPrice * it.quantity);
    totalCents += Math.round(subtotal * 100);
    const itemData = {};
    if (unitPrice !== it.unitPrice) itemData.unitPrice = unitPrice;
    if (subtotal !== it.subtotal) itemData.subtotal = subtotal;
    if (status === 'Received' && it.inspectionStatus === 'Pending') itemData.inspectionStatus = 'OK';
    if (Object.keys(itemData).length) itemOps.push(prisma.purchaseOrderItem.update({ select: ID_ONLY, where: { id: it.id }, data: itemData }));
  }
  const total = totalCents / 100;
  if (total !== po.totalAmount) data.totalAmount = total;
  return { data, itemOps };
}

// ── 6. Document numbers: PO-/INV-/WEB-YYYYMMDD-#### ────────────────────────
async function renumberPurchaseOrders() {
  const pos = await prisma.purchaseOrder.findMany({ select: { id: true, poNumber: true, orderDate: true, sourceRfq: true }, orderBy: { orderDate: 'asc' } });
  const next = createSequencer(pos.map(p => p.poNumber), parseDocNumber);
  const renames = new Map();
  for (const po of pos) {
    if (!LEGACY.poNumber.test(po.poNumber)) continue;
    const key = `PO-${dateKey(po.orderDate)}`;
    renames.set(po.poNumber, formatDocNumber('PO', po.orderDate, next(key)));
  }
  const ops = pos.flatMap(po => {
    const data = {};
    if (renames.has(po.poNumber)) data.poNumber = renames.get(po.poNumber);
    if (renames.has(po.sourceRfq)) data.sourceRfq = renames.get(po.sourceRfq);
    return Object.keys(data).length ? [prisma.purchaseOrder.update({ select: ID_ONLY, where: { id: po.id }, data })] : [];
  });
  note('po.poNumber → PO-YYYYMMDD-#### (sourceRfq refs follow)', renames.size, [...renames].slice(0, 2));
  await runBatched(ops);
}

async function renumberInvoices() {
  const txs = await prisma.transaction.findMany({ select: { id: true, invoiceNumber: true, transactionDate: true }, orderBy: { transactionDate: 'asc' } });
  const next = createSequencer(txs.map(t => t.invoiceNumber), parseDocNumber);
  const ops = [];
  const sample = [];
  for (const tx of txs) {
    if (!LEGACY.invoice.test(tx.invoiceNumber)) continue;
    const type = tx.invoiceNumber.slice(0, 3); // INV | WEB
    const invoiceNumber = formatDocNumber(type, tx.transactionDate, next(`${type}-${dateKey(tx.transactionDate)}`));
    if (sample.length < 2) sample.push({ from: tx.invoiceNumber, to: invoiceNumber });
    ops.push(prisma.transaction.update({ select: ID_ONLY, where: { id: tx.id }, data: { invoiceNumber } }));
  }
  note('tx.invoiceNumber → INV/WEB-YYYYMMDD-####', ops.length, sample);
  await runBatched(ops);
}

// ── 7. Review verification = user actually bought the part (app rule) ───────
async function fixReviewVerification() {
  const sql = (set) => `
    ${set ? 'UPDATE "Review" r SET "purchaseVerified" = v.ok FROM' : 'SELECT count(*)::int AS n FROM'} (
      SELECT r2.id, EXISTS (
        SELECT 1 FROM "Transaction" t JOIN "TransactionItem" i ON i."transactionId" = t.id
        WHERE t."userId" = r2."userId" AND i."partId" = r2."partId"
      ) AS ok FROM "Review" r2
    ) v ${set ? 'WHERE r.id = v.id AND r."purchaseVerified" <> v.ok' : 'JOIN "Review" r ON r.id = v.id WHERE r."purchaseVerified" <> v.ok'}`;
  const [{ n }] = await prisma.$queryRawUnsafe(sql(false));
  note('review.purchaseVerified recomputed', n);
  if (APPLY && n > 0) await prisma.$executeRawUnsafe(sql(true));
}

async function main() {
  console.log(APPLY ? '✍️  APPLY mode — writing changes' : '🔎 DRY RUN — nothing will be written (pass --apply to write)');
  // Order matters: statuses before reservations; part SKUs before line-item snapshots.
  await fixTransactionFields();
  await fixReservedStock();
  await fixParts();
  await fixLineItemSkus();
  await fixPurchaseOrders();
  await renumberPurchaseOrders();
  await renumberInvoices();
  await fixReviewVerification();
  console.table(report);
  console.log(APPLY ? '✅ Backfill applied. Re-run without --apply: every row count should be 0.' : 'ℹ️  Dry run complete.');
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err.constructor?.name, err.code || '', err.message || '(no message)', err.meta || '');
    console.error('   Safe to re-run: completed batches are committed and skipped next time.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
