export const INITIAL_CATEGORIES = [
  "All",
  "Engine",
  "Transmission",
  "Brakes",
  "Suspension",
  "Electrical",
  "Body & Exterior"
];

export const INITIAL_PARTS = [
  {
    id: "1",
    name: "Heavy-Duty Piston Ring Set (4HF1)",
    sku: "PST-4HF1-009",
    oem: "8-97105807-0",
    category: "Engine",
    price: 3850.00,
    stock: 12,
    minStock: 5,
    compatibility: "Isuzu ELF, NPR, NKR (4HF1 Engines)",
    description: "Premium grade replacement piston ring set. Heat-resistant chrome plating for heavy duty thermal cycles and reduced cylinder wear."
  },
  {
    id: "2",
    name: "Front Brake Lining Kit",
    sku: "BRK-LN-F80",
    oem: "1-87810076-1",
    category: "Brakes",
    price: 1850.00,
    stock: 4,
    minStock: 8, // Triggers Low Stock Alert!
    compatibility: "Fuso Canter, Isuzu Forward",
    description: "Non-asbestos high-friction brake lining kit. Designed for superior stopping power under extreme payload conditions."
  },
  {
    id: "3",
    name: "Clutch Booster Assembly (90mm)",
    sku: "CLT-BST-90M",
    oem: "ME625341",
    category: "Transmission",
    price: 4950.00,
    stock: 15,
    minStock: 4,
    compatibility: "Mitsubishi Fuso Fighter, Super Great",
    description: "Air-assist hydraulic clutch booster. Increases foot-pedal sensitivity and ensures smooth gear shifts under heavy transport."
  },
  {
    id: "4",
    name: "Heavy-Duty Leaf Spring Assembly (Rear)",
    sku: "LFS-R-10P",
    oem: "48210-37B70",
    category: "Suspension",
    price: 9200.00,
    stock: 6,
    minStock: 3,
    compatibility: "Hino 300, Toyota Dyna",
    description: "10-leaf heavy duty rear spring pack. High-stress alloy construction with anti-friction silencer pads for payload stability."
  },
  {
    id: "5",
    name: "Starter Motor Assembly (24V 4.5KW)",
    sku: "ELC-STR-24V",
    oem: "0-23000-7010",
    category: "Electrical",
    price: 7200.00,
    stock: 3,
    minStock: 3, // Alert state
    compatibility: "Isuzu Giga, Hino Profia (6WF1/6UZ1)",
    description: "High-torque 24V starter assembly. Weather-sealed housing with heavy-duty solenoid for reliable cold starts."
  },
  {
    id: "6",
    name: "Cabin Chrome Grille Panel",
    sku: "BDY-GRL-CHM",
    oem: "MC939455",
    category: "Body & Exterior",
    price: 5400.00,
    stock: 8,
    minStock: 2,
    compatibility: "Fuso Canter FE71/FE84",
    description: "Triple-plated chrome styling grille. Made of impact-resistant ABS plastic. Perfect OEM fitment replacement."
  },
  {
    id: "7",
    name: "Turbocharger Unit (6D16-T)",
    sku: "TRB-6D16-T",
    oem: "ME088840",
    category: "Engine",
    price: 24500.00,
    stock: 2,
    minStock: 2,
    compatibility: "Mitsubishi Fuso FK617 / FM657",
    description: "Precision-balanced turbocharger assembly. Includes premium cast iron exhaust housing and dynamic gaskets."
  },
  {
    id: "8",
    name: "Air Brake Master Valve",
    sku: "BRK-MST-VLV",
    oem: "47160-2260",
    category: "Brakes",
    price: 6400.00,
    stock: 18,
    minStock: 5,
    compatibility: "Hino Ranger, Hino 500",
    description: "Dual-circuit air brake control valve. Pre-lubricated seals and tested for extreme weather duty cycle reliability."
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: "TX-1001",
    invoiceNumber: "TTP-2026-0001",
    transactionDate: "2026-06-15T10:30:00.000Z",
    customerName: "Batangas Freight Logistics",
    customerContact: "0917-555-0192",
    items: [
      { partId: "1", name: "Heavy-Duty Piston Ring Set (4HF1)", quantity: 2, price: 3850.00 },
      { partId: "3", name: "Clutch Booster Assembly (90mm)", quantity: 1, price: 4950.00 }
    ],
    discount: 500.00,
    tax: 12, // 12% VAT
    subtotal: 12650.00,
    taxAmount: 1458.00,
    total: 13608.00
  },
  {
    id: "TX-1002",
    invoiceNumber: "TTP-2026-0002",
    transactionDate: "2026-06-16T14:15:00.000Z",
    customerName: "Cabanatuan Sand & Gravel",
    customerContact: "0920-888-4122",
    items: [
      { partId: "4", name: "Heavy-Duty Leaf Spring Assembly (Rear)", quantity: 2, price: 9200.00 }
    ],
    discount: 0.00,
    tax: 12,
    subtotal: 18400.00,
    taxAmount: 2208.00,
    total: 20608.00
  },
  {
    id: "TX-1003",
    invoiceNumber: "TTP-2026-0003",
    transactionDate: "2026-06-17T09:45:00.000Z",
    customerName: "CJ Logistics Services",
    customerContact: "0909-777-1234",
    items: [
      { partId: "2", name: "Front Brake Lining Kit", quantity: 4, price: 1850.00 },
      { partId: "5", name: "Starter Motor Assembly (24V 4.5KW)", quantity: 1, price: 7200.00 }
    ],
    discount: 1000.00,
    tax: 12,
    subtotal: 14600.00,
    taxAmount: 1632.00,
    total: 15232.00
  }
];

export const INITIAL_LOGS = [
  { id: "L1", timestamp: "2026-06-17T09:48:00Z", type: "sale", message: "Sale transaction TX-1003 completed: TTP-2026-0003 generated for CJ Logistics Services." },
  { id: "L2", timestamp: "2026-06-17T09:12:00Z", type: "stock", message: "Restocked 'Air Brake Master Valve': added 10 units (current stock: 18)." },
  { id: "L3", timestamp: "2026-06-16T14:20:00Z", type: "sale", message: "Sale transaction TX-1002 completed: TTP-2026-0002 generated for Cabanatuan Sand & Gravel." },
  { id: "L4", timestamp: "2026-06-15T10:35:00Z", type: "sale", message: "Sale transaction TX-1001 completed: TTP-2026-0001 generated for Batangas Freight Logistics." },
  { id: "L5", timestamp: "2026-06-14T16:00:00Z", type: "system", message: "Tarlac Truck Parts Management System initialized successfully." }
];
