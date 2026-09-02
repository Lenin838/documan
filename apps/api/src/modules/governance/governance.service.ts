import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import type {
  UpdateGovernanceSettingsInput,
  CreateGateTokenInput,
} from './governance.schema.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function verifyProjectOwnerOrAdmin(
  projectId: string,
  userId: string,
  role: 'user' | 'admin',
): Promise<InstanceType<typeof Project>> {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');

  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError(
      'Forbidden: Governance settings require Project Owner or Admin authority',
      403,
      'FORBIDDEN',
    );
  }

  return project;
}

export async function getProjectGovernance(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Access check: Admin, Owner, or Project Member
  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    const hasDocAccess = await Document.exists({
      projectId: project._id,
      isDeleted: false,
      ownerId: new Types.ObjectId(userId),
    });

    if (!hasDocAccess) {
      const sharedDocs = await Document.find({ projectId: project._id, isDeleted: false }).select('_id');
      const docIds = sharedDocs.map((d) => d._id);
      const hasShareAccess = await DocumentShare.exists({
        documentId: { $in: docIds },
        sharedWithUserId: new Types.ObjectId(userId),
      });

      if (!hasShareAccess) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }
    }
  }

  const now = new Date();
  const maxDays = project.governanceSettings?.maxUnreviewedDays ?? 90;
  const isEnabled = project.governanceSettings?.isGovernanceEnabled ?? true;

  const totalDocs = await Document.countDocuments({ projectId: project._id, isDeleted: false });
  const approvedDocs = await Document.find({ projectId: project._id, status: 'APPROVED', isDeleted: false });
  const staleDocs = await Document.find({ projectId: project._id, status: 'STALE', isDeleted: false });

  let staleCount = staleDocs.length;
  let freshCount = 0;

  for (const doc of approvedDocs) {
    const lastReviewed = doc.lastReviewedAt || doc.createdAt;
    const daysElapsed = (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
    if (isEnabled && daysElapsed > maxDays) {
      staleCount += 1;
    } else {
      freshCount += 1;
    }
  }

  const eligibleCount = approvedDocs.length + staleDocs.length;
  const freshnessPercentage = eligibleCount > 0 ? Math.round((freshCount / eligibleCount) * 100) : 100;

  const releaseGateSettings = {
    allowStale: project.releaseGateSettings?.allowStale ?? false,
    allowPendingReviews: project.releaseGateSettings?.allowPendingReviews ?? false,
    allowDeprecated: project.releaseGateSettings?.allowDeprecated ?? false,
    minFreshnessPercentage: project.releaseGateSettings?.minFreshnessPercentage ?? 80,
    allowOrphanedApiLinks: project.releaseGateSettings?.allowOrphanedApiLinks ?? false,
    allowDeprecatedApiEndpoints: project.releaseGateSettings?.allowDeprecatedApiEndpoints ?? true,
  };

  const gateTokens = (project.gateTokens || []).map((t) => ({
    id: t._id.toString(),
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    createdBy: t.createdBy.toString(),
    expiresAt: t.expiresAt || null,
    lastUsedAt: t.lastUsedAt || null,
    revokedAt: t.revokedAt || null,
    createdAt: t.createdAt,
  }));

  return {
    projectId: project._id.toString(),
    governanceSettings: {
      isGovernanceEnabled: isEnabled,
      maxUnreviewedDays: maxDays,
      autoMarkStaleOnUpstreamChange: project.governanceSettings?.autoMarkStaleOnUpstreamChange ?? true,
    },
    releaseGateSettings,
    gateTokens,
    health: {
      totalDocuments: totalDocs,
      eligibleDocuments: eligibleCount,
      approvedFreshCount: freshCount,
      staleCount,
      freshnessPercentage,
    },
  };
}

export async function updateProjectGovernance(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: UpdateGovernanceSettingsInput,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);

  if (input.isGovernanceEnabled !== undefined) {
    project.governanceSettings.isGovernanceEnabled = input.isGovernanceEnabled;
  }
  if (input.maxUnreviewedDays !== undefined) {
    project.governanceSettings.maxUnreviewedDays = input.maxUnreviewedDays;
  }
  if (input.autoMarkStaleOnUpstreamChange !== undefined) {
    project.governanceSettings.autoMarkStaleOnUpstreamChange = input.autoMarkStaleOnUpstreamChange;
  }

  if (input.releaseGateSettings) {
    if (!project.releaseGateSettings) {
      project.releaseGateSettings = {
        allowStale: false,
        allowPendingReviews: false,
        allowDeprecated: false,
        minFreshnessPercentage: 80,
        allowOrphanedApiLinks: false,
        allowDeprecatedApiEndpoints: true,
      };
    }
    if (input.releaseGateSettings.allowStale !== undefined) {
      project.releaseGateSettings.allowStale = input.releaseGateSettings.allowStale;
    }
    if (input.releaseGateSettings.allowPendingReviews !== undefined) {
      project.releaseGateSettings.allowPendingReviews = input.releaseGateSettings.allowPendingReviews;
    }
    if (input.releaseGateSettings.allowDeprecated !== undefined) {
      project.releaseGateSettings.allowDeprecated = input.releaseGateSettings.allowDeprecated;
    }
    if (input.releaseGateSettings.minFreshnessPercentage !== undefined) {
      project.releaseGateSettings.minFreshnessPercentage = input.releaseGateSettings.minFreshnessPercentage;
    }
    if (input.releaseGateSettings.allowOrphanedApiLinks !== undefined) {
      project.releaseGateSettings.allowOrphanedApiLinks = input.releaseGateSettings.allowOrphanedApiLinks;
    }
    if (input.releaseGateSettings.allowDeprecatedApiEndpoints !== undefined) {
      project.releaseGateSettings.allowDeprecatedApiEndpoints = input.releaseGateSettings.allowDeprecatedApiEndpoints;
    }
  }

  await project.save();

  return getProjectGovernance(userId, role, projectId);
}

export async function createProjectGateToken(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: CreateGateTokenInput,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);

  const randomHex = crypto.randomBytes(32).toString('hex');
  const rawToken = `documan_gate_${randomHex}`;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenPrefix = rawToken.substring(0, 16);

  let expiresAt: Date | null = null;
  if (input.expiresInDays) {
    expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
  }

  const tokenId = new Types.ObjectId();
  const newToken = {
    _id: tokenId,
    name: input.name,
    tokenHash,
    tokenPrefix,
    createdBy: new Types.ObjectId(userId),
    expiresAt,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
  };

  project.gateTokens.push(newToken as unknown as import('../projects/project.model.js').ProjectGateTokenSubdocument);
  await project.save();

  return {
    token: rawToken, // Plaintext shown ONCE
    id: tokenId.toString(),
    name: input.name,
    tokenPrefix,
    expiresAt,
    createdAt: newToken.createdAt,
  };
}

export async function getProjectGateTokens(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);

  return (project.gateTokens || []).map((t) => ({
    id: t._id.toString(),
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    createdBy: t.createdBy.toString(),
    expiresAt: t.expiresAt || null,
    lastUsedAt: t.lastUsedAt || null,
    revokedAt: t.revokedAt || null,
    createdAt: t.createdAt,
  }));
}

export async function revokeProjectGateToken(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  tokenId: string,
) {
  const project = await verifyProjectOwnerOrAdmin(projectId, userId, role);
  validateObjectId(tokenId, 'Token not found', 'TOKEN_NOT_FOUND');

  const token = (project.gateTokens || []).find((t) => t._id.toString() === tokenId);
  if (!token) {
    throw new AppError('Token not found', 404, 'TOKEN_NOT_FOUND');
  }

  token.revokedAt = new Date();
  await project.save();

  return {
    id: token._id.toString(),
    name: token.name,
    revokedAt: token.revokedAt,
  };
}

export async function confirmDocumentFreshness(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const document = await Document.findOne({ _id: documentId, isDeleted: false });
  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const hasEditPermission = role === 'admin' || document.ownerId.toString() === userId;

  if (!hasEditPermission) {
    const editShare = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(userId),
      permission: 'EDIT',
    });

    if (!editShare) {
      const readShare = await DocumentShare.findOne({
        documentId: document._id,
        sharedWithUserId: new Types.ObjectId(userId),
        permission: 'READ',
      });

      if (readShare) {
        throw new AppError(
          'Forbidden: Confirming document freshness requires EDIT permission',
          403,
          'FORBIDDEN',
        );
      } else {
        throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }
    }
  }

  if (document.status === 'DEPRECATED') {
    throw new AppError(
      'Cannot confirm freshness of a DEPRECATED document',
      400,
      'INVALID_STATUS_TRANSITION',
    );
  }

  if (document.status === 'DRAFT') {
    throw new AppError(
      'DRAFT documents must complete a formal review to become APPROVED',
      400,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const previousStatus = document.status;
  const now = new Date();

  document.lastReviewedAt = now;

  if (document.status === 'STALE') {
    document.status = 'APPROVED';
  }

  await document.save();

  await createDocumentAudit(document._id.toString(), userId, 'STATUS_CHANGE', {
    previousStatus,
    newStatus: document.status,
    transitionType: 'MANUAL',
    triggerSource: 'CONFIRM_FRESHNESS',
    reason: 'Freshness confirmed by authorized user',
  });

  return {
    id: document._id.toString(),
    title: document.title,
    status: document.status,
    lastReviewedAt: document.lastReviewedAt,
    updatedAt: document.updatedAt,
  };
}
