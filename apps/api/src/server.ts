import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function startServer() {
  try {
    await connectDatabase();

    app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
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

startServer();