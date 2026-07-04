import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import Models
import Part from '../src/models/Part.js';
import Transaction from '../src/models/Transaction.js';
import Review from '../src/models/Review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../atlas-credentials.env') });

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-service-account.json'), 'utf8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'ttp-mgmt-sys',
  });
}

const seedEmails = [
  'lionel.messi@example.com',
  'cristiano.ronaldo@example.com',
  'kylian.mbappe@example.com',
  'erling.haaland@example.com',
  'vinicius.junior@example.com'
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB connected.');

    // Fetch Firebase Users
    console.log('Fetching Firebase users...');
    const listUsersResult = await admin.auth().listUsers(100);
    const users = listUsersResult.users.filter(u => seedEmails.includes(u.email));
    
    if (users.length === 0) {
      console.log('No seed users found in Firebase. Please run seed_firebase.js first.');
      process.exit(0);
    }

    // Fetch Parts
    console.log('Fetching catalog parts...');
    const parts = await Part.find({});
    if (parts.length < 3) {
      console.log('Not enough parts in catalog to seed. Run seed.js first.');
      process.exit(0);
    }

    let txCount = 0;
    let revCount = 0;

    for (const user of users) {
      console.log(`Seeding data for ${user.email}...`);
      
      // Select 3 random parts
      const shuffledParts = parts.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      const items = shuffledParts.map(p => ({
        partId: p._id,
        name: p.name,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: p.price
      }));

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxAmount = subtotal * 0.12;
      const total = subtotal + taxAmount;

      // 1. Create Transaction
      const tx = new Transaction({
        invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerName: user.displayName || user.email.split('@')[0],
        customerEmail: user.email,
        customerContact: '+1234567890',
        userId: user.uid,
        items,
        discount: 0,
        tax: 12,
        subtotal,
        taxAmount,
        total,
        paymentMethod: 'Credit Card',
        status: 'Completed',
        type: 'Sale'
      });

      await tx.save();
      txCount++;

      // 2. Create Reviews for those parts
      for (const item of items) {
        // Check if review already exists
        const existingReview = await Review.findOne({ partId: item.partId, userId: user.uid });
        if (!existingReview) {
          const review = new Review({
            partId: item.partId,
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            userEmail: user.email,
            rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
            body: `Excellent product! The ${item.name} works perfectly on my truck. Fast shipping and great quality. Highly recommended!`,
            purchaseVerified: true
          });
          await review.save();
          revCount++;
        }
      }
    }

    console.log('--- SEED COMPLETE ---');
    console.log(`Created ${txCount} transactions.`);
    console.log(`Created ${revCount} reviews.`);

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

seedData();
