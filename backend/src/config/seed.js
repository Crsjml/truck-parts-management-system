// backend/src/config/seed.js
import Category from '../models/Category.js';
import Part from '../models/Part.js';

export async function seedDatabase() {
  try {
    // 2. Seed Categories
    const categoryCount = await Category.countDocuments();
    let seededCategories = {};
    if (categoryCount === 0) {
      console.log('🌱 Seeding default categories...');
      const categoriesToSeed = [
        { name: 'Engine', iconName: 'Engine', colorTheme: 'red' },
        { name: 'Brakes', iconName: 'Brakes', colorTheme: 'blue' },
        { name: 'Transmission', iconName: 'Transmission', colorTheme: 'orange' },
        { name: 'Electrical', iconName: 'Electrical', colorTheme: 'yellow' },
        { name: 'Filters', iconName: 'Filters', colorTheme: 'green' }
      ];

      for (const cat of categoriesToSeed) {
        const doc = await Category.create(cat);
        seededCategories[cat.name] = doc._id;
      }
      console.log('✅ Default categories seeded successfully.');
    } else {
      const existingCats = await Category.find();
      existingCats.forEach(c => {
        seededCategories[c.name] = c._id;
      });
    }

    // 3. Seed Parts
    const partCount = await Part.countDocuments();
    if (partCount === 0 && Object.keys(seededCategories).length > 0) {
      console.log('🌱 Seeding default parts...');
      const partsToSeed = [
        {
          name: 'Piston Ring Set',
          sku: 'ENG-PIS-001',
          oem: 'ME-012345',
          category: seededCategories['Engine'],
          price: 4500.00,
          stock: 12,
          min_stock: 2,
          compatibility: 'Isuzu Elf / 4HF1',
          description: 'High performance piston ring set for heavy-duty engines.'
        },
        {
          name: 'Fuel Injector Nozzle',
          sku: 'ENG-INJ-002',
          oem: 'ME-098765',
          category: seededCategories['Engine'],
          price: 8200.00,
          stock: 8,
          min_stock: 3,
          compatibility: 'Fuso Canter / 4D34',
          description: 'Precision engineered fuel injector nozzle for diesel fuel injection systems.'
        },
        {
          name: 'Front Brake Pads',
          sku: 'BRK-PAD-001',
          oem: 'MC-894567',
          category: seededCategories['Brakes'],
          price: 1800.00,
          stock: 20,
          min_stock: 5,
          compatibility: 'Hino 300 / Dutro',
          description: 'Premium organic front brake pads for commercial trucks.'
        },
        {
          name: 'Brake Booster Assembly',
          sku: 'BRK-BST-002',
          oem: 'MC-112233',
          category: seededCategories['Brakes'],
          price: 9500.00,
          stock: 4,
          min_stock: 1,
          compatibility: 'Isuzu Forward / FSR',
          description: 'Power brake booster assembly for enhanced braking control and safety.'
        },
        {
          name: 'Clutch Plate Assembly',
          sku: 'TRN-CLU-001',
          oem: 'ME-554433',
          category: seededCategories['Transmission'],
          price: 7500.00,
          stock: 15,
          min_stock: 3,
          compatibility: 'Fuso Fighter / 6D16',
          description: 'Heavy-duty clutch plate assembly for smooth gear shifting under heavy loads.'
        },
        {
          name: 'Alternator 24V 80A',
          sku: 'ELE-ALT-001',
          oem: '1-81200-583-0',
          category: seededCategories['Electrical'],
          price: 12500.00,
          stock: 6,
          min_stock: 2,
          compatibility: 'Isuzu Giga / 6WF1',
          description: 'Reliable 24V alternator to support advanced truck electronics.'
        },
        {
          name: 'Oil Filter Heavy Duty',
          sku: 'FLT-OIL-001',
          oem: 'LF-16015',
          category: seededCategories['Filters'],
          price: 650.00,
          stock: 50,
          min_stock: 10,
          compatibility: 'Universal Cummins Engine',
          description: 'Spin-on heavy-duty lube filter designed to handle soot and contaminants.'
        }
      ];

      await Part.insertMany(partsToSeed);
      console.log('✅ Default parts seeded successfully.');
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  }
}
