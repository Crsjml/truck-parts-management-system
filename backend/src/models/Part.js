// backend/src/models/Part.js
import mongoose from 'mongoose';

const partSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    sku:           { type: String, required: true, unique: true, trim: true },
    oem:           { type: String, trim: true, default: '' },
    category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price:         { type: Number, required: true, min: 0 },
    stock:         { type: Number, required: true, min: 0, default: 0 },
    min_stock:     { type: Number, required: true, min: 0, default: 0 },
    compatibility: { type: String, trim: true, default: '' },
    description:   { type: String, trim: true, default: '' },
    image:         { type: String, default: '' }, // Base64 data url string
    published:     { type: Boolean, default: true },  // visible on customer storefront
    archived:      { type: Boolean, default: false }   // soft-delete flag
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Search optimization indices
partSchema.index({ category: 1 });
partSchema.index({ archived: 1, published: 1 });
partSchema.index({ name: 'text', sku: 'text', compatibility: 'text' });

export default mongoose.model('Part', partSchema);
