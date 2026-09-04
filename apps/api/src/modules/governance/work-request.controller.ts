import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import {
  createWorkRequestInternal,
  getWorkRequestsForProject,
  getWorkRequestsForDocument,
  getWorkRequestById,
  assignWorkRequest,
  updateWorkRequestStatus,
  resolveWorkRequest,
  skipWorkRequest,
  reopenWorkRequest,
} from './work-request.service.js';
import {
  CreateWorkRequestInput,
  AssignWorkRequestInput,
  UpdateWorkRequestStatusInput,
  ResolveWorkRequestInput,
  SkipWorkRequestInput,
} from './work-request.schema.js';
import { WorkRequestSource, WorkRequestStatus } from './documentation-work-request.model.js';

export async function createWorkRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.projectId as string;
    const documentId = req.params.documentId as string;
    const body = req.body as CreateWorkRequestInput;

    const request = await createWorkRequestInternal({
      projectId,
      documentId,
      title: body.title,
      reason: body.reason,
      source: 'MANUAL',
      createdByUserId: userId,
      assigneeId: body.assigneeId ?? undefined,
      targetVersionNumber: body.targetVersionNumber ?? undefined,
    });

    sendSuccess(res, request, 201);
  } catch (error) {
    next(error);
  }
}

export async function listProjectWorkRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const projectId = req.params.projectId as string;

    const status = req.query.status as WorkRequestStatus | undefined;
    const source = req.query.source as WorkRequestSource | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const filterOptions: {
      status?: WorkRequestStatus;
      source?: WorkRequestSource;
      assigneeId?: string;
      page?: number;
      limit?: number;
    } = { page, limit };
    if (status) filterOptions.status = status;
    if (source) filterOptions.source = source;
    if (assigneeId) filterOptions.assigneeId = assigneeId;

    const result = await getWorkRequestsForProject(userId, role, projectId, filterOptions);

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function listDocumentWorkRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const documentId = req.params.documentId as string;

    const status = req.query.status as WorkRequestStatus | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const filterOptions: {
      status?: WorkRequestStatus;
      page?: number;
      limit?: number;
    } = { page, limit };
    if (status) filterOptions.status = status;

    const result = await getWorkRequestsForDocument(userId, role, documentId, filterOptions);

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function getWorkRequestDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;

    const request = await getWorkRequestById(userId, role, requestId);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}

export async function handleAssignWorkRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;
    const body = req.body as AssignWorkRequestInput;

    const request = await assignWorkRequest(userId, role, requestId, body.assigneeId);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateWorkRequestStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;
    const body = req.body as UpdateWorkRequestStatusInput;

    const request = await updateWorkRequestStatus(userId, role, requestId, body.status);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}

export async function handleResolveWorkRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;
    const body = req.body as ResolveWorkRequestInput;

    const request = await resolveWorkRequest(userId, role, requestId, body.resolutionNotes ?? undefined);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}

export async function handleSkipWorkRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;
    const body = req.body as SkipWorkRequestInput;

    const request = await skipWorkRequest(userId, role, requestId, body.skipReason);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}

export async function handleReopenWorkRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const requestId = req.params.requestId as string;

    const request = await reopenWorkRequest(userId, role, requestId);

    sendSuccess(res, request, 200);
  } catch (error) {
    next(error);
  }
}
