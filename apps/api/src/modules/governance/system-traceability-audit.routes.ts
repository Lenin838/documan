import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getTraceabilityAuditHandler } from './system-traceability-audit.controller.js';

const router = Router();

router.get(
  '/documents/:documentId/traceability-audit',
  authenticate,
  getTraceabilityAuditHandler,
);

export default router;
