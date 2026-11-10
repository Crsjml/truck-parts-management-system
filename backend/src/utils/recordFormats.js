/**
 * Canonical record formats shared by the seed script and the legacy-data
 * backfill. Keep these in step with the report spec in docs/reports:
 *   SKU  : CAT-PRT-#####
 *   Docs : TYPE-YYYYMMDD-####
 */

/** Subcategory name -> CAT-PRT prefix. */
export const SKU_PREFIXES = Object.freeze({
  'Complete Engines': 'ENG-CMP',
  'Cylinder Heads': 'ENG-CYH',
  'Turbochargers': 'ENG-TRB',
  'Fuel Injection Pumps': 'FUL-INJ',
  'Leaf Springs': 'SPR-LEF',
  'Shock Absorbers': 'SUS-SHK',
  'Axle Assemblies': 'AXL-ASM',
  'Differential Gears': 'AXL-DIF',
  'Brake Chambers': 'BRK-CHM',
  'Brake Pads/Linings': 'BRK-PAD',
  'Air Brake Components': 'BRK-AIR',
  'Alternators': 'ELC-ALT',
  'Starter Motors': 'ELC-STR',
  'Wiring Harnesses': 'ELC-WRH',
  'Complete Truck Cabins': 'BDY-CAB',
  'Bumpers': 'BDY-BMP',
  'Windshields': 'BDY-WSH'
});

/** Patterns that only seed-era (pre-format) rows match. */
export const LEGACY = Object.freeze({
  sku: /^SKU-[A-Z0-9]{8}$/,
  poNumber: /^PO-[A-Z0-9]{6}$/,
  invoice: /^(INV|WEB)-\d{13}-\d{3}$/,
  oem: /^OEM-\d{5}$/
});

/** PO statuses the seed used that the Purchasing lifecycle does not know. */
const LEGACY_PO_STATUS_MAP = Object.freeze({
  'Acknowledged': 'Confirmed',
  'Ready for Pickup': 'Confirmed',
  'Delayed': 'Confirmed',
  'Completed': 'Received'
});

export const PO_STATUSES = Object.freeze([
  'Draft', 'RFQ Sent', 'Confirmed', 'Received', 'Cancelled', 'Problem Reported', 'Returned to Supplier'
]);

/** Pickup details stamped on online orders (see CheckoutService). */
export const STORE_PICKUP = Object.freeze({
  location: 'Tarlac Truck Pitstop, 123 MacArthur Highway, Tarlac City',
  hours: 'Mon-Sat: 8:00 AM - 5:00 PM'
});

const SKU_SEQ_DIGITS = 5;
const DOC_SEQ_DIGITS = 4;
const TENDER_STEP = 100;

/**
 * @param {string} categoryName
 * @returns {string} CAT-PRT prefix
 */
export function skuPrefixFor(categoryName) {
  if (SKU_PREFIXES[categoryName]) return SKU_PREFIXES[categoryName];
  const letters = String(categoryName).toUpperCase().replace(/[^A-Z]/g, '');
  return `${letters.slice(0, 3).padEnd(3, 'X')}-GEN`;
}

/**
 * @param {string} prefix CAT-PRT
 * @param {number} seq
 * @returns {string}
 */
export function formatSku(prefix, seq) {
  return `${prefix}-${String(seq).padStart(SKU_SEQ_DIGITS, '0')}`;
}

/** Business calendar is Philippine time (UTC+8, no DST). */
const BUSINESS_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Philippine-calendar-day YYYYMMDD key, independent of server timezone.
 * @param {Date} date
 * @returns {string}
 */
export function dateKey(date) {
  const d = new Date(new Date(date).getTime() + BUSINESS_UTC_OFFSET_MS);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}${mm}${dd}`;
}

/**
 * @param {string} type e.g. PO, INV, WEB, SA
 * @param {Date} date
 * @param {number} seq
 * @returns {string} TYPE-YYYYMMDD-####
 */
export function formatDocNumber(type, date, seq) {
  return `${type}-${dateKey(date)}-${String(seq).padStart(DOC_SEQ_DIGITS, '0')}`;
}

/**
 * Next TYPE-YYYYMMDD-#### after the day's latest stored number.
 * @param {string} type
 * @param {Date} date
 * @param {string | null | undefined} latest latest number already stored for that day
 * @returns {string}
 */
export function nextDocNumber(type, date, latest) {
  const seq = parseDocNumber(latest)?.seq ?? 0;
  return formatDocNumber(type, date, seq + 1);
}

/**
 * Hands out per-key sequence numbers, starting after any already in use.
 * @param {Iterable<string>} existing numbers already present (any format)
 * @param {(n: string) => {key: string, seq: number} | null} parse
 * @returns {(key: string) => number}
 */
export function createSequencer(existing, parse) {
  const max = new Map();
  for (const n of existing) {
    const parsed = parse(n);
    if (parsed) max.set(parsed.key, Math.max(max.get(parsed.key) || 0, parsed.seq));
  }
  return (key) => {
    const next = (max.get(key) || 0) + 1;
    max.set(key, next);
    return next;
  };
}

/** Parses CAT-PRT-##### -> { key: 'CAT-PRT', seq }. */
export function parseSku(sku) {
  const m = /^([A-Z]{3}-[A-Z]{3})-(\d{5})$/.exec(sku || '');
  return m ? { key: m[1], seq: Number(m[2]) } : null;
}

/** Parses TYPE-YYYYMMDD-#### -> { key: 'TYPE-YYYYMMDD', seq }. */
export function parseDocNumber(n) {
  const m = /^([A-Z]+-\d{8})-(\d{4})$/.exec(n || '');
  return m ? { key: m[1], seq: Number(m[2]) } : null;
}

/** @param {string} status */
export function mapLegacyPoStatus(status) {
  return LEGACY_PO_STATUS_MAP[status] || status;
}

/** @param {number} n */
export function roundMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Cash tendered: next multiple of 100 at or above the total. */
export function roundUpTender(total) {
  return Math.ceil(roundMoney(total) / TENDER_STEP) * TENDER_STEP;
}

/** Simple stable string hash (FNV-1a, 32-bit). */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Deterministic Japanese-style part number (#####-####) for sample data.
 * @param {string} seed
 */
export function mpnFromSeed(seed) {
  const h = hash32(String(seed));
  const a = String(10000 + (h % 90000));
  const b = String(1000 + (Math.floor(h / 90000) % 9000));
  return `${a}-${b}`;
}
