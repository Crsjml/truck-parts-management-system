import { apiPut } from '../src/api/apiClient.js';
// Wait, we need an auth token. Let's just mock the req/res for the Express route handler.
import { prisma } from '../src/config/prisma.js';
import express from 'express';
import request from 'supertest';
import customerRouter from '../src/routes/customers.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  // mock requireAuth
  req.auth = { userId: 'dummy-auth-id' };
  next();
});
app.use('/api/customers', customerRouter);

async function test() {
  const customer = await prisma.customer.findFirst();
  if (!customer) return console.log('no customer');
  
  // mock auth to match first customer
  app.use((req, res, next) => {
    req.auth = { userId: customer.authId };
    next();
  });

  const res = await request(app)
    .put('/api/customers/me')
    .send({
      companyName: 'Some New Company',
      addresses: [
        { label: 'Warehouse 1', fullAddress: '123 Street', isDefaultShipping: false, isDefaultBilling: false }
      ]
    });
  
  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

test();
