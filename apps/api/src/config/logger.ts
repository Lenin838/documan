import pino from 'pino';

import { env } from './env.js';

const loggerOptions = {
  level: env.LOG_LEVEL,
};

if (env.NODE_ENV === 'development') {
  Object.assign(loggerOptions, {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    },
  });
}

export const logger = pino(loggerOptions);