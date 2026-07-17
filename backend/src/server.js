/**
 * ExpenseFlow - Server Entry Point
 * Application bootstrap with graceful shutdown handling.
 */
const app = require('./app');
const config = require('./config');
const database = require('./config/database');
const { logger } = require('./utils/logger');
const { initializeSocket } = require('./socket');

let server;

// ─── Unhandled Rejection Handler ─────────────────────────
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Rejection', { reason: reason.message, stack: reason.stack });
});

// ─── Uncaught Exception Handler ──────────────────────────
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

// ─── SIGTERM Handler ─────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  gracefulShutdown();
});

// ─── SIGINT Handler ──────────────────────────────────────
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  gracefulShutdown();
});

// ─── Graceful Shutdown ───────────────────────────────────
async function gracefulShutdown() {
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await database.disconnect();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    await database.disconnect();
    process.exit(0);
  }
}

// ─── Start Server ────────────────────────────────────────
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Start HTTP server (allow in dev mode even without DB)
    server = app.listen(config.server.port, () => {
      // Initialize Socket.IO
      initializeSocket(server);
      
      logger.info(`ExpenseFlow API server started`, {
        environment: config.env,
        port: config.server.port,
        apiUrl: `${config.server.baseUrl}${config.server.apiPrefix}`,
        nodeVersion: process.version,
      });

      if (config.isDev) {
        logger.info(`Health check: ${config.server.baseUrl}${config.server.apiPrefix}/health`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    // In development, try to start anyway
    if (config.isDev) {
      server = app.listen(config.server.port, () => {
        // Initialize Socket.IO
        initializeSocket(server);
        
        logger.info(`ExpenseFlow API server started (offline mode)`, {
          environment: config.env,
          port: config.server.port,
          apiUrl: `${config.server.baseUrl}${config.server.apiPrefix}`,
        });
      });
    } else {
      process.exit(1);
    }
  }
}

startServer();

module.exports = app;