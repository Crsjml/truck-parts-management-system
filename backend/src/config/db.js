// backend/src/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

// Ensure env vars are loaded (in case env loader not imported elsewhere)
dotenv.config({ path: "../../../../atlas-credentials.env" });

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI not defined in environment");
    }
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}
