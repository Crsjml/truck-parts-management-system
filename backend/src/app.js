// backend/src/app.js
import './config/env.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import partsRouter from './routes/parts.js';
import categoriesRouter from './routes/categories.js';
import settingsRouter from './routes/settings_routes.js';
import transactionsRouter from './routes/transactions.js';
import suppliersRouter from './routes/suppliers.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import checkoutRouter from './routes/checkout.js';
import reviewsRouter from './routes/reviews.js';
import staffRoutes from './routes/staffRoutes.js';
import customersRouter from './routes/customers.js';
import { prisma } from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
const app = express();
app.use(compression());
// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite dev server (host)
    'http://127.0.0.1:5173',
    'http://frontend:5173',    // Docker internal
  ],
  credentials: true,
}));
app.use((req, res, next) => {
  if (req.originalUrl === '/api/checkout/webhook') {
    next();
  } else {
    express.json({ limit: '5mb' })(req, res, next);
  }
});

app.use('/api/checkout', checkoutRouter);
app.use('/api/parts', partsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customersRouter);

app.get('/api/ping', (req, res) => res.json({ msg: 'pong' }));

// ── Health endpoint (industry-standard) ──────────────────────────────────────
const startTime = Date.now();

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services: {
        backend: 'ok',
        database: {
          status: 'connected',
          connected: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services: {
        backend: 'ok',
        database: {
          status: 'disconnected',
          connected: false,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Centralized error handler (must be last) ────────────────────────────────
app.use(errorHandler);

export default app;
