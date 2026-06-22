import mongoose from 'mongoose';
import Part from './backend/src/models/Part.js';
import Category from './backend/src/models/Category.js';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/truck_parts_management');
  const parts = await Part.find().limit(3);
  console.log('Parts:', parts);
  const cats = await Category.find();
  console.log('Categories:', cats);
  process.exit(0);
}
check();
