import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentReview } from '../documents/document-review.model.js';

export interface BlockingDocumentInfo {
  id: string;
  title: string;
  status: string;
  reason: string;
}

export interface ReleaseGateCheckResult {
  passed: boolean;
  status: 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED';
  projectId: string;
  freshnessPercentage: number;
  evaluatedAt: Date;
  summary: {
    totalTracked: number;
    approvedFresh: number;
    staleCount: number;
    pendingReviewCount: number;
    deprecatedCount: number;
  };
  blockingDocuments: BlockingDocumentInfo[];
}

export async function evaluateReleaseGateInternal(
  projectId: string | Types.ObjectId,
): Promise<ReleaseGateCheckResult> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const project = await Project.findOne({ _id: projObjId });

  if (!project || project.isArchived) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const now = new Date();
  const evaluatedAt = now;

  // Disabled Governance Check
  if (project.governanceSettings?.isGovernanceEnabled === false) {
    const totalDocs = await Document.countDocuments({ projectId: projObjId, isDeleted: false });
    return {
      passed: true,
      status: 'GOVERNANCE_DISABLED',
      projectId: projObjId.toString(),
      freshnessPercentage: 100,
      evaluatedAt,
      summary: {
        totalTracked: totalDocs,
        approvedFresh: totalDocs,
        staleCount: 0,
        pendingReviewCount: 0,
        deprecatedCount: 0,
      },
      blockingDocuments: [],
    };
  }

  const gateSettings = {
    allowStale: project.releaseGateSettings?.allowStale ?? false,
    allowPendingReviews: project.releaseGateSettings?.allowPendingReviews ?? false,
    allowDeprecated: project.releaseGateSettings?.allowDeprecated ?? false,
    minFreshnessPercentage: project.releaseGateSettings?.minFreshnessPercentage ?? 80,
  };

  const maxDays = project.governanceSettings?.maxUnreviewedDays ?? 90;

  // Fetch all active non-deleted documents belonging to project
  const projectDocs = await Document.find({ projectId: projObjId, isDeleted: false });

  if (projectDocs.length === 0) {
    return {
      passed: true,
      status: 'PASSED',
      projectId: projObjId.toString(),
      freshnessPercentage: 100,
      evaluatedAt,
      summary: {
        totalTracked: 0,
        approvedFresh: 0,
        staleCount: 0,
        pendingReviewCount: 0,
        deprecatedCount: 0,
      },
      blockingDocuments: [],
    };
  }

  const blockingDocuments: BlockingDocumentInfo[] = [];
  let approvedFreshCount = 0;
  let staleCount = 0;
  let pendingReviewCount = 0;
  let deprecatedCount = 0;

  for (const doc of projectDocs) {
    if (doc.status === 'DRAFT') {
      // DRAFT documents are unreleased drafts and do not block by default
      continue;
    }

    if (doc.status === 'DEPRECATED') {
      deprecatedCount += 1;
      if (!gateSettings.allowDeprecated) {
        blockingDocuments.push({
          id: doc._id.toString(),
          title: doc.title,
          status: 'DEPRECATED',
          reason: 'Document status is DEPRECATED (project policy disallows deprecated documents)',
        });
      }
      continue;
    }

    if (doc.status === 'IN_REVIEW') {
      pendingReviewCount += 1;
      if (!gateSettings.allowPendingReviews) {
        blockingDocuments.push({
          id: doc._id.toString(),
          title: doc.title,
          status: 'IN_REVIEW',
          reason: 'Document has a pending review request in progress',
        });
      }
      continue;
    }

    // Check for active pending reviews on document even if status is not IN_REVIEW
    const hasPendingReview = await DocumentReview.exists({
      documentId: doc._id,
      status: 'PENDING',
    });

    if (hasPendingReview && !gateSettings.allowPendingReviews) {
      pendingReviewCount += 1;
      blockingDocuments.push({
        id: doc._id.toString(),
        title: doc.title,
        status: doc.status,
        reason: 'Document has an active pending reviewer request',
      });
      continue;
    }

    // Age calculation for APPROVED and STALE documents (uses lastReviewedAt || createdAt fallback)
    const lastReviewed = doc.lastReviewedAt || doc.createdAt;
    const daysElapsed = Math.floor((now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24));

    let isDocumentStale = doc.status === 'STALE';
    if (doc.status === 'APPROVED' && daysElapsed > maxDays) {
      isDocumentStale = true;
    }

    if (isDocumentStale) {
      staleCount += 1;
      if (!gateSettings.allowStale) {
        blockingDocuments.push({
          id: doc._id.toString(),
          title: doc.title,
          status: 'STALE',
          reason: `Document unreviewed for ${daysElapsed} days (exceeds threshold of ${maxDays} days)`,
        });
      }
    } else if (doc.status === 'APPROVED') {
      approvedFreshCount += 1;
    }
  }

  const eligibleCount = approvedFreshCount + staleCount;
  const freshnessPercentage = eligibleCount > 0 ? Math.round((approvedFreshCount / eligibleCount) * 100) : 100;

  let passed = blockingDocuments.length === 0;

  if (passed && freshnessPercentage < gateSettings.minFreshnessPercentage) {
    passed = false;
    blockingDocuments.push({
      id: projObjId.toString(),
      title: project.name,
      status: 'LOW_FRESHNESS',
      reason: `Project freshness (${freshnessPercentage}%) is below minimum policy threshold of ${gateSettings.minFreshnessPercentage}%`,
    });
  }

  return {
    passed,
    status: passed ? 'PASSED' : 'BLOCKED',
    projectId: projObjId.toString(),
    freshnessPercentage,
    evaluatedAt,
    summary: {
      totalTracked: projectDocs.length,
      approvedFresh: approvedFreshCount,
      staleCount,
      pendingReviewCount,
      deprecatedCount,
    },
    blockingDocuments,
  };
}
