import './config/env.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Supplier from './models/Supplier.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import Part from './models/Part.js';
import Category from './models/Category.js';

const seedPurchasingData = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting Purchasing Module Data Seed...');

    // Ensure we have some categories
    const categories = await Category.find();
    if (categories.length === 0) {
      console.log('No categories found. Please run regular seed first.');
      process.exit(1);
    }

    // 1. Create 10 Suppliers
    console.log('Creating suppliers...');
    await Supplier.deleteMany({});
    
    const supplierData = [
      { name: 'Manila Heavy Duty Parts Corp.', type: 'Company', contactPerson: 'Juan Dela Cruz', email: 'sales@manilaheavyparts.ph', phone: '+63 2 8123 4567', address: 'Quezon City, Metro Manila', country: 'Philippines', paymentTerms: 'Net 30' },
      { name: 'Cebu Truck Components Inc.', type: 'Company', contactPerson: 'Maria Santos', email: 'orders@cebutrucks.ph', phone: '+63 32 234 5678', address: 'Mandaue City, Cebu', country: 'Philippines', paymentTerms: 'Net 60' },
      { name: 'Davao Diesel Supply', type: 'Company', contactPerson: 'Carlos Reyes', email: 'supply@davaodiesel.com.ph', phone: '+63 82 222 3333', address: 'Davao City, Davao del Sur', country: 'Philippines', paymentTerms: 'Net 30' },
      { name: 'Luzon Commercial Vehicle Systems', type: 'Company', contactPerson: 'Grace Lim', email: 'auto@luzoncvs.ph', phone: '+63 45 322 1111', address: 'San Fernando, Pampanga', country: 'Philippines', paymentTerms: 'Net 45' },
      { name: 'Visayas Freight Parts Solutions', type: 'Company', contactPerson: 'Pedro Garcia', email: 'sales@visayasfreight.ph', phone: '+63 33 333 4444', address: 'Iloilo City, Iloilo', country: 'Philippines', paymentTerms: 'Net 30' },
      { name: 'Tarlac Auto & Engine Supply', type: 'Company', contactPerson: 'Jose Bautista', email: 'parts.tarlac@taes.ph', phone: '+63 45 982 7777', address: 'Tarlac City, Tarlac', country: 'Philippines', paymentTerms: 'Net 30' },
      { name: 'Mindanao Motors & Gear', type: 'Company', contactPerson: 'Ana Fernandez', email: 'supply@mindanaomotors.ph', phone: '+63 88 856 5111', address: 'Cagayan de Oro, Misamis Oriental', country: 'Philippines', paymentTerms: 'Net 30' },
      { name: 'PhilTruck Brake & Control Systems', type: 'Company', contactPerson: 'Elena Cruz', email: 'sales@philtruck.ph', phone: '+63 2 8663 9800', address: 'Makati City, Metro Manila', country: 'Philippines', paymentTerms: 'Net 60' },
      { name: 'Makati Parts Hub', type: 'Company', contactPerson: 'Kenji Yamamoto', email: 'orders@makatiparts.ph', phone: '+63 2 8566 2555', address: 'Makati City, Metro Manila', country: 'Philippines', paymentTerms: 'Net 45' },
      { name: 'Batangas Transmission Experts', type: 'Company', contactPerson: 'Roberto Wilson', email: 'parts@batangastransmission.ph', phone: '+63 43 723 5283', address: 'Batangas City, Batangas', country: 'Philippines', paymentTerms: 'Net 30' }
    ];

    const insertedSuppliers = await Supplier.insertMany(supplierData);
    console.log(`✅ Created ${insertedSuppliers.length} suppliers.`);

    // 2. Fetch Parts to use in POs
    const parts = await Part.find().limit(15);
    if (parts.length === 0) {
      console.log('No parts found in the database. Please create parts first before seeding purchase orders.');
      process.exit(1);
    }

    // Helper: Random item from array
    const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    // Helper: Random integer
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    // Helper: Random date between start and end
    const randDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    // 3. Create 15 Purchase Orders
    console.log('Creating purchase orders...');
    await PurchaseOrder.deleteMany({});

    const statuses = ['Draft', 'RFQ Sent', 'Confirmed', 'Received', 'Cancelled'];
    const now = new Date();
    const pastMonth = new Date(now);
    pastMonth.setMonth(now.getMonth() - 2);

    const pos = [];

    for (let i = 1; i <= 15; i++) {
      const supplier = randItem(insertedSuppliers);
      const status = randItem(statuses);
      
      // Determine dates based on status
      const orderDate = randDate(pastMonth, now);
      
      // Delivery expected typically 7-30 days after order
      const expectedDeliveryDate = new Date(orderDate);
      expectedDeliveryDate.setDate(orderDate.getDate() + randInt(7, 30));

      let confirmationDate = null;
      let updatedAt = new Date(orderDate);

      if (['Confirmed', 'Received', 'Cancelled'].includes(status)) {
        confirmationDate = new Date(orderDate);
        confirmationDate.setDate(orderDate.getDate() + randInt(1, 5));
        updatedAt = confirmationDate;
      }
      
      if (status === 'Received') {
        updatedAt = expectedDeliveryDate; // assuming it arrived on time or slightly late
        if (Math.random() > 0.8) {
           // Simulate late delivery
           updatedAt.setDate(updatedAt.getDate() + randInt(1, 10));
        }
      }

      // Late RFQ logic: make some expected delivery dates in the past while status is Draft or RFQ Sent
      if ((status === 'Draft' || status === 'RFQ Sent') && i % 4 === 0) {
        expectedDeliveryDate.setDate(now.getDate() - randInt(1, 10)); 
      }

      // Not Acknowledged logic: RFQ Sent more than 7 days ago
      if (status === 'RFQ Sent' && i % 5 === 0) {
        updatedAt.setDate(now.getDate() - 10);
      }

      // Billing status
      const billingStatus = (status === 'Received' && Math.random() > 0.5) ? 'Bills Received' : 'Waiting Bills';

      // Select 1-3 random parts
      const poParts = [];
      const numItems = randInt(1, 3);
      for(let j=0; j<numItems; j++) {
         const p = randItem(parts);
         if (!poParts.find(xp => xp.partId === p._id)) poParts.push(p);
      }

      let totalAmount = 0;
      const items = poParts.map(p => {
        const qty = randInt(5, 50);
        // Unit price is somewhat close to selling price, maybe 30% cheaper
        const unitPrice = Math.round(p.price * 0.7);
        const subtotal = qty * unitPrice;
        totalAmount += subtotal;
        return {
          partId: p._id,
          name: p.name,
          sku: p.sku,
          quantity: qty,
          unitPrice,
          subtotal
        };
      });

      const dateStr = orderDate.toISOString().slice(0, 10).replace(/-/g, '');
      const poNumber = `PO-${dateStr}-${i.toString().padStart(4, '0')}`;

      pos.push({
        poNumber,
        supplier: supplier._id,
        items,
        totalAmount,
        status,
        billingStatus,
        sourceRfq: Math.random() > 0.5 ? `RFQ-SRC-${randInt(100, 999)}` : '',
        createdBy: 'Admin',
        confirmationDate,
        orderDate,
        expectedDeliveryDate,
        notes: Math.random() > 0.7 ? 'Urgent order for upcoming maintenance.' : '',
        createdAt: orderDate,
        updatedAt
      });
    }

    const insertedPOs = await PurchaseOrder.insertMany(pos);
    console.log(`✅ Created ${insertedPOs.length} purchase orders in various statuses.`);

    console.log('🎉 Seed complete! Enjoy testing your new Purchasing Module.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedPurchasingData();
