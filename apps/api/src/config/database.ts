import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI);

    logger.info('Database connected');
  } catch (error) {
    logger.error(
      {
        error,
      },
      'Database connection failed',
    );

    throw error;
  }
}