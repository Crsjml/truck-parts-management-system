import fs from 'fs';

const seedCode = `import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import { fetchPartImage } from './fetch_images.js';

const prisma = new PrismaClient();

const CATEGORY_HIERARCHY = [
  {
    name: 'Engine & Powertrain', icon: 'Engine', theme: 'primary',
    subs: [
      { name: 'Complete Engines', icon: 'CarProfile', theme: 'primary', parts: ['Isuzu 4HF1 Surplus Engine', 'Mitsubishi Fuso 4M50 Engine', 'Hino J08E Engine Assembly'] },
      { name: 'Cylinder Heads', icon: 'Cylinder', theme: 'primary', parts: ['Isuzu 4HG1 Cylinder Head', 'Fuso 6D16 Cylinder Head', 'Hino 500 Series Cylinder Head'] },
      { name: 'Turbochargers', icon: 'Wind', theme: 'primary', parts: ['Cummins ISX15 Turbocharger', 'Isuzu NPR Turbo Assembly', 'Freightliner Cascadia Turbo'] },
      { name: 'Fuel Injection Pumps', icon: 'GasPump', theme: 'primary', parts: ['Zexel Injection Pump for Isuzu', 'Denso Fuel Pump Hino', 'Fuso Canter Injection Pump'] }
    ]
  },
  {
    name: 'Chassis & Under-chassis', icon: 'Truck', theme: 'secondary',
    subs: [
      { name: 'Leaf Springs', icon: 'Waves', theme: 'secondary', parts: ['Isuzu NQR Leaf Spring Assembly', 'Fuso Fighter Rear Leaf Spring', 'Hino 700 Heavy Duty Springs'] },
      { name: 'Shock Absorbers', icon: 'Pulse', theme: 'secondary', parts: ['KYB Shock Absorber Isuzu', 'Fuso Canter Front Shocks', 'Hino Ranger Shock Absorber'] },
      { name: 'Axle Assemblies', icon: 'ArrowsOutLineHorizontal', theme: 'secondary', parts: ['Isuzu Elf Rear Axle Surplus', 'Fuso Super Great Axle', 'Hino Profia Front Axle'] },
      { name: 'Differential Gears', icon: 'Nut', theme: 'secondary', parts: ['Isuzu Forward Differential', 'Fuso 6D17 Differential Gear', 'Hino 500 Differential Ratio 7:43'] }
    ]
  },
  {
    name: 'Braking Systems', icon: 'Disc', theme: 'danger',
    subs: [
      { name: 'Brake Chambers', icon: 'VinylRecord', theme: 'danger', parts: ['Hino 700 Air Brake Chamber', 'Fuso Super Great Brake Chamber', 'Isuzu Giga Brake Chamber'] },
      { name: 'Brake Pads/Linings', icon: 'SquaresFour', theme: 'danger', parts: ['Isuzu Elf Brake Shoe Set', 'Fuso Canter Brake Linings', 'Hino 300 Series Brake Pads'] },
      { name: 'Air Brake Components', icon: 'Fan', theme: 'danger', parts: ['Air Compressor for Isuzu 6BG1', 'Fuso Air Valve Assembly', 'Hino Air Dryer Relay'] }
    ]
  },
  {
    name: 'Electrical & Lighting', icon: 'Lightning', theme: 'warning',
    subs: [
      { name: 'Alternators', icon: 'BatteryCharging', theme: 'warning', parts: ['Isuzu 24V Alternator Surplus', 'Fuso 6D14 Alternator', 'Hino J08C 24V Alternator'] },
      { name: 'Starter Motors', icon: 'Key', theme: 'warning', parts: ['Isuzu 4BE1 Starter Motor', 'Fuso Canter 24V Starter', 'Hino Ranger Starter Assembly'] },
      { name: 'Wiring Harnesses', icon: 'Plugs', theme: 'warning', parts: ['Isuzu Elf Dashboard Harness', 'Fuso Fighter Cab Wiring', 'Hino 500 Main Harness'] }
    ]
  },
  {
    name: 'Body & Cabin Parts', icon: 'FrameCorners', theme: 'info',
    subs: [
      { name: 'Complete Truck Cabins', icon: 'HouseLine', theme: 'info', parts: ['Isuzu Elf Wide Cabin Surplus', 'Fuso Canter Standard Cab', 'Hino Dutro Cabin Assembly'] },
      { name: 'Bumpers', icon: 'Shield', theme: 'info', parts: ['Isuzu NHR Front Bumper', 'Fuso Fighter Chrome Bumper', 'Hino 500 Series Bumper'] },
      { name: 'Windshields', icon: 'Square', theme: 'info', parts: ['Isuzu Elf Laminated Windshield', 'Fuso Canter Front Glass', 'Hino Ranger Windshield'] }
    ]
  }
];

const REALISTIC_PART_IMAGES = [
  "https://images.unsplash.com/photo-1600705574574-8b6eb4e883e3?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1635338167822-77762d2d0c26?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503376713912-706f34b22c71?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1595186068204-1b157b54a8e2?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=400&auto=format&fit=crop"
];

const PLAYERS = [
  { name: 'LeBron James', sport: 'NBA' }, { name: 'Lionel Messi', sport: 'FIFA' },
  { name: 'Stephen Curry', sport: 'NBA' }, { name: 'Cristiano Ronaldo', sport: 'FIFA' },
  { name: 'Kevin Durant', sport: 'NBA' }, { name: 'Neymar Jr', sport: 'FIFA' },
  { name: 'Giannis Antetokounmpo', sport: 'NBA' }, { name: 'Kylian Mbappe', sport: 'FIFA' },
  { name: 'Luka Doncic', sport: 'NBA' }, { name: 'Erling Haaland', sport: 'FIFA' },
  { name: 'Nikola Jokic', sport: 'NBA' }, { name: 'Kevin De Bruyne', sport: 'FIFA' },
  { name: 'Jayson Tatum', sport: 'NBA' }, { name: 'Mohamed Salah', sport: 'FIFA' },
  { name: 'Joel Embiid', sport: 'NBA' }, { name: 'Virgil van Dijk', sport: 'FIFA' },
  { name: 'Devin Booker', sport: 'NBA' }, { name: 'Harry Kane', sport: 'FIFA' },
  { name: 'Anthony Edwards', sport: 'NBA' }, { name: 'Jude Bellingham', sport: 'FIFA' }
];

const ENGLISH_REVIEWS = [
  "Great surplus quality. Fits perfectly on our fleet trucks.",
  "Fast delivery and the part was exactly as described. Will order again for our B2B needs.",
  "Solid replacement part. Good pricing for wholesale.",
  "The condition was excellent for a surplus part. Very satisfied.",
  "Heavy duty and reliable. Passed our mechanic inspection with flying colors.",
  "Installed this recently. Working smoothly so far.",
  "Quick shipping to our warehouse. The components were well packaged.",
  "Authentic Japan surplus. Much better than the cheap replacements.",
  "Exactly what we needed to get our delivery truck back on the road.",
  "Good quality B2B supplier. The wholesale pricing really helps our margins."
];

async function main() {
  console.log("🌱 Starting database seed...");

  console.log("🧹 Cleaning existing data...");
  await prisma.review.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.part.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.category.deleteMany();
  await prisma.staffRole.deleteMany();
  await prisma.setting.deleteMany();

  console.log("⚙️ Creating settings and admin roles...");
  await prisma.setting.create({
    data: { base_currency: "PHP", active_markup: 15 }
  });

  await prisma.staffRole.create({
    data: {
      email: "admin@tarlactruckparts.local",
      role: "SUPERADMIN",
      canManageCatalog: true,
      canViewFinances: true,
      canProcessOrders: true,
      canManageStaff: true
    }
  });

  console.log("👥 Creating Customers...");
  const customers = [];
  for (const player of PLAYERS) {
    const email = \`\${player.name.toLowerCase().replace(/ /g, ".")}@example.com\`;
    const customer = await prisma.customer.create({
      data: {
        authId: faker.string.uuid(),
        email: email,
        displayName: player.name,
        phoneNumber: faker.phone.number(),
        photoURL: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(player.name)}&background=random&color=fff&size=256\`
      }
    });
    customers.push(customer);
  }

  console.log("🗂️ Creating B2B Categories, Suppliers & Parts...");
  const suppliers = [];
  for (let i = 0; i < 5; i++) {
    suppliers.push(await prisma.supplier.create({
      data: {
        name: \`Japan Surplus Importer \${i+1}\`,
        type: "Wholesaler",
        contactPerson: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number()
      }
    }));
  }

  const parts = [];

  for (const mainCat of CATEGORY_HIERARCHY) {
    const parentCategory = await prisma.category.create({
      data: { name: mainCat.name, iconName: mainCat.icon, colorTheme: mainCat.theme }
    });

    for (const subCat of mainCat.subs) {
      const subCategory = await prisma.category.create({
        data: { name: subCat.name, parentCategoryId: parentCategory.id, iconName: subCat.icon, colorTheme: subCat.theme }
      });

      // Generate random varying amount of parts to fix 6% pie chart issue
      let allParts = [...subCat.parts];
      const extraCount = faker.number.int({ min: 0, max: 7 });
      for (let i = 0; i < extraCount; i++) {
        allParts.push(\`\${faker.helpers.arrayElement(['Volvo', 'Scania', 'Mack', 'Peterbilt', 'Kenworth'])} \${subCat.name} \${faker.string.alphanumeric(4).toUpperCase()}\`);
      }

      for (const partName of allParts) {
        let brand = "Universal";
        if (partName.includes("Isuzu")) brand = "Isuzu";
        else if (partName.includes("Fuso")) brand = "Fuso";
        else if (partName.includes("Hino")) brand = "Hino";
        else if (partName.includes("Cummins")) brand = "Cummins";
        else if (partName.includes("Volvo")) brand = "Volvo";
        else if (partName.includes("Scania")) brand = "Scania";
        else if (partName.includes("Mack")) brand = "Mack";

        const supplier = faker.helpers.arrayElement(suppliers);
        
        console.log(\`Fetching image for: \${partName}...\`);
        let finalImage = faker.helpers.arrayElement(REALISTIC_PART_IMAGES);
        try {
            const fetchedImage = await fetchPartImage(partName + " truck part transparent");
            if(fetchedImage) finalImage = fetchedImage;
        } catch(e) {}

        const part = await prisma.part.create({
          data: {
            name: partName,
            sku: \`SKU-\${faker.string.alphanumeric(8).toUpperCase()}\`,
            oem: \`OEM-\${faker.number.int({ min: 10000, max: 99999 })}\`,
            categoryId: subCategory.id,
            supplierId: supplier.id,
            price: Number(faker.commerce.price({ min: 1500, max: 85000 })),
            stock: faker.number.int({ min: 5, max: 50 }),
            min_stock: faker.number.int({ min: 2, max: 10 }),
            description: \`High quality surplus B2B truck part imported from Japan/US. Thoroughly inspected and ready for fleet installation. Brand: \${brand}\`,
            image: finalImage,
            compatibleWith: [{ brand, series: "Various", engineCode: "N/A" }]
          }
        });
        parts.push(part);
      }
    }
  }

  console.log("🛒 Creating Transactions, Reviews & Purchase Orders...");
  
  // Create Transactions
  // We want to make sure ALMOST EVERY PART is purchased so it can be reviewed
  const numTransactions = faker.number.int({ min: 120, max: 150 });
  const partPurchasers = {}; // Map partId -> Array of customers who bought it

  for (let t = 0; t < numTransactions; t++) {
    const customer = faker.helpers.arrayElement(customers);
    const orderParts = faker.helpers.arrayElements(parts, faker.number.int({ min: 1, max: 5 }));
    let subtotal = 0;
    
    const items = orderParts.map(p => {
      const quantity = faker.number.int({ min: 1, max: 3 });
      subtotal += (quantity * p.price);
      
      if(!partPurchasers[p.id]) partPurchasers[p.id] = new Set();
      partPurchasers[p.id].add(customer);

      return { partId: p.id, name: p.name, quantity, price: p.price };
    });

    const taxAmount = subtotal * 0.12;
    await prisma.transaction.create({
      data: {
        invoiceNumber: \`INV-\${faker.date.recent().getTime()}-\${faker.number.int({ min: 100, max: 999 })}\`,
        customerName: customer.displayName,
        customerContact: customer.email,
        userId: customer.authId,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        status: faker.helpers.arrayElement(["Pending", "In Transit", "Completed"]),
        transactionDate: faker.date.recent({ days: 30 }),
        items: { create: items }
      }
    });
  }

  // Create Reviews (Varying from 0 to 20 per part)
  for (const part of parts) {
    const buyers = Array.from(partPurchasers[part.id] || []);
    if(buyers.length === 0) continue; // No reviews if not bought

    const numReviews = faker.number.int({ min: 0, max: Math.min(20, buyers.length) });
    const reviewers = faker.helpers.arrayElements(buyers, numReviews);

    for (const reviewer of reviewers) {
      await prisma.review.create({
        data: {
          partId: part.id,
          userId: reviewer.authId,
          userName: reviewer.displayName,
          userEmail: reviewer.email,
          rating: faker.helpers.weightedArrayElement([{weight: 1, value: 3}, {weight: 3, value: 4}, {weight: 6, value: 5}]), 
          body: faker.helpers.arrayElement(ENGLISH_REVIEWS),
          purchaseVerified: true,
          createdAt: faker.date.recent({ days: 20 })
        }
      });
    }
  }

  // Create Purchase Orders (Admin B2B Purchasing Module)
  const poStatuses = ['Draft', 'RFQ Sent', 'Acknowledged', 'In Transit', 'Completed', 'Delayed'];
  for (let i = 0; i < 40; i++) {
    const supplier = faker.helpers.arrayElement(suppliers);
    const orderParts = faker.helpers.arrayElements(parts, faker.number.int({ min: 2, max: 10 }));
    let totalAmount = 0;
    
    const items = orderParts.map(p => {
      const quantity = faker.number.int({ min: 10, max: 100 });
      // Supplier cost is cheaper than retail price
      const unitCost = Number((p.price * faker.number.float({ min: 0.5, max: 0.8 })).toFixed(2));
      totalAmount += (quantity * unitCost);
      return { partId: p.id, quantity, unitCost, totalPrice: quantity * unitCost };
    });

    await prisma.purchaseOrder.create({
      data: {
        poNumber: \`PO-\${faker.string.alphanumeric(6).toUpperCase()}\`,
        supplierId: supplier.id,
        orderDate: faker.date.recent({ days: 60 }),
        expectedDate: faker.date.soon({ days: 15 }),
        status: faker.helpers.arrayElement(poStatuses),
        totalAmount,
        notes: faker.helpers.maybe(() => "Urgent restock needed for upcoming season.", { probability: 0.3 }),
        items: { create: items }
      }
    });
  }

  console.log("✅ Seed completed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
\`

fs.writeFileSync('prisma/seed.js', seedCode);
console.log("seed.js successfully overwritten!");
