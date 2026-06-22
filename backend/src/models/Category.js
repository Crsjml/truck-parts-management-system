// backend/src/models/Category.js
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, unique: true, trim: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    iconName:       { type: String, default: null },
    colorTheme:     { type: String, default: null }
  },
  { timestamps: true }
);

// Index parent category for fast hierarchical tree building
categorySchema.index({ parentCategory: 1 });

export default mongoose.model('Category', categorySchema);
