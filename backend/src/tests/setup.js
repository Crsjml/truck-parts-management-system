import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load from atlas-credentials.env
dotenv.config({ path: path.resolve(process.cwd(), '../atlas-credentials.env') });

export const setupTestDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in atlas-credentials.env');
  }
  
  // Connect to the actual Atlas DB
  await mongoose.connect(uri);
};

export const teardownTestDB = async () => {
  await mongoose.disconnect();
};

export const clearTestDB = async () => {
  // DO NOT drop collections in the actual Atlas DB.
  // Instead, the tests will be responsible for cleaning up their specific dummy data.
};
