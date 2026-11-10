import { dateKey, nextDocNumber } from './recordFormats.js';

const DEFAULT_ATTEMPTS = 5;

/**
 * Next INV-/WEB-YYYYMMDD-#### for the Philippine calendar day. Call inside the
 * same DB transaction that inserts the row; a concurrent insert surfaces as a
 * P2002 on invoiceNumber, which retryOnUniqueViolation turns into a retry.
 * @param {{ transaction: { findFirst: Function } }} tx Prisma client or tx
 * @param {'INV' | 'WEB'} type
 * @param {Date} [date]
 * @returns {Promise<string>}
 */
export async function nextInvoiceNumber(tx, type, date = new Date()) {
  const latest = await tx.transaction.findFirst({
    where: { invoiceNumber: { startsWith: `${type}-${dateKey(date)}-` } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true }
  });
  return nextDocNumber(type, date, latest?.invoiceNumber);
}

/**
 * @param {unknown} error
 * @param {string} field
 * @returns {boolean}
 */
export function isUniqueViolation(error, field) {
  return error?.code === 'P2002' && Boolean(error.meta?.target?.includes(field));
}

/**
 * Re-runs fn while it fails on a unique-constraint collision for `field`.
 * @template T
 * @param {string} field
 * @param {() => Promise<T>} fn
 * @param {number} [attempts]
 * @returns {Promise<T>}
 */
export async function retryOnUniqueViolation(field, fn, attempts = DEFAULT_ATTEMPTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isUniqueViolation(error, field) || attempt >= attempts) throw error;
    }
  }
}
