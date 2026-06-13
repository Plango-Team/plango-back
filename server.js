require('dotenv').config();


const app = require('./src/app');
const connectDB = require('./src/config/db');
const { config } = require('./src/config');
const http = require('http');
const { initializeSocket } = require('./src/socket');
require('./src/jobs/redis'); // Initialize Redis connection
require('./src/jobs/workers/notification.worker'); // Initialize notification job worker
const start = async () => {
  // Connect to MongoDB before starting the server
  await connectDB();

  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  const server = httpServer.listen(config.port, () => {
    console.log(`\n🚀 Server running on port ${config.port} [${config.nodeEnv}]`);
    console.log(`📋 Health check: http://localhost:${config.port}/health`);
    console.log(`🔐 Auth API:     http://localhost:${config.port}/api/auth\n`);
  });

  // ── Graceful Shutdown ──────────────────────────────────
  // When the process is killed, close connections cleanly
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force exit if it takes too long
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Log unhandled errors instead of crashing silently
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

start();
