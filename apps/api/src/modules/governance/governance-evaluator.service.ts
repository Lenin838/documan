import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentRelationship } from '../documents/document-relationship.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { createNotificationInternal, safeNotify } from '../notifications/notification.service.js';
import { dispatchWebhookEvent, safeDispatchWebhook } from '../webhooks/webhook-delivery.service.js';

export interface GovernanceEvaluationResult {
  projectId: string;
  evaluatedDocumentsCount: number;
  staleTransitionsCount: number;
  transitions: Array<{
    documentId: string;
    title: string;
    reason: string;
    rule: 'MAX_UNREVIEWED_DAYS' | 'UPSTREAM_LIFECYCLE_DRIFT';
  }>;
}

export async function evaluateProjectGovernanceInternal(
  projectId: Types.ObjectId | string,
): Promise<GovernanceEvaluationResult> {
  const projObjId = new Types.ObjectId(projectId.toString());
  const project = await Project.findOne({ _id: projObjId, isArchived: false });

  if (!project || !project.governanceSettings?.isGovernanceEnabled) {
    return {
      projectId: projObjId.toString(),
      evaluatedDocumentsCount: 0,
      staleTransitionsCount: 0,
      transitions: [],
    };
  }

  const maxDays = project.governanceSettings.maxUnreviewedDays || 90;
  const autoUpstream = project.governanceSettings.autoMarkStaleOnUpstreamChange !== false;
  const now = new Date();

  // Find eligible APPROVED documents in project (up to 50 per batch)
  const approvedQuery = Document.find({
    projectId: projObjId,
    status: 'APPROVED',
    isDeleted: false,
  });

  const approvedDocsRaw = typeof (approvedQuery as any).limit === 'function'
    ? await (approvedQuery as any).limit(50)
    : await approvedQuery;

  const approvedDocs = Array.isArray(approvedDocsRaw) ? approvedDocsRaw.slice(0, 50) : [];

  const transitions: GovernanceEvaluationResult['transitions'] = [];

  for (const doc of approvedDocs) {
    const lastReviewed = doc.lastReviewedAt || doc.createdAt;
    const daysElapsed = Math.floor((now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24));

    let isStale = false;
    let rule: 'MAX_UNREVIEWED_DAYS' | 'UPSTREAM_LIFECYCLE_DRIFT' = 'MAX_UNREVIEWED_DAYS';
    let reason = '';

    // 1. Age-Based Drift Check
    if (daysElapsed > maxDays) {
      isStale = true;
      rule = 'MAX_UNREVIEWED_DAYS';
      reason = `Document unreviewed for ${daysElapsed} days (exceeds project limit of ${maxDays} days)`;
    }

    // 2. Upstream Lifecycle Drift Check (STALE or DEPRECATED targets only)
    if (!isStale && autoUpstream) {
      const relationships = await DocumentRelationship.find({
        sourceDocumentId: doc._id,
        type: 'DEPENDS_ON',
      });

      if (relationships.length > 0) {
        const targetDocIds = relationships.map((r) => r.targetDocumentId);
        const staleUpstreamTarget = await Document.findOne({
          _id: { $in: targetDocIds },
          status: { $in: ['STALE', 'DEPRECATED'] },
          isDeleted: false,
        });

        if (staleUpstreamTarget) {
          isStale = true;
          rule = 'UPSTREAM_LIFECYCLE_DRIFT';
          reason = `Upstream dependency "${staleUpstreamTarget.title}" transitioned to ${staleUpstreamTarget.status}`;
        }
      }
    }

    // Perform transition to STALE if drift detected
    if (isStale) {
      doc.status = 'STALE';
      await doc.save();

      transitions.push({
        documentId: doc._id.toString(),
        title: doc.title,
        reason,
        rule,
      });

      // 1. Audit trail (System automated actor)
      await createDocumentAudit(doc._id.toString(), doc.ownerId.toString(), 'STATUS_CHANGE', {
        previousStatus: 'APPROVED',
        newStatus: 'STALE',
        transitionType: 'AUTOMATIC',
        triggerSource: 'AUTOMATED_GOVERNANCE',
        reason,
        rule,
        daysSinceReview: daysElapsed,
      });

      // 2. In-App Notification to Document Owner
      await safeNotify(async () => {
        await createNotificationInternal({
          recipientUserId: doc.ownerId,
          documentId: doc._id,
          type: 'UPSTREAM_STALE',
        });
      });

      // 3. Outbound Webhook Dispatch
      if (doc.projectId) {
        await safeDispatchWebhook(async () => {
          await dispatchWebhookEvent({
            projectId: doc.projectId!,
            eventType: 'UPSTREAM_STALE',
            document: { id: doc._id.toString(), title: doc.title },
            actor: null,
            data: { status: 'STALE', reason, rule },
          });
        });
      }
    }
  }

  return {
    projectId: projObjId.toString(),
    evaluatedDocumentsCount: approvedDocs.length,
    staleTransitionsCount: transitions.length,
    transitions,
  };
}

export async function evaluateAllProjectsGovernanceInternal(): Promise<GovernanceEvaluationResult[]> {
  const activeProjects = await Project.find({
    isArchived: false,
    'governanceSettings.isGovernanceEnabled': true,
  }).select('_id');

  const results: GovernanceEvaluationResult[] = [];
  for (const proj of activeProjects) {
    const res = await evaluateProjectGovernanceInternal(proj._id);
    results.push(res);
  }

  return results;
}
