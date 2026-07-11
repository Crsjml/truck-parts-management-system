// backend/src/models/StockAdjustment.js
import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true
    },
    oldStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    difference: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Optimize query performance for a specific part
stockAdjustmentSchema.index({ partId: 1, createdAt: -1 });

export default mongoose.model('StockAdjustment', stockAdjustmentSchema);
