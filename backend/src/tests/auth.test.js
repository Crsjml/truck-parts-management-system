// backend/src/tests/auth.test.js
import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Import environment variables before importing app
import '../config/env.js';
import app from '../app.js';
import User from '../models/User.js';

describe('Customer Login Integration Tests', () => {
  const testEmail = 'testcustomer@domain.com';
  const testPassword = 'Password123!';
  let hashedPassword;

  before(async () => {
    // Override MONGODB_URI to use an isolated test database
    let testUri = process.env.MONGODB_URI;
    if (!testUri) {
      testUri = 'mongodb://127.0.0.1:27017/truck_parts_test';
    } else {
      if (testUri.includes('truck_parts')) {
        testUri = testUri.replace('truck_parts', 'truck_parts_test_auth');
      } else {
        testUri = testUri + '_test_auth';
      }
    }

    // Connect to the test database
    await mongoose.connect(testUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    hashedPassword = await bcrypt.hash(testPassword, 10);
  });

  beforeEach(async () => {
    // Reset User collection before each test to guarantee test isolation
    await User.deleteMany({});
  });

  after(async () => {
    // Cleanup: drop database and disconnect
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  // Helper to create a customer user
  async function createCustomer(overrides = {}) {
    return await User.create({
      email: testEmail,
      password_hash: hashedPassword,
      full_name: 'Test Customer',
      contact_number: '09171234567',
      role: 'customer',
      verified: true,
      ...overrides,
    });
  }

  it('TC-01/TC-02: Should log in successfully with valid credentials and return a token', async () => {
    await createCustomer();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.full_name, 'Test Customer');
    assert.strictEqual(res.body.contact_number, '09171234567');
  });

  it('TC-03: Should return 400 Bad Request when credentials are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail }); // missing password

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.msg, 'Email and password are required.');
  });

  it('TC-04: Should return 401 Unauthorized for incorrect password', async () => {
    await createCustomer();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword123' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.msg, 'Invalid email or password.');
  });

  it('TC-08: Should return 403 Forbidden for unverified customer accounts', async () => {
    await createCustomer({ verified: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.needs_verification, true);
    assert.ok(res.body.msg.includes('Email is not verified'));
  });

  it('TC-05/TC-06: Should handle brute force lockout after 5 failed attempts', async () => {
    await createCustomer();

    // 1st to 4th failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'IncorrectPassword' });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.msg, 'Invalid email or password.');

      // Check failed attempts count in DB
      const user = await User.findOne({ email: testEmail });
      assert.strictEqual(user.failed_attempts, i);
      assert.strictEqual(user.locked_until, null);
    }

    // 5th failed attempt: triggers lockout
    const res5 = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'IncorrectPassword' });

    assert.strictEqual(res5.status, 401);
    assert.ok(res5.body.msg.includes('Too many failed attempts. Account locked'));

    // Check failed attempts is reset to 0 and locked_until is set in DB
    const userAfterLock = await User.findOne({ email: testEmail });
    assert.strictEqual(userAfterLock.failed_attempts, 0);
    assert.ok(userAfterLock.locked_until);

    // 6th attempt (while locked out)
    const res6 = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword }); // correct password but locked out

    assert.strictEqual(res6.status, 423);
    assert.strictEqual(res6.body.locked, true);
    assert.ok(res6.body.msg.includes('Account locked after too many failed attempts'));
  });
});
