import { Types } from 'mongoose';
import { AppError } from '../../errors/app-error.js';
import { Document, type DocumentDocument } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { Project } from '../projects/project.model.js';
import { User } from '../users/user.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import { createNotificationInternal } from '../notifications/notification.service.js';
import {
  calculateKnowledgeRisk,
  type KnowledgeRiskContext,
  type KnowledgeRiskResult,
  type DocumentUserContext,
} from './knowledge-risk-calculator.js';

export async function getDocumentKnowledgeHealth(
  userId: string,
  role: string,
  documentId: string,
  evaluationAt = new Date(),
): Promise<KnowledgeRiskResult> {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Authorization check via ACL
  if (role !== 'admin') {
    const userObjId = new Types.ObjectId(userId);
    const isOwner = document.ownerId.toString() === userId;

    const shareCount = await DocumentShare.countDocuments({
      documentId: document._id,
      sharedWithUserId: userObjId,
    });

    if (!isOwner && shareCount === 0) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  const context = await buildKnowledgeRiskContext(document, evaluationAt);
  return calculateKnowledgeRisk(context);
}

export async function updateDocumentSteward(
  userId: string,
  role: string,
  documentId: string,
  stewardId: string | null,
) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Authorization check (Requires EDIT permission or Admin / Owner)
  if (role !== 'admin') {
    const userObjId = new Types.ObjectId(userId);
    const isOwner = document.ownerId.toString() === userId;

    const editShare = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: userObjId,
      permission: 'EDIT',
    });

    if (!isOwner && !editShare) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  let newStewardObjectId: Types.ObjectId | null = null;
  if (stewardId !== null) {
    if (!Types.ObjectId.isValid(stewardId)) {
      throw new AppError('Invalid steward user ID', 400, 'INVALID_STEWARD_ID');
    }

    const stewardUser = await User.findById(stewardId);
    if (!stewardUser || stewardUser.isDeleted || !stewardUser.isActive) {
      throw new AppError(
        'Cannot assign inactive or deleted user as steward',
        400,
        'INVALID_STEWARD_USER',
      );
    }
    newStewardObjectId = stewardUser._id;
  }

  const oldStewardId = document.stewardId ? document.stewardId.toString() : null;
  const newStewardIdStr = newStewardObjectId ? newStewardObjectId.toString() : null;

  if (oldStewardId === newStewardIdStr) {
    const context = await buildKnowledgeRiskContext(document);
    return {
      document,
      health: calculateKnowledgeRisk(context),
    };
  }

  let changeType: 'ASSIGNED' | 'TRANSFERRED' | 'REMOVED' = 'TRANSFERRED';
  if (!oldStewardId && newStewardIdStr) {
    changeType = 'ASSIGNED';
  } else if (oldStewardId && !newStewardIdStr) {
    changeType = 'REMOVED';
  }

  document.stewardId = newStewardObjectId;
  await document.save();

  // Audit log
  await createDocumentAudit(documentId, userId, 'DOCUMENT_STEWARD_CHANGED', {
    previousStewardId: oldStewardId,
    newStewardId: newStewardIdStr,
    changeType,
  });

  // Non-blocking notification if new steward assigned
  if (newStewardObjectId) {
    void createNotificationInternal({
      recipientUserId: newStewardObjectId,
      documentId: document._id,
      type: 'STEWARD_ASSIGNED',
      actorUserId: new Types.ObjectId(userId),
    }).catch((err) => {
      console.warn('Failed to send steward assignment notification:', err);
    });
  }

  const context = await buildKnowledgeRiskContext(document);
  return {
    document,
    health: calculateKnowledgeRisk(context),
  };
}

export interface ProjectKnowledgeRiskResponse {
  projectId: string;
  visibleDocumentCount: number;
  averageRiskScore: number;
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  highRiskDocuments: Array<{
    documentId: string;
    title: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    primaryRemediation: string | null;
  }>;
  unassignedStewardCount: number;
  pagination: {
    page: number;
    limit: number;
    totalHighRisk: number;
    totalPages: number;
  };
}

export async function getProjectKnowledgeRisk(
  userId: string,
  role: string,
  projectId: string,
  page = 1,
  limit = 20,
  evaluationAt = new Date(),
): Promise<ProjectKnowledgeRiskResponse> {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new AppError('Invalid project ID', 400, 'INVALID_PROJECT_ID');
  }

  const project = await Project.findById(projectId);
  if (!project || project.isArchived) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Determine ACL visible document IDs in single bulk query
  const isOwnerOrAdmin = role === 'admin' || project.ownerId.toString() === userId;

  let visibleDocQuery: Record<string, unknown> = {
    projectId: new Types.ObjectId(projectId),
    isDeleted: false,
  };

  if (!isOwnerOrAdmin) {
    const userObjId = new Types.ObjectId(userId);
    const shares = await DocumentShare.find({
      sharedWithUserId: userObjId,
    }).select('documentId');
    const sharedDocObjIds = shares.map((s) => s.documentId);

    visibleDocQuery = {
      projectId: new Types.ObjectId(projectId),
      isDeleted: false,
      $or: [
        { ownerId: userObjId },
        { _id: { $in: sharedDocObjIds } },
      ],
    };
  }

  const documents = await Document.find(visibleDocQuery).select(
    '_id title version lastApprovedVersion status impactVerification lastReviewedAt stewardId ownerId createdAt',
  );

  const visibleDocumentCount = documents.length;

  if (visibleDocumentCount === 0) {
    return {
      projectId,
      visibleDocumentCount: 0,
      averageRiskScore: 0,
      riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      highRiskDocuments: [],
      unassignedStewardCount: 0,
      pagination: {
        page,
        limit,
        totalHighRisk: 0,
        totalPages: 0,
      },
    };
  }

  // Bulk retrieve user and governance context
  const userIds = new Set<string>();
  for (const doc of documents) {
    userIds.add(doc.ownerId.toString());
    if (doc.stewardId) {
      userIds.add(doc.stewardId.toString());
    }
  }

  const users = await User.find({ _id: { $in: Array.from(userIds).map((id) => new Types.ObjectId(id)) } }).select(
    '_id name email isActive isDeleted',
  );

  const userMap = new Map<string, DocumentUserContext>();
  for (const u of users) {
    userMap.set(u._id.toString(), {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      isDeleted: u.isDeleted,
    });
  }

  const isGovernanceEnabled = project.governanceSettings?.isGovernanceEnabled ?? true;
  const maxUnreviewedDays = project.governanceSettings?.maxUnreviewedDays ?? 90;

  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let totalRiskScoreSum = 0;
  let unassignedStewardCount = 0;
  const highRiskRoster: Array<{
    documentId: string;
    title: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    primaryRemediation: string | null;
  }> = [];

  for (const doc of documents) {
    if (!doc.stewardId) {
      unassignedStewardCount++;
    }

    const stewardUser = doc.stewardId ? userMap.get(doc.stewardId.toString()) || null : null;
    const ownerUser = userMap.get(doc.ownerId.toString()) || null;

    const context: KnowledgeRiskContext = {
      documentId: doc._id.toString(),
      title: doc.title,
      version: doc.version || 1,
      lastApprovedVersion: doc.lastApprovedVersion,
      status: doc.status,
      lastReviewedAt: doc.lastReviewedAt,
      createdAt: doc.createdAt,
      needsVerification: doc.impactVerification?.needsVerification,
      activeImpactSources: doc.impactVerification?.activeImpactSources
        ? doc.impactVerification.activeImpactSources.map((s) => ({
            upstreamDocumentId: s.upstreamDocumentId.toString(),
            upstreamVersionNumber: s.upstreamVersionNumber,
            changeType: s.changeType,
            flaggedAt: s.flaggedAt,
          }))
        : [],
      isGovernanceEnabled,
      maxUnreviewedDays,
      stewardUser,
      ownerUser,
      evaluationAt,
    };

    const riskResult = calculateKnowledgeRisk(context);
    totalRiskScoreSum += riskResult.riskScore;
    riskDistribution[riskResult.riskLevel]++;

    if (riskResult.riskLevel === 'HIGH' || riskResult.riskLevel === 'CRITICAL') {
      highRiskRoster.push({
        documentId: doc._id.toString(),
        title: doc.title,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        primaryRemediation: riskResult.remediations[0]?.label || null,
      });
    }
  }

  // Sort high risk documents descending by riskScore
  highRiskRoster.sort((a, b) => b.riskScore - a.riskScore);

  const totalHighRisk = highRiskRoster.length;
  const skip = (page - 1) * limit;
  const paginatedHighRisk = highRiskRoster.slice(skip, skip + limit);

  return {
    projectId,
    visibleDocumentCount,
    averageRiskScore: Math.round(totalRiskScoreSum / visibleDocumentCount),
    riskDistribution,
    highRiskDocuments: paginatedHighRisk,
    unassignedStewardCount,
    pagination: {
      page,
      limit,
      totalHighRisk,
      totalPages: Math.ceil(totalHighRisk / limit),
    },
  };
}

async function buildKnowledgeRiskContext(
  document: DocumentDocument,
  evaluationAt = new Date(),
): Promise<KnowledgeRiskContext> {
  const userIds: string[] = [document.ownerId.toString()];
  if (document.stewardId) {
    userIds.push(document.stewardId.toString());
  }

  const users = await User.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } }).select(
    '_id name email isActive isDeleted',
  );

  const userMap = new Map<string, DocumentUserContext>();
  for (const u of users) {
    userMap.set(u._id.toString(), {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      isDeleted: u.isDeleted,
    });
  }

  let isGovernanceEnabled = true;
  let maxUnreviewedDays = 90;

  if (document.projectId) {
    const project = await Project.findById(document.projectId);
    if (project && project.governanceSettings) {
      isGovernanceEnabled = project.governanceSettings.isGovernanceEnabled;
      maxUnreviewedDays = project.governanceSettings.maxUnreviewedDays;
    }
  }

  return {
    documentId: document._id.toString(),
    title: document.title,
    version: document.version || 1,
    lastApprovedVersion: document.lastApprovedVersion,
    status: document.status,
    lastReviewedAt: document.lastReviewedAt,
    createdAt: document.createdAt,
    needsVerification: document.impactVerification?.needsVerification,
    activeImpactSources: document.impactVerification?.activeImpactSources
      ? document.impactVerification.activeImpactSources.map((s) => ({
          upstreamDocumentId: s.upstreamDocumentId.toString(),
          upstreamVersionNumber: s.upstreamVersionNumber,
          changeType: s.changeType,
          flaggedAt: s.flaggedAt,
        }))
      : [],
    isGovernanceEnabled,
    maxUnreviewedDays,
    stewardUser: document.stewardId ? userMap.get(document.stewardId.toString()) || null : null,
    ownerUser: userMap.get(document.ownerId.toString()) || null,
    evaluationAt,
  };
}
