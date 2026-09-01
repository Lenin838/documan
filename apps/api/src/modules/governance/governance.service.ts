import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import type { UpdateGovernanceSettingsInput } from './governance.schema.js';

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
    // Check if user owns or has share access to any document in project
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

  // Calculate project documentation health metrics
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

  return {
    projectId: project._id.toString(),
    governanceSettings: {
      isGovernanceEnabled: isEnabled,
      maxUnreviewedDays: maxDays,
      autoMarkStaleOnUpstreamChange: project.governanceSettings?.autoMarkStaleOnUpstreamChange ?? true,
    },
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

  await project.save();

  return getProjectGovernance(userId, role, projectId);
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

  // Authorization: Owner, Admin, or Shared EDIT user required
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

  // Prohibited operations
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

  // Audit trail
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
