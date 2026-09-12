import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from './logger.js';

let eventListenersAttached = false;

function attachEventListeners(): void {
  if (eventListenersAttached || !mongoose.connection?.on) return;
  eventListenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB connection reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ error: err }, 'MongoDB connection error');
  });
}

export async function connectDatabase(): Promise<void> {
  attachEventListeners();

  try {
    await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: env.NODE_ENV !== 'production',
    });

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

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Database disconnected cleanly');
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
