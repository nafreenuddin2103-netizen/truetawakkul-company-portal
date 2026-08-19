import { app } from './api/app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';
import { db } from './infrastructure/database/pg-client.js';

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`TrueTawakkul Company Portal Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown Handler for Cloud Run / Kubernetes
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async (err) => {
    if (err) {
      logger.error(err, 'Error during HTTP server shutdown');
      process.exit(1);
    }
    
    logger.info('HTTP server closed.');
    
    try {
      await db.close();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (dbErr) {
      logger.error(dbErr, 'Error during database pool shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
