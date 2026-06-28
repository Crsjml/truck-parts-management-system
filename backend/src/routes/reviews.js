import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Transaction from '../models/Transaction.js';
import Part from '../models/Part.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── GET all reviews for a part ──────────────────────────────────────────────
router.get('/:partId', async (req, res) => {
  try {
    const { partId } = req.params;
    
    if (!mongoose.isValidObjectId(partId)) {
      return res.status(400).json({ msg: 'Invalid part ID format' });
    }

    const reviews = await Review.find({ partId }).sort({ createdAt: -1 });
    
    // Calculate aggregate score
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    res.json({
      reviews,
      stats: {
        totalReviews,
        averageRating: Number(averageRating)
      }
    });
  } catch (err) {
    console.error('[get reviews]', err);
    res.status(500).json({ msg: 'Server error fetching reviews' });
  }
});

// ── POST a new review ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { partId, rating, body } = req.body;
    const userId = req.auth.userId;
    const userName = req.auth.name || req.auth.email?.split('@')[0] || 'Anonymous';
    const userEmail = req.auth.email || '';

    if (!mongoose.isValidObjectId(partId)) {
      return res.status(400).json({ msg: 'Invalid part ID format' });
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    // Check if part exists
    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({ msg: 'Part not found' });
    }

    // Check if user already reviewed this part
    const existingReview = await Review.findOne({ partId, userId });
    if (existingReview) {
      return res.status(409).json({ msg: 'You have already reviewed this part' });
    }

    // Verify purchase
    // A purchase is verified if the user has a transaction containing this partId
    const userTransactions = await Transaction.find({ userId });
    let purchaseVerified = false;
    
    for (const tx of userTransactions) {
      if (tx.items.some(item => item.partId.toString() === partId.toString())) {
        purchaseVerified = true;
        break;
      }
    }

    const review = await Review.create({
      partId,
      userId,
      userName,
      userEmail,
      rating,
      body: body ? body.trim().substring(0, 1000) : '',
      purchaseVerified
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ msg: 'You have already reviewed this part' });
    }
    console.error('[create review]', err);
    res.status(500).json({ msg: 'Server error creating review' });
  }
});

// ── DELETE a review ──────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: 'Invalid review ID format' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Only the author (or an admin, but we'll stick to author for now) can delete
    if (review.userId !== userId) {
      return res.status(403).json({ msg: 'Unauthorized to delete this review' });
    }

    await Review.deleteOne({ _id: id });
    res.json({ msg: 'Review deleted successfully' });
  } catch (err) {
    console.error('[delete review]', err);
    res.status(500).json({ msg: 'Server error deleting review' });
  }
});

export default router;
