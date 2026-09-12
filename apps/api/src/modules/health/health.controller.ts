import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import {
  getHealthStatus,
  getReadinessStatus,
  getLivenessStatus,
} from './health.service.js';

export function healthController(_req: Request, res: Response) {
  const health = getHealthStatus();
  return sendSuccess(res, health, 200);
}

export function readinessController(_req: Request, res: Response) {
  const readiness = getReadinessStatus();
  const statusCode = readiness.ready ? 200 : 503;
  return res.status(statusCode).json({
    success: readiness.ready,
    data: readiness,
  });
}

export function livenessController(_req: Request, res: Response) {
  return sendSuccess(res, getLivenessStatus());
}
