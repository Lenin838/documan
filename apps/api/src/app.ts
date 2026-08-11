import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';


const app = express();

app.use(requestIdMiddleware);

app.use(
  pinoHttp({
    logger,

    genReqId: (req) => req.requestId,

    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),

      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);

app.use(express.json());

app.use('/api/v1', apiRouter);
app.use(errorMiddleware);

export { app };