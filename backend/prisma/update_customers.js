import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const phCompanies = [
  "Manila Freight Co.",
  "Cebu Logistics Inc.",
  "Davao Haulers Corp.",
  "Baguio Transit Lines",
  "Makati Heavy Equipment"
];

const phAddresses = [
  { label: "Main Warehouse", fullAddress: "123 Port Area, Manila, 1018 Metro Manila", isDefaultShipping: true, isDefaultBilling: true },
  { label: "Office", fullAddress: "45 Ayala Avenue, Makati City, 1226 Metro Manila", isDefaultShipping: true, isDefaultBilling: true },
  { label: "Depot", fullAddress: "88 Mactan Road, Lapu-Lapu City, 6015 Cebu", isDefaultShipping: true, isDefaultBilling: true },
  { label: "Storage", fullAddress: "12 Lanang, Davao City, 8000 Davao del Sur", isDefaultShipping: true, isDefaultBilling: true },
  { label: "Garage", fullAddress: "Session Road, Baguio City, 2600 Benguet", isDefaultShipping: true, isDefaultBilling: true }
];

async function main() {
  console.log("Starting append-only customer update...");
  
  // Find all customers
  const customers = await prisma.customer.findMany({
    include: {
      addresses: true
    }
  });

  console.log(`Found ${customers.length} customers.`);

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    // Only update if they don't have a company name or addresses
    if (!customer.companyName || customer.addresses.length === 0) {
      console.log(`Updating customer: ${customer.email}...`);
      
      const randomCompany = phCompanies[i % phCompanies.length];
      const randomAddress = phAddresses[i % phAddresses.length];

      // Update customer with company name
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          companyName: customer.companyName || randomCompany,
        }
      });

      // Add address if none exist
      if (customer.addresses.length === 0) {
        await prisma.customerAddress.create({
          data: {
            customerId: customer.id,
            label: randomAddress.label,
            fullAddress: randomAddress.fullAddress,
            isDefaultShipping: randomAddress.isDefaultShipping,
            isDefaultBilling: randomAddress.isDefaultBilling
          }
        });
      }
      console.log(`Updated ${customer.email} with ${randomCompany}`);
    } else {
      console.log(`Skipping ${customer.email} (already has B2B context)`);
    }
  }

  console.log("Customer update completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
