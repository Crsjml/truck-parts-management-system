import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Part from './src/models/Part.js';
import Supplier from './src/models/Supplier.js';
import PurchaseOrder from './src/models/PurchaseOrder.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/ttp-db?authSource=admin';

const seedPurchaseOrders = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const parts = await Part.find().limit(5);
    const supplier = await Supplier.findOne();

    if (parts.length === 0 || !supplier) {
      console.log('No parts or suppliers found. Please add them first.');
      process.exit(1);
    }

    const pos = [
      {
        poNumber: `MOCK-PO-${Date.now()}-1`,
        supplier: supplier._id,
        items: [
          { partId: parts[0]._id, name: parts[0].name, quantity: 20, unitPrice: parts[0].price, subtotal: parts[0].price * 20 }
        ],
        totalAmount: parts[0].price * 20,
        status: 'Received',
        billingStatus: 'Waiting Bills',
        createdBy: 'Cris Dela Cruz',
      },
      {
        poNumber: `MOCK-PO-${Date.now()}-2`,
        supplier: supplier._id,
        items: [
          { partId: parts[1]._id, name: parts[1].name, quantity: 12, unitPrice: parts[1].price, subtotal: parts[1].price * 12 }
        ],
        totalAmount: parts[1].price * 12,
        status: 'Received',
        billingStatus: 'Waiting Bills',
        createdBy: 'Cris Dela Cruz',
      },
      {
        poNumber: `MOCK-PO-${Date.now()}-3`,
        supplier: supplier._id,
        items: [
          { partId: parts[2]._id, name: parts[2].name, quantity: 15, unitPrice: parts[2].price, subtotal: parts[2].price * 15 },
          { partId: parts[3]._id, name: parts[3].name, quantity: 8, unitPrice: parts[3].price, subtotal: parts[3].price * 8 }
        ],
        totalAmount: (parts[2].price * 15) + (parts[3].price * 8),
        status: 'Received',
        billingStatus: 'Waiting Bills',
        createdBy: 'Cris Dela Cruz',
      }
    ];

    await PurchaseOrder.insertMany(pos);
    console.log('Mock Purchase Orders inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedPurchaseOrders();
