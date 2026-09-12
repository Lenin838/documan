import { Router } from 'express';
import {
  healthController,
  readinessController,
  livenessController,
} from './health.controller.js';

const healthRouter = Router();

healthRouter.get('/', healthController);
healthRouter.get('/live', livenessController);
healthRouter.get('/ready', readinessController);

export { healthRouter };
