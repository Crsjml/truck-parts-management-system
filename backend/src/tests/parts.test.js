import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB } from './setup.js';
import Category from '../models/Category.js';
import Part from '../models/Part.js';

test('Parts API Integration Tests (Atlas DB)', async (t) => {
  await setupTestDB();

  // Keep track of IDs to delete later so we don't pollute the live DB
  const createdPartIds = [];
  const createdCategoryIds = [];

  t.after(async () => {
    // Clean up ONLY the data created by this test
    if (createdPartIds.length > 0) {
      await Part.deleteMany({ _id: { $in: createdPartIds } });
    }
    if (createdCategoryIds.length > 0) {
      await Category.deleteMany({ _id: { $in: createdCategoryIds } });
    }
    await teardownTestDB();
  });

  await t.test('POST /api/parts - should return 400 for missing auth/invalid payload (validates route)', async () => {
    const res = await request(app)
      .post('/api/parts')
      .send({
        name: 'Brake Pad',
        sku: 'BRK-123',
        price: 50,
        stock: 10,
        minStock: 2
      });
    
    // Auth middleware protects this route, or validation fails.
    // If it returns 400 or 401, it means the API is responsive.
    assert.ok(res.statusCode === 400 || res.statusCode === 401);
  });

  await t.test('GET /api/parts - should fetch seeded parts and filter correctly', async () => {
    const cat = await Category.create({ name: 'TEST_Brakes_Category', parentCategory: null });
    createdCategoryIds.push(cat._id);
    
    const part1 = await Part.create({
      name: 'TEST_Ceramic Brake Pad',
      sku: 'TEST_BRK-CER-1',
      category: cat._id,
      price: 100,
      stock: 5,
      min_stock: 2,
      published: true,
      compatibleWith: [{ brand: 'Isuzu', series: 'ELF' }]
    });
    createdPartIds.push(part1._id);

    const part2 = await Part.create({
      name: 'TEST_Universal Wiper',
      sku: 'TEST_WPR-UNV',
      category: cat._id,
      price: 15,
      stock: 50,
      min_stock: 10,
      published: true,
      compatibleWith: [{ brand: 'Universal', series: '' }]
    });
    createdPartIds.push(part2._id);

    // Fetch all parts
    const resAll = await request(app).get('/api/parts');
    assert.strictEqual(resAll.statusCode, 200);
    assert.ok(resAll.body.length >= 2); // Might have real parts too

    // Fetch by Category filter
    const resCat = await request(app).get('/api/parts?category=TEST_Brakes_Category');
    assert.strictEqual(resCat.statusCode, 200);
    // Should contain our dummy part
    const hasBrake = resCat.body.some(p => p.sku === 'TEST_BRK-CER-1');
    assert.ok(hasBrake);

    // Fetch by Search filter
    const resSearch = await request(app).get('/api/parts?search=TEST_Ceramic');
    assert.strictEqual(resSearch.statusCode, 200);
    assert.ok(resSearch.body.some(p => p.sku === 'TEST_BRK-CER-1'));

    // Filter by Brand = Isuzu
    const resIsuzu = await request(app).get('/api/parts?brand=Isuzu');
    assert.strictEqual(resIsuzu.statusCode, 200);
    assert.ok(resIsuzu.body.some(p => p.sku === 'TEST_BRK-CER-1')); // Isuzu specific
    assert.ok(resIsuzu.body.some(p => p.sku === 'TEST_WPR-UNV'));   // Universal

    // Filter by Brand = Hino
    const resHino = await request(app).get('/api/parts?brand=Hino');
    assert.strictEqual(resHino.statusCode, 200);
    assert.ok(!resHino.body.some(p => p.sku === 'TEST_BRK-CER-1')); // Should NOT have Isuzu
    assert.ok(resHino.body.some(p => p.sku === 'TEST_WPR-UNV'));    // Should have Universal
  });
});
