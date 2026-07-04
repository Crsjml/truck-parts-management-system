import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB } from './setup.js';
import Review from '../models/Review.js';

test('Reviews API Integration Tests (Atlas DB)', async (t) => {
  await setupTestDB();

  const createdReviewIds = [];

  t.after(async () => {
    if (createdReviewIds.length > 0) {
      await Review.deleteMany({ _id: { $in: createdReviewIds } });
    }
    await teardownTestDB();
  });

  await t.test('GET /api/reviews/:partId - should fetch reviews for a part', async () => {
    const partId = '663a8a3a2a4f4c6e9a6e1234'; // Dummy part ID

    const r1 = await Review.create({
      partId,
      userId: 'user123',
      userName: 'TEST_John Doe',
      rating: 5,
      comment: 'TEST_Excellent part!'
    });
    createdReviewIds.push(r1._id);

    const r2 = await Review.create({
      partId,
      userId: 'user456',
      userName: 'TEST_Jane Smith',
      rating: 4,
      comment: 'TEST_Good part.'
    });
    createdReviewIds.push(r2._id);

    const res = await request(app).get(`/api/reviews/${partId}`);
    
    // We expect 200, and we expect it to return the reviews for our dummy partId.
    // It should ONLY return the ones matching partId.
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.reviews.length, 2);
    
    // Verify names
    const names = res.body.reviews.map(r => r.userName);
    assert.ok(names.includes('TEST_John Doe'));
    assert.ok(names.includes('TEST_Jane Smith'));
  });

  await t.test('POST /api/reviews - should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({
        partId: '663a8a3a2a4f4c6e9a6e1234',
        rating: 5,
        comment: 'TEST_Great!'
      });
    
    assert.strictEqual(res.statusCode, 401);
  });
});
