import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  createWorkRequest,
  listProjectWorkRequests,
  listDocumentWorkRequests,
  getWorkRequestDetail,
  handleAssignWorkRequest,
  handleUpdateWorkRequestStatus,
  handleResolveWorkRequest,
  handleSkipWorkRequest,
  handleReopenWorkRequest,
} from './work-request.controller.js';
import {
  CreateWorkRequestSchema,
  AssignWorkRequestSchema,
  UpdateWorkRequestStatusSchema,
  ResolveWorkRequestSchema,
  SkipWorkRequestSchema,
} from './work-request.schema.js';

const router = Router({ mergeParams: true });

// Project-level work requests
router.post(
  '/projects/:projectId/documents/:documentId/work-requests',
  authenticate,
  validateBody(CreateWorkRequestSchema),
  createWorkRequest,
);

router.get('/projects/:projectId/work-requests', authenticate, listProjectWorkRequests);

// Document-level work requests
router.get('/documents/:documentId/work-requests', authenticate, listDocumentWorkRequests);

// Work request actions
router.get('/work-requests/:requestId', authenticate, getWorkRequestDetail);
router.post('/work-requests/:requestId/assign', authenticate, validateBody(AssignWorkRequestSchema), handleAssignWorkRequest);
router.patch('/work-requests/:requestId/status', authenticate, validateBody(UpdateWorkRequestStatusSchema), handleUpdateWorkRequestStatus);
router.post('/work-requests/:requestId/resolve', authenticate, validateBody(ResolveWorkRequestSchema), handleResolveWorkRequest);
router.post('/work-requests/:requestId/skip', authenticate, validateBody(SkipWorkRequestSchema), handleSkipWorkRequest);
router.post('/work-requests/:requestId/reopen', authenticate, handleReopenWorkRequest);

export default router;
