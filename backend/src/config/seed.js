// backend/src/config/seed.js
// Auto-seeds the admin user, demo categories, customer accounts, and parts into MongoDB on startup.
// All seed operations are idempotent — they check before inserting.

import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Part from '../models/Part.js';

// ── Admin seed ─────────────────────────────────────────────────────────────────

export async function seedAdmin() {
  const admin_email    = process.env.ADMIN_EMAIL;
  const admin_password = process.env.ADMIN_PASSWORD;

  if (!admin_email || !admin_password) {
    console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  const existing = await User.findOne({ email: admin_email.toLowerCase() });
  if (existing) {
    console.log('ℹ️  Admin user already exists in MongoDB — skipping seed.');
    return;
  }

  const password_hash = await bcrypt.hash(admin_password, 12);
  await User.create({
    email:         admin_email.toLowerCase(),
    password_hash,
    full_name:     'System Admin',
    role:          'admin',
    verified:      true,
  });

  console.log(`✅ Admin user seeded: ${admin_email}`);
}

// ── Demo customer seed (FIFA players) ─────────────────────────────────────────

const DEMO_CUSTOMERS = [
  { full_name: 'Lionel Messi',     contact_number: '+5491112345678', email: 'lionel.messi@example.com'    },
  { full_name: 'Cristiano Ronaldo', contact_number: '+351912345678', email: 'cristiano.ronaldo@example.com' },
  { full_name: 'Kylian Mbappe',    contact_number: '+33612345678',  email: 'kylian.mbappe@example.com'    },
  { full_name: 'Erling Haaland',   contact_number: '+4791234567',   email: 'erling.haaland@example.com'   },
  { full_name: 'Vinicius Junior',  contact_number: '+5521987654321', email: 'vinicius.junior@example.com'  },
];

const DEMO_PASSWORD = 'Player@12345';

export async function seedCustomers() {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let seeded = 0;

  for (const customer of DEMO_CUSTOMERS) {
    const existing = await User.findOne({ email: customer.email });
    if (existing) {
      continue;
    }

    await User.create({
      ...customer,
      password_hash,
      role:     'customer',
      verified: true,
    });

    seeded++;
  }

  if (seeded > 0) {
    console.log(`🎮 ${seeded} demo customer(s) seeded. Password for all: ${DEMO_PASSWORD}`);
  }
}

// ── Categories seed ────────────────────────────────────────────────────────────

export async function seedCategories() {
  const DEFAULT_CATEGORIES = [
    { name: 'Engine', subcategories: ['Pistons & Cylinders', 'Cooling System', 'Turbochargers'] },
    { name: 'Brakes', subcategories: ['Brake Pads & Linings', 'Valves & Calipers'] },
    { name: 'Electrical', subcategories: ['Starter Motors', 'Lighting'] },
    { name: 'Transmission', subcategories: [] },
    { name: 'Suspension', subcategories: [] },
    { name: 'Body & Exterior', subcategories: [] }
  ];

  let seeded = 0;
  for (const catData of DEFAULT_CATEGORIES) {
    let parentCat = await Category.findOne({ name: catData.name });
    if (!parentCat) {
      parentCat = await Category.create({ name: catData.name, parentCategory: null });
      seeded++;
    }

    for (const subName of catData.subcategories) {
      let subCat = await Category.findOne({ name: subName });
      if (!subCat) {
        await Category.create({ name: subName, parentCategory: parentCat._id });
        seeded++;
      }
    }
  }

  if (seeded > 0) {
    console.log(`✅ ${seeded} categories/subcategories seeded.`);
  } else {
    console.log('ℹ️  Categories already exist in MongoDB — skipping seed.');
  }
}

// ── Parts Seed (10 accurate truck parts) ──────────────────────────────────────

const DEMO_PARTS = [
  {
    name: "Heavy-Duty Piston Ring Set (4HF1)",
    sku: "PST-4HF1-009",
    oem: "8-97105807-0",
    category: "Pistons & Cylinders",
    price: 3850.00,
    stock: 12,
    min_stock: 5,
    compatibility: "Isuzu ELF, NPR, NKR (4HF1 Engines)",
    description: "Premium grade replacement piston ring set. Heat-resistant chrome plating for heavy duty thermal cycles and reduced cylinder wear."
  },
  {
    name: "Cylinder Liner Sleeve Set (6UZ1)",
    sku: "CYL-6UZ1-002",
    oem: "1-11261352-0",
    category: "Pistons & Cylinders",
    price: 18500.00,
    stock: 4,
    min_stock: 2,
    compatibility: "Isuzu Giga, CXZ (6UZ1 Engines)",
    description: "High-strength cast iron cylinder liners. Ensures optimal engine compression and longevity for heavy-duty hauling."
  },
  {
    name: "Front Brake Lining Kit",
    sku: "BRK-LN-F80",
    oem: "1-87810076-1",
    category: "Brake Pads & Linings",
    price: 1850.00,
    stock: 4,
    min_stock: 8,
    compatibility: "Fuso Canter, Isuzu Forward",
    description: "Non-asbestos high-friction brake lining kit. Designed for superior stopping power under extreme payload conditions."
  },
  {
    name: "Rear Drum Brake Shoe Set",
    sku: "BRK-SH-R55",
    oem: "MC112233",
    category: "Brake Pads & Linings",
    price: 3200.00,
    stock: 15,
    min_stock: 5,
    compatibility: "Mitsubishi Fuso Fighter, FK",
    description: "Heavy-duty rear drum brake shoes. Anti-fade compound designed for continuous downhill braking with heavy cargo."
  },
  {
    name: "Clutch Booster Assembly (90mm)",
    sku: "CLT-BST-90M",
    oem: "ME625341",
    category: "Transmission",
    price: 4950.00,
    stock: 15,
    min_stock: 4,
    compatibility: "Mitsubishi Fuso Fighter, Super Great",
    description: "Air-assist hydraulic clutch booster. Increases foot-pedal sensitivity and ensures smooth gear shifts under heavy transport."
  },
  {
    name: "Manual Gearbox Synchro Ring Set",
    sku: "TRN-SYN-HN5",
    oem: "33368-20050",
    category: "Transmission",
    price: 2400.00,
    stock: 8,
    min_stock: 3,
    compatibility: "Hino 500 Series",
    description: "Precision-machined brass synchronizer rings. Prevents gear grinding and ensures seamless shifting in heavy traffic."
  },
  {
    name: "Heavy-Duty Leaf Spring Assembly (Rear)",
    sku: "LFS-R-10P",
    oem: "48210-37B70",
    category: "Suspension",
    price: 9200.00,
    stock: 6,
    min_stock: 3,
    compatibility: "Hino 300, Toyota Dyna",
    description: "10-leaf heavy duty rear spring pack. High-stress alloy construction with anti-friction silencer pads for payload stability."
  },
  {
    name: "Air Suspension Bellows",
    sku: "SUS-AIR-HPR",
    oem: "48080-E0010",
    category: "Suspension",
    price: 7800.00,
    stock: 10,
    min_stock: 4,
    compatibility: "Hino Profia, Isuzu Giga Tractor Head",
    description: "Heavy-duty rubber air spring bellows for pneumatic suspension systems. Absorbs extreme road vibrations and load shocks."
  },
  {
    name: "Starter Motor Assembly (24V 4.5KW)",
    sku: "ELC-STR-24V",
    oem: "0-23000-7010",
    category: "Starter Motors",
    price: 7200.00,
    stock: 3,
    min_stock: 3,
    compatibility: "Isuzu Giga, Hino Profia (6WF1/6UZ1)",
    description: "High-torque 24V starter assembly. Weather-sealed housing with heavy-duty solenoid for reliable cold starts."
  },
  {
    name: "High-Torque Starter Motor (12V 3.0KW)",
    sku: "ELC-STR-12V",
    oem: "8-97323-935-2",
    category: "Starter Motors",
    price: 5400.00,
    stock: 7,
    min_stock: 2,
    compatibility: "Isuzu ELF (4JJ1/4HK1)",
    description: "Premium 12V starter motor for light to medium duty trucks. Engineered for rapid cranking speed and durability."
  },
  {
    name: "Cabin Chrome Grille Panel",
    sku: "BDY-GRL-CHM",
    oem: "MC939455",
    category: "Body & Exterior",
    price: 5400.00,
    stock: 8,
    min_stock: 2,
    compatibility: "Fuso Canter FE71/FE84",
    description: "Triple-plated chrome styling grille. Made of impact-resistant ABS plastic. Perfect OEM fitment replacement."
  },
  {
    name: "Side Mirror Assembly (LH/RH)",
    sku: "BDY-MIR-UNI",
    oem: "8-98043-690-0",
    category: "Body & Exterior",
    price: 1850.00,
    stock: 20,
    min_stock: 5,
    compatibility: "Isuzu ELF, Forward (Universal Fit)",
    description: "Wide-angle blind spot mirror assembly. Includes shatter-resistant glass and adjustable rigid mounting bracket."
  },
  {
    name: "Turbocharger Unit (6D16-T)",
    sku: "TRB-6D16-T",
    oem: "ME088840",
    category: "Turbochargers",
    price: 24500.00,
    stock: 2,
    min_stock: 2,
    compatibility: "Mitsubishi Fuso FK617 / FM657",
    description: "Precision-balanced turbocharger assembly. Includes premium cast iron exhaust housing and dynamic gaskets."
  },
  {
    name: "Front Mount Intercooler Assembly",
    sku: "TRB-INT-ISZ",
    oem: "8-97361-123-0",
    category: "Turbochargers",
    price: 12500.00,
    stock: 5,
    min_stock: 2,
    compatibility: "Isuzu Forward (6HK1-TC)",
    description: "High-efficiency aluminum intercooler. Maximizes dense air intake flow for optimal turbocharger performance."
  },
  {
    name: "Air Brake Master Valve",
    sku: "BRK-MST-VLV",
    oem: "47160-2260",
    category: "Valves & Calipers",
    price: 6400.00,
    stock: 18,
    min_stock: 5,
    compatibility: "Hino Ranger, Hino 500",
    description: "Dual-circuit air brake control valve. Pre-lubricated seals and tested for extreme weather duty cycle reliability."
  },
  {
    name: "Air Brake Relay Valve",
    sku: "BRK-RLY-UNI",
    oem: "47120-1120",
    category: "Valves & Calipers",
    price: 3100.00,
    stock: 25,
    min_stock: 10,
    compatibility: "Universal Heavy Duty Trucks / Trailers",
    description: "Fast-response air brake relay valve. Minimizes brake lag time and synchronizes tractor-trailer braking force."
  },
  {
    name: "Water Pump Assembly",
    sku: "WTP-4HK1",
    oem: "8-97333361-1",
    category: "Cooling System",
    price: 4200.00,
    stock: 10,
    min_stock: 4,
    compatibility: "Isuzu ELF (4HK1/4JJ1)",
    description: "High-flow cast-iron water pump. Includes premium bearings and high-temperature seals to prevent coolant leaks."
  },
  {
    name: "Radiator Fan Clutch Assembly",
    sku: "WTP-FAN-DYN",
    oem: "16210-78150",
    category: "Cooling System",
    price: 5800.00,
    stock: 6,
    min_stock: 3,
    compatibility: "Toyota Dyna, Hino 300 (N04C Engine)",
    description: "Thermostatic viscous fan clutch. Dynamically adjusts cooling fan RPM to maintain optimal engine operating temperature."
  },
  {
    name: "LED Tail Light Unit (24V)",
    sku: "ELC-TL-LED24",
    oem: "81550-37080",
    category: "Lighting",
    price: 1250.00,
    stock: 25,
    min_stock: 10,
    compatibility: "Universal 24V Trucks (Hino, Isuzu, Fuso)",
    description: "Waterproof LED tail light cluster. Integrated brake, turn signal, and reverse lamps with long-lasting diodes."
  },
  {
    name: "Halogen Headlight Assembly (24V)",
    sku: "ELC-HL-FUS",
    oem: "MC123456",
    category: "Lighting",
    price: 3600.00,
    stock: 12,
    min_stock: 4,
    compatibility: "Fuso Super Great",
    description: "Clear-lens halogen headlamp unit. Provides brilliant road illumination with durable, anti-yellowing polycarbonate casing."
  }
];

export async function seedParts() {
  let seeded = 0;
  for (const part of DEMO_PARTS) {
    const existing = await Part.findOne({ sku: part.sku });
    if (existing) {
      continue;
    }

    // Resolve category name to Category document ObjectId
    const categoryDoc = await Category.findOne({ name: part.category });
    if (!categoryDoc) {
      console.warn(`⚠️ Mapped category "${part.category}" not found for "${part.name}" — skipping part seed.`);
      continue;
    }

    await Part.create({
      ...part,
      category: categoryDoc._id,
      image: "" // default empty
    });
    seeded++;
  }

  if (seeded > 0) {
    console.log(`✅ ${seeded} demo parts seeded.`);
  } else {
    console.log('ℹ️  Parts already exist in MongoDB — skipping seed.');
  }
}
