import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { safeNotify, createNotificationInternal } from '../notifications/notification.service.js';
import { verifyProjectOwnerOrAdmin } from './governance.service.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import {
  DocumentationWorkRequest,
  IDocumentationWorkRequest,
  IWorkRequestOriginatingContext,
  WorkRequestSource,
  WorkRequestStatus,
} from './documentation-work-request.model.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function checkProjectAccess(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
): Promise<InstanceType<typeof Project>> {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (role === 'admin' || project.ownerId.toString() === userId) {
    return project;
  }

  const userObjId = new Types.ObjectId(userId);
  const hasDocAccess = await Document.exists({
    projectId: project._id,
    isDeleted: false,
    $or: [{ ownerId: userObjId }, { stewardId: userObjId }],
  });

  if (hasDocAccess) {
    return project;
  }

  const sharedDocs = await Document.find({ projectId: project._id, isDeleted: false }).select('_id');
  const docIds = sharedDocs.map((d) => d._id);
  const hasShareAccess = await DocumentShare.exists({
    documentId: { $in: docIds },
    sharedWithUserId: userObjId,
  });

  if (!hasShareAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  return project;
}

export function computeOriginKey(
  source: WorkRequestSource,
  documentId: string | Types.ObjectId,
  context?: IWorkRequestOriginatingContext | null,
): string | null {
  const docIdStr = documentId.toString();
  switch (source) {
    case 'CHANGE_IMPACT':
      return context?.impactSourceDocumentId && context?.changeType
        ? `${context.impactSourceDocumentId.toString()}:${context.upstreamVersionNumber || 1}:${context.changeType}:${docIdStr}`
        : null;
    case 'EVIDENCE':
      return context?.evidenceSourceId
        ? `${context.evidenceSourceId}:${docIdStr}`
        : null;
    case 'GOVERNANCE':
      return context?.assuranceCheckId
        ? `${context.assuranceCheckId}:${docIdStr}`
        : null;
    case 'VERIFICATION':
      return context?.verificationPlanId && context?.verificationTaskId
        ? `${context.verificationPlanId.toString()}:${context.verificationTaskId.toString()}`
        : null;
    case 'BASELINE_DRIFT':
      return context?.baselineId && context?.driftDimension
        ? `${context.baselineId.toString()}:${docIdStr}:${context.driftDimension}`
        : null;
    case 'MANUAL':
    default:
      return null;
  }
}

export async function verifyUserProjectMembership(userId: string | Types.ObjectId, projectId: string | Types.ObjectId): Promise<boolean> {
  const user = await User.findById(userId);
  if (!user || !user.isActive || user.isDeleted) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  const project = await Project.findById(projectId);
  if (!project || project.isArchived) {
    return false;
  }
  if (project.ownerId.toString() === userId.toString()) {
    return true;
  }
  const userObjId = new Types.ObjectId(userId.toString());
  const hasDocAccess = await Document.exists({
    projectId: project._id,
    isDeleted: false,
    $or: [{ ownerId: userObjId }, { stewardId: userObjId }],
  });

  if (hasDocAccess) {
    return true;
  }

  const sharedDocs = await Document.find({ projectId: project._id, isDeleted: false }).select('_id');
  const docIds = sharedDocs.map((d) => d._id);
  const hasShareAccess = await DocumentShare.exists({
    documentId: { $in: docIds },
    sharedWithUserId: userObjId,
  });

  return Boolean(hasShareAccess);
}

export async function createWorkRequestInternal(data: {
  projectId: string | Types.ObjectId;
  documentId: string | Types.ObjectId;
  title: string;
  reason: string;
  source: WorkRequestSource;
  createdByUserId: string | Types.ObjectId;
  assigneeId?: string | Types.ObjectId | null | undefined;
  targetVersionNumber?: number | null | undefined;
  originatingContext?: IWorkRequestOriginatingContext | null | undefined;
}): Promise<IDocumentationWorkRequest> {
  const projObjId = new Types.ObjectId(data.projectId.toString());
  const docObjId = new Types.ObjectId(data.documentId.toString());
  const creatorObjId = new Types.ObjectId(data.createdByUserId.toString());

  const project = await Project.findById(projObjId);
  if (!project || project.isArchived) {
    throw new AppError('Project not found or is archived', 404, 'PROJECT_NOT_FOUND');
  }

  const doc = await Document.findOne({ _id: docObjId, projectId: projObjId, isDeleted: false });
  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  let assigneeObjId: Types.ObjectId | null = null;
  if (data.assigneeId) {
    const isMember = await verifyUserProjectMembership(data.assigneeId, projObjId);
    if (!isMember) {
      throw new AppError('Assignee is not a member of this project', 400, 'ASSIGNEE_NOT_PROJECT_MEMBER');
    }
    assigneeObjId = new Types.ObjectId(data.assigneeId.toString());
  }

  const originKey = computeOriginKey(data.source, docObjId, data.originatingContext);

  if (originKey) {
    const existingActive = await DocumentationWorkRequest.findOne({
      projectId: projObjId,
      originKey,
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW'] },
    });
    if (existingActive) {
      return existingActive;
    }
  }

  const initialStatus: WorkRequestStatus = assigneeObjId ? 'ASSIGNED' : 'OPEN';

  try {
    const newRequest = await DocumentationWorkRequest.create({
      projectId: projObjId,
      documentId: docObjId,
      originKey,
      targetVersionNumber: data.targetVersionNumber ?? doc.version,
      title: data.title.trim(),
      reason: data.reason.trim(),
      source: data.source,
      status: initialStatus,
      createdBy: creatorObjId,
      ...(assigneeObjId ? { assigneeId: assigneeObjId } : {}),
      ...(data.originatingContext ? { originatingContext: data.originatingContext } : {}),
    });

    await createDocumentAudit(docObjId.toString(), creatorObjId.toString(), 'WORK_REQUEST_CREATED', {
      workRequestId: newRequest._id.toString(),
      source: data.source,
      originKey,
      title: data.title,
    });

    if (assigneeObjId) {
      await createDocumentAudit(docObjId.toString(), creatorObjId.toString(), 'WORK_REQUEST_ASSIGNED', {
        workRequestId: newRequest._id.toString(),
        assigneeId: assigneeObjId.toString(),
      });

      safeNotify(async () => {
        await createNotificationInternal({
          recipientUserId: assigneeObjId.toString(),
          documentId: doc._id.toString(),
          type: 'STEWARD_ASSIGNED',
          actorUserId: creatorObjId.toString(),
        });
      });
    }

    return newRequest;
  } catch (err: unknown) {
    const errObj = err as { code?: number; message?: string };
    if (originKey && (errObj.code === 11000 || errObj.message?.includes('E11000') || errObj.message?.includes('duplicate key'))) {
      const existingActive = await DocumentationWorkRequest.findOne({
        projectId: projObjId,
        originKey,
        status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW'] },
      });
      if (existingActive) {
        return existingActive;
      }
    }
    throw err;
  }
}

export async function getWorkRequestsForProject(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  queryFilters?: { status?: WorkRequestStatus; source?: WorkRequestSource; assigneeId?: string; page?: number; limit?: number },
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  await checkProjectAccess(userId, role, projectId);

  const filter: Record<string, unknown> = { projectId: new Types.ObjectId(projectId) };

  if (queryFilters?.status) {
    filter.status = queryFilters.status;
  }
  if (queryFilters?.source) {
    filter.source = queryFilters.source;
  }
  if (queryFilters?.assigneeId && Types.ObjectId.isValid(queryFilters.assigneeId)) {
    filter.assigneeId = new Types.ObjectId(queryFilters.assigneeId);
  }

  const page = Math.max(1, queryFilters?.page || 1);
  const limit = Math.min(100, Math.max(1, queryFilters?.limit || 20));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    DocumentationWorkRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('assigneeId', 'name email'),
    DocumentationWorkRequest.countDocuments(filter),
  ]);

  return {
    requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getWorkRequestsForDocument(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  queryFilters?: { status?: WorkRequestStatus; page?: number; limit?: number },
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');
  const doc = await Document.findById(documentId);
  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (doc.projectId) {
    await checkProjectAccess(userId, role, doc.projectId.toString());
  }

  const filter: Record<string, unknown> = { documentId: new Types.ObjectId(documentId) };

  if (queryFilters?.status) {
    filter.status = queryFilters.status;
  }

  const page = Math.max(1, queryFilters?.page || 1);
  const limit = Math.min(100, Math.max(1, queryFilters?.limit || 20));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    DocumentationWorkRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('assigneeId', 'name email'),
    DocumentationWorkRequest.countDocuments(filter),
  ]);

  return {
    requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getWorkRequestById(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');
  const request = await DocumentationWorkRequest.findById(requestId)
    .populate('createdBy', 'name email')
    .populate('assigneeId', 'name email');

  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, request.projectId.toString());

  return request;
}

export async function assignWorkRequest(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
  assigneeId: string,
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');
  validateObjectId(assigneeId, 'Assignee user not found', 'ASSIGNEE_NOT_FOUND');

  const request = await DocumentationWorkRequest.findById(requestId);
  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  const doc = await Document.findById(request.documentId);
  if (!doc) {
    throw new AppError('Associated document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // 1. Actor Authorization Check
  let isAuthorizedActor = false;
  if (role === 'admin') {
    isAuthorizedActor = true;
  } else {
    try {
      await verifyProjectOwnerOrAdmin(request.projectId.toString(), userId, role);
      isAuthorizedActor = true;
    } catch {
      if (doc.ownerId.toString() === userId || (doc.stewardId && doc.stewardId.toString() === userId)) {
        isAuthorizedActor = true;
      } else if (request.assigneeId && request.assigneeId.toString() === userId) {
        isAuthorizedActor = true;
      }
    }
  }

  if (!isAuthorizedActor) {
    throw new AppError('Unauthorized to assign or reassign this work request', 403, 'UNAUTHORIZED_ASSIGNMENT_ACTOR');
  }

  // 2. Target Assignee Eligibility Check
  const assigneeUser = await User.findById(assigneeId);
  if (!assigneeUser || !assigneeUser.isActive || assigneeUser.isDeleted) {
    throw new AppError('Assignee user not found or is inactive', 404, 'ASSIGNEE_NOT_FOUND');
  }

  const isMember = await verifyUserProjectMembership(assigneeId, request.projectId);
  if (!isMember) {
    throw new AppError('Assignee is not a member of this project', 400, 'ASSIGNEE_NOT_PROJECT_MEMBER');
  }

  const targetAssigneeObjId = new Types.ObjectId(assigneeId);
  request.assigneeId = targetAssigneeObjId;
  if (request.status === 'OPEN') {
    request.status = 'ASSIGNED';
  }

  await request.save();

  await createDocumentAudit(request.documentId.toString(), userId, 'WORK_REQUEST_ASSIGNED', {
    workRequestId: request._id.toString(),
    assigneeId,
  });

  safeNotify(async () => {
    await createNotificationInternal({
      recipientUserId: assigneeId,
      documentId: request.documentId.toString(),
      type: 'STEWARD_ASSIGNED',
      actorUserId: userId,
    });
  });

  return request;
}

export async function updateWorkRequestStatus(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
  newStatus: 'IN_PROGRESS' | 'IN_REVIEW',
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');

  const request = await DocumentationWorkRequest.findById(requestId);
  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, request.projectId.toString());

  const doc = await Document.findById(request.documentId);
  const isAssignee = request.assigneeId && request.assigneeId.toString() === userId;
  const isDocOwnerOrSteward = doc && (doc.ownerId.toString() === userId || (doc.stewardId && doc.stewardId.toString() === userId));

  let isOwnerOrAdmin = false;
  try {
    await verifyProjectOwnerOrAdmin(request.projectId.toString(), userId, role);
    isOwnerOrAdmin = true;
  } catch {
    // not owner/admin
  }

  if (!isAssignee && !isDocOwnerOrSteward && !isOwnerOrAdmin) {
    throw new AppError('Unauthorized to update status of this work request', 403, 'FORBIDDEN');
  }

  const prevStatus = request.status;
  if (newStatus === 'IN_PROGRESS' && !['OPEN', 'ASSIGNED', 'IN_REVIEW'].includes(prevStatus)) {
    throw new AppError(`Cannot transition status from ${prevStatus} to IN_PROGRESS`, 400, 'INVALID_STATUS_TRANSITION');
  }
  if (newStatus === 'IN_REVIEW' && !['ASSIGNED', 'IN_PROGRESS'].includes(prevStatus)) {
    throw new AppError(`Cannot transition status from ${prevStatus} to IN_REVIEW`, 400, 'INVALID_STATUS_TRANSITION');
  }

  request.status = newStatus;
  await request.save();

  await createDocumentAudit(request.documentId.toString(), userId, 'WORK_REQUEST_STATUS_CHANGED', {
    workRequestId: request._id.toString(),
    previousStatus: prevStatus,
    newStatus,
  });

  return request;
}

export async function resolveWorkRequest(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
  resolutionNotes?: string,
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');

  const request = await DocumentationWorkRequest.findById(requestId);
  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, request.projectId.toString());

  const doc = await Document.findById(request.documentId);
  const isAssignee = request.assigneeId && request.assigneeId.toString() === userId;
  const isDocOwnerOrSteward = doc && (doc.ownerId.toString() === userId || (doc.stewardId && doc.stewardId.toString() === userId));

  let isOwnerOrAdmin = false;
  try {
    await verifyProjectOwnerOrAdmin(request.projectId.toString(), userId, role);
    isOwnerOrAdmin = true;
  } catch {
    // not owner/admin
  }

  if (!isAssignee && !isDocOwnerOrSteward && !isOwnerOrAdmin) {
    throw new AppError('Unauthorized to resolve this work request', 403, 'FORBIDDEN');
  }

  if (['RESOLVED', 'SKIPPED'].includes(request.status)) {
    throw new AppError(`Work request is already ${request.status.toLowerCase()}`, 400, 'INVALID_STATUS_TRANSITION');
  }

  const prevStatus = request.status;
  request.status = 'RESOLVED';
  request.resolvedAt = new Date();
  request.resolvedBy = new Types.ObjectId(userId);
  request.resolutionNotes = resolutionNotes ? resolutionNotes.trim() : undefined;

  await request.save();

  await createDocumentAudit(request.documentId.toString(), userId, 'WORK_REQUEST_RESOLVED', {
    workRequestId: request._id.toString(),
    previousStatus: prevStatus,
    resolutionNotes: request.resolutionNotes,
  });

  return request;
}

export async function skipWorkRequest(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
  skipReason: string,
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');

  if (!skipReason || !skipReason.trim()) {
    throw new AppError('Skip reason is required', 400, 'SKIP_REASON_REQUIRED');
  }

  const request = await DocumentationWorkRequest.findById(requestId);
  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, request.projectId.toString());

  const doc = await Document.findById(request.documentId);
  const isAssignee = request.assigneeId && request.assigneeId.toString() === userId;
  const isDocOwnerOrSteward = doc && (doc.ownerId.toString() === userId || (doc.stewardId && doc.stewardId.toString() === userId));

  let isOwnerOrAdmin = false;
  try {
    await verifyProjectOwnerOrAdmin(request.projectId.toString(), userId, role);
    isOwnerOrAdmin = true;
  } catch {
    // not owner/admin
  }

  if (!isAssignee && !isDocOwnerOrSteward && !isOwnerOrAdmin) {
    throw new AppError('Unauthorized to skip this work request', 403, 'FORBIDDEN');
  }

  if (['RESOLVED', 'SKIPPED'].includes(request.status)) {
    throw new AppError(`Work request is already ${request.status.toLowerCase()}`, 400, 'INVALID_STATUS_TRANSITION');
  }

  const prevStatus = request.status;
  request.status = 'SKIPPED';
  request.skippedAt = new Date();
  request.skippedBy = new Types.ObjectId(userId);
  request.skipReason = skipReason.trim();

  await request.save();

  await createDocumentAudit(request.documentId.toString(), userId, 'WORK_REQUEST_SKIPPED', {
    workRequestId: request._id.toString(),
    previousStatus: prevStatus,
    skipReason: request.skipReason,
  });

  return request;
}

export async function reopenWorkRequest(
  userId: string,
  role: 'user' | 'admin',
  requestId: string,
): Promise<IDocumentationWorkRequest> {
  validateObjectId(requestId, 'Work request not found', 'WORK_REQUEST_NOT_FOUND');

  const request = await DocumentationWorkRequest.findById(requestId);
  if (!request) {
    throw new AppError('Work request not found', 404, 'WORK_REQUEST_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, request.projectId.toString());

  const doc = await Document.findById(request.documentId);
  const isDocOwnerOrSteward = doc && (doc.ownerId.toString() === userId || (doc.stewardId && doc.stewardId.toString() === userId));

  let isOwnerOrAdmin = false;
  try {
    await verifyProjectOwnerOrAdmin(request.projectId.toString(), userId, role);
    isOwnerOrAdmin = true;
  } catch {
    // not owner/admin
  }

  if (!isDocOwnerOrSteward && !isOwnerOrAdmin) {
    throw new AppError('Unauthorized to reopen this work request', 403, 'FORBIDDEN');
  }

  if (!['RESOLVED', 'SKIPPED'].includes(request.status)) {
    throw new AppError(`Cannot reopen a work request with status ${request.status}`, 400, 'INVALID_STATUS_TRANSITION');
  }

  // Reopen Collision Check
  if (request.originKey) {
    const existingActive = await DocumentationWorkRequest.findOne({
      projectId: request.projectId,
      originKey: request.originKey,
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW'] },
    });

    if (existingActive) {
      throw new AppError(
        'An active work request already exists for this originating finding',
        409,
        'WORK_REQUEST_ORIGIN_ALREADY_ACTIVE',
      );
    }
  }

  const prevStatus = request.status;
  request.status = request.assigneeId ? 'ASSIGNED' : 'OPEN';
  request.resolvedAt = undefined;
  request.resolvedBy = undefined;
  request.resolutionNotes = undefined;
  request.skippedAt = undefined;
  request.skippedBy = undefined;
  request.skipReason = undefined;

  await request.save();

  await createDocumentAudit(request.documentId.toString(), userId, 'WORK_REQUEST_REOPENED', {
    workRequestId: request._id.toString(),
    previousStatus: prevStatus,
    newStatus: request.status,
  });

  return request;
}
