// backend/src/index.js
import './config/env.js';
import app from './app.js';
import { connectDB } from './config/db.js';
await connectDB();

// Dynamic port selection: try default, then increment until free
const startServer = (port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve(server));
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
  let port = parseInt(process.env.PORT) || 3000;
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
