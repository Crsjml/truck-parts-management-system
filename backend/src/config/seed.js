// backend/src/config/seed.js
// Auto-seeds the admin user and demo customer accounts into MongoDB on startup.
// All seed operations are idempotent — they check before inserting.

import bcrypt from 'bcryptjs';
import User from '../models/User.js';

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

// All demo accounts share the same password for convenience: Player@12345
const DEMO_PASSWORD = 'Player@12345';

export async function seedCustomers() {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  let seeded = 0;

  for (const customer of DEMO_CUSTOMERS) {
    const existing = await User.findOne({ email: customer.email });
    if (existing) {
      console.log(`ℹ️  Customer already exists — skipping: ${customer.email}`);
      continue;
    }

    await User.create({
      ...customer,
      password_hash,
      role:     'customer',
      verified: true, // pre-verified so they can log in immediately
    });

    console.log(`✅ Customer seeded: ${customer.full_name} <${customer.email}>`);
    seeded++;
  }

  if (seeded > 0) {
    console.log(`\n🎮 ${seeded} demo customer(s) seeded. Password for all: ${DEMO_PASSWORD}\n`);
  }
}

// ── Parts Seed (10 accurate truck parts) ──────────────────────────────────────

import Part from '../models/Part.js';

const DEMO_PARTS = [
  {
    name: "Heavy-Duty Piston Ring Set (4HF1)",
    sku: "PST-4HF1-009",
    oem: "8-97105807-0",
    category: "Engine",
    price: 3850.00,
    stock: 12,
    min_stock: 5,
    compatibility: "Isuzu ELF, NPR, NKR (4HF1 Engines)",
    description: "Premium grade replacement piston ring set. Heat-resistant chrome plating for heavy duty thermal cycles and reduced cylinder wear."
  },
  {
    name: "Front Brake Lining Kit",
    sku: "BRK-LN-F80",
    oem: "1-87810076-1",
    category: "Brakes",
    price: 1850.00,
    stock: 4,
    min_stock: 8,
    compatibility: "Fuso Canter, Isuzu Forward",
    description: "Non-asbestos high-friction brake lining kit. Designed for superior stopping power under extreme payload conditions."
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
    name: "Starter Motor Assembly (24V 4.5KW)",
    sku: "ELC-STR-24V",
    oem: "0-23000-7010",
    category: "Electrical",
    price: 7200.00,
    stock: 3,
    min_stock: 3,
    compatibility: "Isuzu Giga, Hino Profia (6WF1/6UZ1)",
    description: "High-torque 24V starter assembly. Weather-sealed housing with heavy-duty solenoid for reliable cold starts."
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
    name: "Turbocharger Unit (6D16-T)",
    sku: "TRB-6D16-T",
    oem: "ME088840",
    category: "Engine",
    price: 24500.00,
    stock: 2,
    min_stock: 2,
    compatibility: "Mitsubishi Fuso FK617 / FM657",
    description: "Precision-balanced turbocharger assembly. Includes premium cast iron exhaust housing and dynamic gaskets."
  },
  {
    name: "Air Brake Master Valve",
    sku: "BRK-MST-VLV",
    oem: "47160-2260",
    category: "Brakes",
    price: 6400.00,
    stock: 18,
    min_stock: 5,
    compatibility: "Hino Ranger, Hino 500",
    description: "Dual-circuit air brake control valve. Pre-lubricated seals and tested for extreme weather duty cycle reliability."
  },
  {
    name: "Water Pump Assembly",
    sku: "WTP-4HK1",
    oem: "8-97333361-1",
    category: "Engine",
    price: 4200.00,
    stock: 10,
    min_stock: 4,
    compatibility: "Isuzu ELF (4HK1/4JJ1)",
    description: "High-flow cast-iron water pump. Includes premium bearings and high-temperature seals to prevent coolant leaks."
  },
  {
    name: "LED Tail Light Unit (24V)",
    sku: "ELC-TL-LED24",
    oem: "81550-37080",
    category: "Electrical",
    price: 1250.00,
    stock: 25,
    min_stock: 10,
    compatibility: "Universal 24V Trucks (Hino, Isuzu, Fuso)",
    description: "Waterproof LED tail light cluster. Integrated brake, turn signal, and reverse lamps with long-lasting diodes."
  }
];

export async function seedParts() {
  let seeded = 0;
  for (const part of DEMO_PARTS) {
    const existing = await Part.findOne({ sku: part.sku });
    if (existing) {
      continue;
    }
    await Part.create(part);
    seeded++;
  }
  
  if (seeded > 0) {
    console.log(`✅ ${seeded} demo parts seeded.`);
  } else {
    console.log('ℹ️  Parts already exist in MongoDB — skipping seed.');
  }
}

