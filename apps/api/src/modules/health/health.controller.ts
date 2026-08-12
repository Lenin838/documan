import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { getHealthStatus } from './health.service.js';

export function healthController(_req: Request, res: Response) {
  return sendSuccess(res, getHealthStatus());
}