import './config/env.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedAdmin, seedCustomers, seedParts } from './config/seed.js';
import authRouter from './routes/auth.js';
import partsRouter from './routes/parts.js';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',   // Vite dev server (host)
    'http://127.0.0.1:5173',
    'http://frontend:5173',    // Docker internal
  ],
  credentials: true,
}));
app.use(express.json());

await connectDB();
await seedAdmin();
await seedCustomers();
await seedParts();

app.use('/api/auth', authRouter);
app.use('/api/parts', partsRouter);

app.get('/api/ping', (req, res) => res.json({ msg: 'pong' }));

// ── Health endpoint (industry-standard) ──────────────────────────────────────
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
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

// Dynamic port selection: try default, then increment until free
const startServer = (port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        reject(err);
      } else {
        reject(err);
      }
    });
  });

(async () => {
  let port = parseInt(process.env.PORT) || 5000;
  while (true) {
    try {
      const server = await startServer(port);
      console.log(`🚀 Backend listening on http://localhost:${port}`);
      break;
    } catch (e) {
      if (e.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} in use, trying ${port + 1}…`);
        port++;
      } else {
        console.error('Failed to start server:', e);
        process.exit(1);
      }
    }
  }
})();
