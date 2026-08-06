import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── GET my reviews ──────────────────────────────────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const reviews = await prisma.review.findMany({
      where: { userId },
      select: { id: true, partId: true, rating: true, body: true }
    });
    res.json({ reviews });
  } catch (err) {
    console.error('[get my reviews]', err);
    res.status(500).json({ msg: 'Server error fetching my reviews' });
  }
});

// ── GET all reviews for a part ──────────────────────────────────────────────
router.get('/:partId', async (req, res) => {
  try {
    const { partId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { partId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Attach customer avatars + display names (best-effort)
    const userIds = [...new Set(reviews.map(r => r.userId))];
    const customers = await prisma.customer.findMany({
      where: { authId: { in: userIds } },
      select: { authId: true, photoURL: true, displayName: true }
    });
    const customerMap = Object.fromEntries(customers.map(c => [c.authId, c]));
    const reviewsWithAvatar = reviews.map(r => ({
      ...r,
      userAvatar: customerMap[r.userId]?.photoURL || null,
      userDisplayName: customerMap[r.userId]?.displayName || null
    }));

    // Calculate aggregate score
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    res.json({
      reviews: reviewsWithAvatar,
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

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    // Check if part exists
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      return res.status(404).json({ msg: 'Part not found' });
    }

    // Check if user already reviewed this part
    const existingReview = await prisma.review.findUnique({
      where: {
        partId_userId: { partId, userId }
      }
    });
    
    if (existingReview) {
      return res.status(409).json({ msg: 'You have already reviewed this part' });
    }

    // Verify purchase
    // A purchase is verified if the user has a transaction containing this partId
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId,
        items: {
          some: { partId }
        }
      }
    });

    const purchaseVerified = !!transaction;

    const review = await prisma.review.create({
      data: {
        partId,
        userId,
        userName,
        userEmail,
        rating,
        body: body ? body.trim().substring(0, 1000) : '',
        purchaseVerified
      }
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ msg: 'You have already reviewed this part' });
    }
    console.error('[create review]', err);
    res.status(500).json({ msg: 'Server error creating review' });
  }
});

// ── PATCH a review ──────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, body } = req.body;
    const userId = req.auth.userId;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ msg: 'Unauthorized to edit this review' });
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating,
        body: body ? body.trim().substring(0, 1000) : ''
      }
    });

    res.json(updatedReview);
  } catch (err) {
    console.error('[update review]', err);
    res.status(500).json({ msg: 'Server error updating review' });
  }
});

// ── DELETE a review ──────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ msg: 'Review not found' });
    }

    // Only the author can delete
    if (review.userId !== userId) {
      return res.status(403).json({ msg: 'Unauthorized to delete this review' });
    }

    await prisma.review.delete({ where: { id } });
    res.json({ msg: 'Review deleted successfully' });
  } catch (err) {
    console.error('[delete review]', err);
    res.status(500).json({ msg: 'Server error deleting review' });
  }
});

export default router;
