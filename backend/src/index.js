import cluster from 'cluster';
import os from 'os';
import './config/env.js';
import app from './app.js';

const numCPUs = os.cpus().length;

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

if (cluster.isPrimary) {
  console.log(`🚀 Primary ${process.pid} is running`);
  
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  (async () => {
    // Note: Workers share the same port automatically in Node cluster
    let port = parseInt(process.env.PORT) || 5000;
    while (true) {
      try {
        const server = await startServer(port);
        console.log(`✅ Worker ${process.pid} listening on http://localhost:${port}`);
        break;
      } catch (e) {
        if (e.code === 'EADDRINUSE') {
          // If port is in use, only let one worker log it to prevent spam
          if (cluster.worker.id === 1) {
            console.log(`⚠️ Port ${port} in use, trying ${port + 1}…`);
          }
          port++;
        } else {
          console.error(`Worker ${process.pid} failed to start:`, e);
          process.exit(1);
        }
      }
    }
  })();
}
