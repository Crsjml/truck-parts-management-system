// backend/src/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env vars are loaded cleanly using absolute path resolution
dotenv.config({ path: path.resolve(__dirname, "../../../atlas-credentials.env") });

export async function connectDB() {
  try {
    let uri = process.env.MONGODB_URI;
    const isDocker = fs.existsSync('/.dockerenv');
    const defaultLocal = isDocker ? 'mongodb://mongo:27017/truck_parts' : 'mongodb://127.0.0.1:27017/truck_parts';

    if (!uri) {
      console.warn(`⚠️  Warning: MONGODB_URI not defined in environment. Falling back to local MongoDB: ${defaultLocal}`);
      uri = defaultLocal;
    } else if (/<username>|<password>|<db_username>|<db_password>/.test(uri)) {
      console.warn("⚠️  Warning: MONGODB_URI in `atlas-credentials.env` contains placeholder credentials (<username>, <password>, etc.).");
      console.warn(`⚠️  Falling back to local MongoDB instance: ${defaultLocal}`);
      uri = defaultLocal;
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Mask password in logs for security
    const maskedUri = uri.replace(/:([^@:]+)@/, ':****@');
    console.log(`✅ MongoDB connected successfully to: ${maskedUri}`);

    // Seed database with default admin/users/categories/parts if empty
    const { seedDatabase } = await import('./seed.js');
    await seedDatabase();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

