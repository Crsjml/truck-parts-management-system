import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-service-account.json'), 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || 'ttp-mgmt-sys',
});

const accountsToSeed = [
  {
    email: 'admin@tarlactruckparts.local',
    password: 'Admin@12345',
    displayName: 'System Admin',
    emailVerified: true,
  },
  {
    email: 'lionel.messi@example.com',
    password: 'Player@12345',
    displayName: 'Lionel Messi',
    emailVerified: true,
  },
  {
    email: 'cristiano.ronaldo@example.com',
    password: 'Player@12345',
    displayName: 'Cristiano Ronaldo',
    emailVerified: true,
  },
  {
    email: 'kylian.mbappe@example.com',
    password: 'Player@12345',
    displayName: 'Kylian Mbappe',
    emailVerified: true,
  },
  {
    email: 'erling.haaland@example.com',
    password: 'Player@12345',
    displayName: 'Erling Haaland',
    emailVerified: true,
  },
  {
    email: 'vinicius.junior@example.com',
    password: 'Player@12345',
    displayName: 'Vinicius Junior',
    emailVerified: true,
  }
];

async function seedFirebaseUsers() {
  console.log('🌱 Starting Firebase Auth Seed...');
  
  for (const account of accountsToSeed) {
    try {
      // Check if user already exists
      const userRecord = await admin.auth().getUserByEmail(account.email).catch(() => null);
      
      if (userRecord) {
        console.log(`⚠️ User ${account.email} already exists. Updating properties...`);
        await admin.auth().updateUser(userRecord.uid, {
          password: account.password,
          displayName: account.displayName,
          emailVerified: account.emailVerified,
        });
        console.log(`✅ Updated ${account.email}`);
      } else {
        await admin.auth().createUser({
          email: account.email,
          password: account.password,
          displayName: account.displayName,
          emailVerified: account.emailVerified,
        });
        console.log(`✅ Created ${account.email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to seed ${account.email}: ${err.message}`);
    }
  }
  
  console.log('🎉 Firebase Seed Complete!');
  process.exit(0);
}

seedFirebaseUsers();
