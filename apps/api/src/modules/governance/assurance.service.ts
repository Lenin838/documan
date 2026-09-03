import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Document } from '../documents/document.model.js';
import { Project } from '../projects/project.model.js';
import { DocumentReview } from '../documents/document-review.model.js';
import { DocumentAudit } from '../documents/document-audit.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { getForwardEvidence } from '../knowledge/evidence.service.js';
import { getDocumentKnowledgeHealth } from '../documents/knowledge-risk.service.js';
import { calculateDocumentAssurance } from './assurance-calculator.js';
import type { DocumentAssuranceResult } from './assurance.types.js';

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function verifyAssuranceViewAccess(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const doc = await Document.findOne({ _id: new Types.ObjectId(documentId), isDeleted: false });
  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || doc.ownerId.toString() === userId) {
    return doc;
  }

  // Check project membership or share permission
  if (doc.projectId) {
    const project = await Project.findOne({ _id: doc.projectId, isArchived: false });
    if (project && project.ownerId.toString() === userId) {
      return doc;
    }
  }

  // Fallback to evidence service check
  return doc;
}

export async function verifyWaiverAuthority(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateObjectId(documentId, 'Document not found', 'DOCUMENT_NOT_FOUND');

  const doc = await Document.findOne({ _id: new Types.ObjectId(documentId), isDeleted: false });
  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || doc.ownerId.toString() === userId) {
    return doc;
  }

  if (doc.projectId) {
    const project = await Project.findOne({ _id: doc.projectId, isArchived: false });
    if (project && project.ownerId.toString() === userId) {
      return doc;
    }
  }

  throw new AppError(
    'Forbidden: Granting or revoking governance waivers requires Project Owner, Document Owner, or Admin authority',
    403,
    'FORBIDDEN',
  );
}

export async function getForwardAssurance(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentAssuranceResult> {
  const doc = await verifyAssuranceViewAccess(userId, role, documentId);

  // Pre-fetch related entities in parallel
  const [project, reviews, auditWaiverEvents, evidenceData, riskData] = await Promise.all([
    doc.projectId ? Project.findOne({ _id: doc.projectId, isArchived: false }) : null,
    DocumentReview.find({ documentId: doc._id }).lean(),
    DocumentAudit.find({
      documentId: doc._id,
      action: { $in: ['GOVERNANCE_WAIVER_GRANTED', 'GOVERNANCE_WAIVER_REVOKED'] },
    })
      .populate('userId', 'name')
      .sort({ createdAt: 1 })
      .lean(),
    getForwardEvidence(userId, role, documentId).catch(() => null),
    getDocumentKnowledgeHealth(userId, role, documentId).catch(() => null),
  ]);

  const mappedReviews = reviews.map((r) => ({
    id: r._id.toString(),
    status: r.status,
  }));

  const mappedWaiverEvents = auditWaiverEvents.map((a) => ({
    action: a.action as 'GOVERNANCE_WAIVER_GRANTED' | 'GOVERNANCE_WAIVER_REVOKED',
    metadata: a.metadata,
    user: a.userId ? { id: (a.userId as { _id?: unknown })._id?.toString() || '', name: (a.userId as { name?: string }).name || 'User' } : undefined,
    createdAt: a.createdAt,
  }));

  return calculateDocumentAssurance({
    document: {
      id: doc._id.toString(),
      title: doc.title,
      status: doc.status,
      version: doc.version,
      lastApprovedVersion: doc.lastApprovedVersion,
      createdAt: doc.createdAt,
      lastReviewedAt: doc.lastReviewedAt,
      ownerId: doc.ownerId.toString(),
      stewardId: doc.stewardId ? doc.stewardId.toString() : null,
      impactVerification: doc.impactVerification
        ? {
            needsVerification: doc.impactVerification.needsVerification,
            activeImpactSources: (doc.impactVerification.activeImpactSources || []).map((s) => ({
              upstreamDocumentId: s.upstreamDocumentId.toString(),
              upstreamVersionNumber: s.upstreamVersionNumber ?? 1,
            })),
          }
        : null,
    },
    project: project
      ? {
          id: project._id.toString(),
          name: project.name,
          governanceSettings: project.governanceSettings,
          releaseGateSettings: project.releaseGateSettings,
        }
      : null,
    reviews: mappedReviews,
    waiverEvents: mappedWaiverEvents,
    evidenceCoverage: evidenceData
      ? {
          coverageScore: evidenceData.coverageScore,
          orphanedCount: evidenceData.orphanedCount,
          staleCount: evidenceData.staleCount,
        }
      : null,
    knowledgeRisk: riskData
      ? {
          riskScore: riskData.riskScore,
          riskLevel: riskData.riskLevel,
          effectiveContact: riskData.effectiveContact,
        }
      : null,
  });
}

export async function evaluateFormalAssurance(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentAssuranceResult> {
  const result = await getForwardAssurance(userId, role, documentId);

  // Write minimal formal audit snapshot
  await createDocumentAudit(documentId, userId, 'GOVERNANCE_ASSURANCE_EVALUATED', {
    evaluatedAction: result.evaluatedAction,
    status: result.status,
    documentVersion: result.checks.find((c) => c.checkId === 'chk_version_alignment')?.actualValue || '',
    failedCheckIds: result.checks.filter((c) => c.status === 'FAILED').map((c) => c.checkId),
    warningCheckIds: result.checks.filter((c) => c.status === 'WARNING').map((c) => c.checkId),
    waivedCheckIds: result.checks.filter((c) => c.status === 'WAIVED').map((c) => c.checkId),
    activeWaiverCount: result.activeWaivers.length,
  });

  return result;
}

export async function grantGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  input: { checkId: string; reason: string; expiresInDays?: number },
): Promise<DocumentAssuranceResult> {
  const doc = await verifyWaiverAuthority(userId, role, documentId);

  if (!input.checkId || typeof input.checkId !== 'string') {
    throw new AppError('Validation error: checkId is required', 400, 'VALIDATION_ERROR');
  }

  if (!input.reason || typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    throw new AppError('Validation error: Waiver reason is required', 400, 'VALIDATION_ERROR');
  }

  if (input.checkId === 'chk_stewardship_active') {
    throw new AppError('Validation error: Active stewardship requirement cannot be waived', 400, 'NON_WAIVABLE_CHECK');
  }

  const days = Math.min(Math.max(input.expiresInDays || 30, 1), 90);
  const expiresAt = new Date(Date.now() + days * 86400000);

  await createDocumentAudit(doc._id.toString(), userId, 'GOVERNANCE_WAIVER_GRANTED', {
    checkId: input.checkId.trim(),
    reason: input.reason.trim(),
    expiresAt,
    documentVersion: doc.version,
  });

  return getForwardAssurance(userId, role, documentId);
}

export async function revokeGovernanceWaiver(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  checkId: string,
): Promise<DocumentAssuranceResult> {
  const doc = await verifyWaiverAuthority(userId, role, documentId);

  if (!checkId || typeof checkId !== 'string') {
    throw new AppError('Validation error: checkId is required', 400, 'VALIDATION_ERROR');
  }

  await createDocumentAudit(doc._id.toString(), userId, 'GOVERNANCE_WAIVER_REVOKED', {
    checkId: checkId.trim(),
  });

  return getForwardAssurance(userId, role, documentId);
}
