// backend/src/tests/parts.test.js
import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';

import '../config/env.js';
import app from '../app.js';
import Category from '../models/Category.js';
import Part from '../models/Part.js';

describe('Category & Parts CRUD Integration Tests', () => {
  before(async () => {
    let testUri = process.env.MONGODB_URI;
    if (!testUri) {
      testUri = 'mongodb://127.0.0.1:27017/truck_parts_test';
    } else {
      if (testUri.includes('truck_parts')) {
        testUri = testUri.replace('truck_parts', 'truck_parts_test_parts');
      } else {
        testUri = testUri + '_test_parts';
      }
    }

    await mongoose.connect(testUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    // Clear collections to guarantee test isolation
    await Part.deleteMany({});
    await Category.deleteMany({});
  });

  after(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  it('Should create top-level and subcategories, and block duplicate names', async () => {
    // 1. Create parent category
    const resParent = await request(app)
      .post('/api/categories')
      .send({ name: 'Engine' });

    assert.strictEqual(resParent.status, 201);
    assert.strictEqual(resParent.body.name, 'Engine');
    assert.strictEqual(resParent.body.parentCategory, null);
    const parentId = resParent.body._id;

    // 2. Create subcategory under parent
    const resSub = await request(app)
      .post('/api/categories')
      .send({ name: 'Cooling System', parentCategory: parentId });

    assert.strictEqual(resSub.status, 201);
    assert.strictEqual(resSub.body.name, 'Cooling System');
    assert.strictEqual(resSub.body.parentCategory._id, parentId);

    // 3. Block duplicates (case insensitive)
    const resDup = await request(app)
      .post('/api/categories')
      .send({ name: 'engine' });

    assert.strictEqual(resDup.status, 409);
    assert.ok(resDup.body.msg.includes('already exists'));
  });

  it('Should create parts, validate fields, and support base64 images', async () => {
    // Create a category first
    const cat = await Category.create({ name: 'Transmission' });

    // 1. Successful part creation
    const partData = {
      name: 'Clutch Assembly Pack',
      sku: 'CLT-ASM-990',
      oem: 'ME-99120',
      category_id: cat._id.toString(),
      price: 12500.00,
      stock: 10,
      minStock: 2,
      compatibility: 'Fuso Super Great',
      description: 'Heavy duty composite clutch assembly',
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSREug==...' // mock base64
    };

    const res = await request(app)
      .post('/api/parts')
      .send(partData);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'Clutch Assembly Pack');
    assert.strictEqual(res.body.category, 'Transmission');
    assert.strictEqual(res.body.category_id, cat._id.toString());
    assert.strictEqual(res.body.image, partData.image);

    // 2. Fail creation with negative pricing values
    const badPart = { ...partData, sku: 'BAD-SKU-001', price: -500 };
    const resBad = await request(app)
      .post('/api/parts')
      .send(badPart);

    assert.strictEqual(resBad.status, 400);
    assert.ok(resBad.body.msg.includes('Price cannot be negative'));
  });

  it('Should block deletion of categories with active subcategories or parts', async () => {
    // 1. Create parent & child
    const parent = await Category.create({ name: 'Brakes' });
    const sub = await Category.create({ name: 'Brake Linings', parentCategory: parent._id });

    // Try deleting parent while it has subcategory
    const resDelParent = await request(app)
      .delete(`/api/categories/${parent._id}`);
    assert.strictEqual(resDelParent.status, 400);
    assert.ok(resDelParent.body.msg.includes('active subcategories'));

    // 2. Create part in subcategory
    await Part.create({
      name: 'Rear Linings Pack',
      sku: 'BRK-REAR-LIN',
      oem: 'OEM-BRK-99',
      category: sub._id,
      price: 1500,
      stock: 5,
      min_stock: 1
    });

    // Try deleting subcategory while it has parts
    const resDelSub = await request(app)
      .delete(`/api/categories/${sub._id}`);
    assert.strictEqual(resDelSub.status, 400);
    assert.ok(resDelSub.body.msg.includes('associated with active part'));
  });
});
