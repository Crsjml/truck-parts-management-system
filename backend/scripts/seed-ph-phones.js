import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PH_MOBILE_PREFIXES = [
  '917', '918', '919', '920', '921', '927', '928', '939', 
  '945', '956', '966', '977', '995', '915', '922', '932'
];

function generatePHMobile(index = 0) {
  const prefix = PH_MOBILE_PREFIXES[index % PH_MOBILE_PREFIXES.length];
  const mid = String(Math.floor(100 + Math.random() * 900)).padStart(3, '0');
  const end = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0');
  return `+63 ${prefix} ${mid} ${end}`;
}

function generatePHLandline(index = 0) {
  const mid = String(Math.floor(100 + Math.random() * 900)).padStart(3, '0');
  const end = String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0');
  return `+63 (2) 8${mid} ${end}`;
}

function isValidPHPhone(phone) {
  if (!phone) return false;
  const stripped = phone.replace(/\s+/g, '');
  return /^(\+63|0)[0-9]{10}$/.test(stripped);
}

function formatToStandardPH(phone) {
  const stripped = phone.replace(/\s+/g, '');
  if (stripped.startsWith('0') && stripped.length === 11) {
    const prefix = stripped.slice(1, 4);
    const mid = stripped.slice(4, 7);
    const end = stripped.slice(7);
    return `+63 ${prefix} ${mid} ${end}`;
  }
  if (stripped.startsWith('+63') && stripped.length === 13) {
    const prefix = stripped.slice(3, 6);
    const mid = stripped.slice(6, 9);
    const end = stripped.slice(9);
    return `+63 ${prefix} ${mid} ${end}`;
  }
  return phone;
}

async function main() {
  console.log("🇵><🇵 Starting local Philippine contact seeding...");

  // 1. Update Customers
  const customers = await prisma.customer.findMany();
  console.log(`\nFound ${customers.length} customers in database.`);
  let customerUpdatedCount = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    let newPhone = customer.phoneNumber;

    if (isValidPHPhone(customer.phoneNumber)) {
      newPhone = formatToStandardPH(customer.phoneNumber);
      if (newPhone === customer.phoneNumber) {
        console.log(`[Customer] Skipping ${customer.email} (already valid PH number: ${customer.phoneNumber})`);
        continue;
      }
    } else {
      newPhone = generatePHMobile(i);
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { phoneNumber: newPhone }
    });
    console.log(`[Customer] Updated ${customer.email}: ${customer.phoneNumber || 'EMPTY'} -> ${newPhone}`);
    customerUpdatedCount++;
  }

  // 2. Update Suppliers
  const suppliers = await prisma.supplier.findMany();
  console.log(`\nFound ${suppliers.length} suppliers in database.`);
  let supplierUpdatedCount = 0;

  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i];
    let newPhone = supplier.phone;

    if (isValidPHPhone(supplier.phone) || (supplier.phone && supplier.phone.startsWith('+63 (2)'))) {
      console.log(`[Supplier] Skipping ${supplier.name} (already valid PH number: ${supplier.phone})`);
      continue;
    }

    newPhone = (i % 2 === 0) ? generatePHLandline(i) : generatePHMobile(i);

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { phone: newPhone }
    });
    console.log(`[Supplier] Updated ${supplier.name}: ${supplier.phone || 'EMPTY'} -> ${newPhone}`);
    supplierUpdatedCount++;
  }

  console.log(`\n✅ Seeding complete! Updated ${customerUpdatedCount} customers and ${supplierUpdatedCount} suppliers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
