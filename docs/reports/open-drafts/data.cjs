// Datasets for the open-style drafts: LAYOUT (picture masks) and SAMPLE
// (fictitious, illustrative figures). Builders in reports.cjs render either.
const { A, X, D9, Z, money, SKU, OEM, DATE, docNo, php } = require('../generate-report-open-drafts.cjs');

const SAMPLE_PARTS = [
  ['BRK-PAD-00001', 'Front Brake Pad Set', '8980066870', 'Brake System'],
  ['CLT-DSC-00004', 'Clutch Disc 300mm', 'ME521103', 'Transmission'],
  ['FLT-AIR-00012', 'Air Filter Element', '17801-2340', 'Filters'],
  ['SPR-LEF-00009', 'Leaf Spring, Rear', '48210-1460', 'Suspension'],
  ['FLT-OIL-00003', 'Oil Filter FH-120', '15607-1730', 'Filters'],
  ['BRK-SHO-00007', 'Brake Shoe Lining', '47440-1240', 'Brake System'],
];

const layout = {
  legend: true,
  invoice: {
    no: docNo('INV'), date: `${DATE} 99:99`, customer: X(30), phone: '9999 999 9999',
    items: Array.from({ length: 3 }, (_, i) => [Z(2), SKU, X(28), money(7), Z(3), money(7)]),
    subtotal: money(7), discount: '-' + money(6), vat: money(6), net: money(7),
    payment: ['Payment Method : ' + A(12), '[CASH] Tendered : ' + money(7) + '   Change : ' + money(6),
      '[CHEQUE] Cheque No : ' + X(20) + '   [GCASH] Ref : ' + D9(13)],
  },
  po: {
    no: docNo('PO'), date: DATE, status: A(12), expected: DATE, rfq: docNo('RFQ'),
    supplier: [X(40), 'Attn : ' + X(30), X(40), 'Tel : ' + X(20), 'Email : ' + X(30), 'Payment Terms : ' + X(12)],
    items: Array.from({ length: 3 }, () => [Z(2), SKU, OEM, X(16), Z(3), money(6), money(7)]),
    total: money(8), notes: X(60), preparedBy: X(20),
  },
  rfq: {
    no: docNo('RFQ'), date: DATE, supplier: X(40), email: X(30),
    items: Array.from({ length: 3 }, () => [Z(2), SKU, X(24), Z(3)]),
    validUntil: '____________________', signer: '____________________',
  },
  summary: {
    meta: [`Period : ${DATE} to ${DATE}`, 'Compared vs : 99/9999', `Generated : ${DATE} 99:99`],
    kpis: [['GROSS SALES', money(8), '+Z9.9% vs prev'], ['TRANSACTIONS', group3z(5), '+Z9.9% vs prev'], ['UNITS SOLD', group3z(6), '+Z9.9% vs prev']],
    lines: [['Gross Sales', money(8)], ['Less: Discounts', '-' + money(6)], ['Net Sales', money(8)], ['VATable (net of VAT)', money(8)], ['Output VAT (12%)', money(7)]],
    payments: Array.from({ length: 5 }, () => [A(10), money(7), 'ZZ9.9%']), paymentsTotal: money(8),
    statuses: Array.from({ length: 4 }, () => [A(18), Z(3)]), statusTotal: Z(4),
  },
  best: {
    meta: [`Period : ${DATE} to ${DATE}`, `Generated : ${DATE} 99:99`],
    rows: Array.from({ length: 3 }, () => [Z(3), 'XXXX', SKU, X(24), OEM, X(14), Z(4), Z(4), money(7)]),
    units: Z(5), revenue: money(8),
  },
  slow: {
    meta: [`Period : ${DATE} to ${DATE}`, `Generated : ${DATE} 99:99`],
    groups: [
      { category: X(14), rows: [[SKU, X(24), OEM, Z(4), Z(3), 'ZZ9 days ago'], [SKU, X(24), OEM, Z(4), 0, 'Never']], parts: Z(3), stock: Z(5) },
      { category: X(14), rows: [[SKU, X(24), OEM, Z(4), Z(3), 'ZZ9 days ago']], parts: Z(3), stock: Z(5) },
    ],
    parts: Z(4), stock: Z(6),
  },
};

function group3z(n) {
  return Z(n).replace(/\B(?=(.{3})+$)/g, ',');
}

const bestRows = (n) => Array.from({ length: n }, (_, i) => {
  const [sku, name, oem, cat] = SAMPLE_PARTS[i % SAMPLE_PARTS.length];
  const units = Math.max(4, 210 - i * 5);
  const price = [1850, 2400, 980, 3800, 220, 1250][i % 6];
  const move = i === 0 ? '+2' : i % 4 === 0 ? 'NEW' : i % 3 === 0 ? '-1' : i % 2 === 0 ? '+1' : '-';
  return [i + 1, move, sku, `${name}${i >= SAMPLE_PARTS.length ? ` #${Math.floor(i / 6) + 1}` : ''}`, oem, cat, 120 - (i % 40), units, units * price];
});

const sample = {
  legend: false,
  invoice: {
    no: 'INV-20261110-0042', date: '11/10/2026 10:24', customer: 'Juan Dela Cruz', phone: '0917 123 4567',
    items: [[1, 'BRK-PAD-00001', 'Front Brake Pad Set', php(1850), 2, php(3700)], [2, 'FLT-OIL-00003', 'Oil Filter FH-120', php(220), 4, php(880)]],
    subtotal: php(4089.29), discount: '-' + php(0), vat: php(490.71), net: php(4580),
    payment: ['Payment Method : CASH', 'Tendered : ' + php(5000) + '   Change : ' + php(420)],
  },
  po: {
    no: 'PO-20260925-0003', date: '09/25/2026', status: 'CONFIRMED', expected: '10/02/2026', rfq: 'RFQ-20260920-0002',
    supplier: ['Prime Diesel Parts Trading', 'Attn : Ramon Santos', '123 Rizal Ave., Angeles City', 'Tel : 045 888 1234', 'Email : sales@primediesel.ph', 'Payment Terms : NET 30'],
    items: [[1, 'BRK-PAD-00001', '8980066870', 'Front Brake Pad Set', 20, php(1250), php(25000)], [2, 'CLT-DSC-00004', 'ME521103', 'Clutch Disc 300mm', 10, php(2400), php(24000)]],
    total: php(49000), notes: 'Deliver to warehouse gate 2.', preparedBy: 'Admin',
  },
  rfq: {
    no: 'RFQ-20260920-0002', date: '09/20/2026', supplier: 'Prime Diesel Parts Trading', email: 'sales@primediesel.ph',
    items: [[1, 'BRK-PAD-00001', 'Front Brake Pad Set', 20], [2, 'CLT-DSC-00004', 'Clutch Disc 300mm', 10], [3, 'SPR-LEF-00009', 'Leaf Spring, Rear', 6]],
    validUntil: '____________________', signer: '____________________',
  },
  summary: {
    meta: ['Period : 09/01/2026 to 09/30/2026', 'Compared vs : 08/2026', 'Generated : 10/01/2026 09:15'],
    kpis: [['GROSS SALES', php(1284560), '+8.4% vs prev'], ['TRANSACTIONS', '342', '+5.2% vs prev'], ['UNITS SOLD', '1,987', '+6.1% vs prev']],
    lines: [['Gross Sales', php(1284560)], ['Less: Discounts', '-' + php(24500)], ['Net Sales', php(1260060)], ['VATable (net of VAT)', php(1125053.57)], ['Output VAT (12%)', php(135006.43)]],
    payments: [['Cash', php(617000), '48.0%'], ['GCash', php(288000), '22.4%'], ['Card', php(180560), '14.1%'], ['Transfer', php(120000), '9.3%'], ['Cheque', php(79000), '6.2%']],
    paymentsTotal: php(1284560),
    statuses: [['Completed', 318], ['Ready for Pickup', 9], ['Cancelled', 12], ['Order Placed', 3]], statusTotal: 342,
  },
  best: { meta: ['Period : 09/01/2026 to 09/30/2026', 'Generated : 10/01/2026 09:15'], rowsFor: bestRows },
  slow: {
    meta: ['Period : 09/01/2026 to 09/30/2026', 'Generated : 10/01/2026 09:15'],
    groups: [
      { category: 'Accessories', rows: [['ACC-MUD-00045', 'Mud Flap Rubber, Pair', 'MF-220-STD', 60, 3, '98 days ago']], parts: 1, stock: 60 },
      { category: 'Cooling', rows: [['RAD-CAP-00021', 'Radiator Cap Assembly', '21430-90001', 35, 2, '142 days ago'], ['RAD-HOS-00024', 'Radiator Hose, Upper', '21501-1810', 12, 0, 'Never']], parts: 2, stock: 47 },
      { category: 'Lighting', rows: [['LMP-BZL-00033', 'Headlamp Bezel, Chrome', '8970894400', 18, 0, 'Never']], parts: 1, stock: 18 },
    ],
    parts: 4, stock: 125,
  },
};

module.exports = { layout, sample };
