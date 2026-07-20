import { prisma } from '../src/config/prisma.js';
import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';
import customerRouter from '../src/routes/customers.js';

dotenv.config();

async function run() {
  const customer = await prisma.customer.findFirst();
  console.log('Customer before:', customer.companyName, 'Addresses:', customer.addresses?.length);
  
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.auth = { userId: customer.authId, email: customer.email };
    next();
  });
  app.use('/api/customers', customerRouter);

  const res = await request(app)
    .put('/api/customers/me')
    .send({
      displayName: customer.displayName,
      phoneNumber: customer.phoneNumber,
      photoURL: customer.photoURL,
      companyName: 'New Test Company',
      addresses: [
        { label: 'Warehouse A', fullAddress: '123 Fake St', isDefaultShipping: true, isDefaultBilling: true }
      ]
    });
    
  console.log('PUT Response status:', res.status);
  console.log('PUT Response body:', res.body);

  const resGet = await request(app).get('/api/customers/me');
  console.log('GET Response body:', resGet.body);
}

run();
