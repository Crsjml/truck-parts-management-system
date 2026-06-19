// backend/src/models/Part.js
import mongoose from 'mongoose';

const partSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    sku:           { type: String, required: true, unique: true, trim: true },
    oem:           { type: String, trim: true, default: '' },
    category:      { type: String, required: true, trim: true },
    price:         { type: Number, required: true, min: 0 },
    stock:         { type: Number, required: true, min: 0, default: 0 },
    min_stock:     { type: Number, required: true, min: 0, default: 0 },
    compatibility: { type: String, trim: true, default: '' },
    description:   { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Part', partSchema);
