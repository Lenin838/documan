import type { Server } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

let server: Server | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal, exitCode }, 'Initiating graceful shutdown of Documan API...');

  const forceTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000);

  forceTimeout.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close((err) => {
          if (err) {
            logger.error({ error: err }, 'Error closing HTTP server');
          } else {
            logger.info('HTTP server stopped accepting connections');
          }
          resolve();
        });
      });
    }

    await disconnectDatabase();
    logger.info({ signal, exitCode }, 'Documan API shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          env: env.NODE_ENV,
        },
        'Documan API started',
      );
    });
  } catch (error) {
    logger.error(
      {
        error,
      },
      'Failed to start Documan API',
    );

    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT', 0);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception detected - initiating emergency shutdown');
  void gracefulShutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection detected - initiating emergency shutdown');
  void gracefulShutdown('unhandledRejection', 1);
});

startServer();
