// backend/src/models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Part reference (MongoDB)
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true,
    index: true
  },
  // Firebase identity bridge — store UID + cached display info at write-time
  userId:    { type: String, required: true, index: true }, // Firebase UID
  userName:  { type: String, required: true, default: 'Anonymous' },
  userEmail: { type: String, default: '' },

  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  body: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },

  // Verification: was this reviewer a verified purchaser?
  purchaseVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true  // createdAt, updatedAt
});

// Compound index: one review per user per part
reviewSchema.index({ partId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
