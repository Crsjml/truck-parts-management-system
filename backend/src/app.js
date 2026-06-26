// backend/src/app.js
import './config/env.js';
import express from 'express';
import cors from 'cors';
import partsRouter from './routes/parts.js';
import categoriesRouter from './routes/categories.js';
import settingsRouter from './routes/settings_routes.js';
import transactionsRouter from './routes/transactions.js';
import suppliersRouter from './routes/suppliers.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import checkoutRouter from './routes/checkout.js';
import mongoose from 'mongoose';
const app = express();
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
    express.json()(req, res, next);
  }
});

app.use('/api/checkout', checkoutRouter);
app.use('/api/parts', partsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);

app.get('/api/ping', (req, res) => res.json({ msg: 'pong' }));

// ── Health endpoint (industry-standard) ──────────────────────────────────────
const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
const startTime = Date.now();

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const status = dbState === 1 ? 'ok' : 'degraded';
  res.status(dbState === 1 ? 200 : 503).json({
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: {
      backend: 'ok',
      database: {
        status: DB_STATES[dbState] ?? 'unknown',
        connected: dbState === 1,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
