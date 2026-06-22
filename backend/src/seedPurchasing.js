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
      { name: 'Cummins Inc.', type: 'Company', contactPerson: 'John Smith', email: 'sales@cummins.com', phone: '+1 800-286-6467', address: 'Columbus, IN', country: 'United States', paymentTerms: 'Net 30' },
      { name: 'Volvo Trucks Global', type: 'Company', contactPerson: 'Sven Svensson', email: 'parts@volvo.com', phone: '+46 31 66 80 00', address: 'Gothenburg, Sweden', country: 'Sweden', paymentTerms: 'Net 60' },
      { name: 'Bendix Commercial Vehicle Systems', type: 'Company', contactPerson: 'Michael Johnson', email: 'orders@bendix.com', phone: '+1 800-247-2725', address: 'Avon, OH', country: 'United States', paymentTerms: 'Net 30' },
      { name: 'Bosch Automotive Aftermarket', type: 'Company', contactPerson: 'Klaus Müller', email: 'auto@bosch.com', phone: '+49 711 811 0', address: 'Gerlingen, Germany', country: 'Germany', paymentTerms: 'Net 45' },
      { name: 'Meritor Heavy Vehicle Systems', type: 'Company', contactPerson: 'Sarah Davis', email: 'sales@meritor.com', phone: '+1 866-668-7221', address: 'Troy, MI', country: 'United States', paymentTerms: 'Net 30' },
      { name: 'Daimler Truck Asia', type: 'Company', contactPerson: 'Kenji Sato', email: 'parts.asia@daimler.com', phone: '+81 44-330-7700', address: 'Kawasaki, Japan', country: 'Japan', paymentTerms: 'Net 30' },
      { name: 'Hino Motors Parts', type: 'Company', contactPerson: 'Tanaka Hiroshi', email: 'supply@hino.co.jp', phone: '+81 42-586-5111', address: 'Hino, Tokyo', country: 'Japan', paymentTerms: 'Net 30' },
      { name: 'WABCO Vehicle Control Systems', type: 'Company', contactPerson: 'Elena Rossi', email: 'sales@wabco.com', phone: '+32 2 663 98 00', address: 'Brussels, Belgium', country: 'Belgium', paymentTerms: 'Net 60' },
      { name: 'Denso Commercial', type: 'Company', contactPerson: 'Yamamoto Ken', email: 'orders@denso.co.jp', phone: '+81 566-25-5511', address: 'Kariya, Aichi', country: 'Japan', paymentTerms: 'Net 45' },
      { name: 'Allison Transmission', type: 'Company', contactPerson: 'Robert Wilson', email: 'parts@allisontransmission.com', phone: '+1 800-252-5283', address: 'Indianapolis, IN', country: 'United States', paymentTerms: 'Net 30' }
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
